"""이진분류 계약/데이터 누수/실제 WAV 추론 회귀 검사. 탐지 성능 평가는 아님."""

import ast
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

import joblib
import numpy as np
import soundfile as sf
from sklearn.ensemble import RandomForestClassifier

from ai_model.src.binary_classification import (
    make_prediction_result, ordered_ml_probabilities, predict_classes,
)
from ai_model.src.config import CLASSES, MODEL_DIR, SR
from ai_model.src.dataset import collect_audio_files, split_by_source
from ai_model.src.model_loader import load_models, validate_model

ROOT = Path(__file__).resolve().parents[1]


class BinaryContractTest(unittest.TestCase):
    def test_labels_and_threshold_boundary(self):
        self.assertEqual(CLASSES, ['non_wasp', 'wasp'])
        self.assertEqual(make_prediction_result([0.8, 0.2])['prediction'], 'non_wasp')
        self.assertEqual(make_prediction_result([0.1, 0.9])['prediction'], 'wasp')
        self.assertEqual(make_prediction_result([0.5, 0.5])['prediction'], 'wasp')
        result = make_prediction_result([0.4, 0.6], threshold=0.7)
        self.assertEqual(result['prediction'], 'non_wasp')
        self.assertAlmostEqual(result['confidence'], 0.4)

    def test_reject_invalid_or_old_probabilities(self):
        for probs in ([0.3, 0.3, 0.4], [0.8], [np.nan, 0.3], [-0.1, 1.1], [0.2, 0.2]):
            with self.subTest(probs=probs), self.assertRaises(ValueError):
                make_prediction_result(probs)
        for threshold in (0, 1, -1, np.nan):
            with self.subTest(threshold=threshold), self.assertRaises(ValueError):
                predict_classes([0.5, 0.5], threshold)

    def test_reordered_ml_columns_and_old_models(self):
        model = SimpleNamespace(classes_=np.array([1, 0]), predict_proba=lambda x: np.array([[0.8, 0.2]]))
        np.testing.assert_allclose(ordered_ml_probabilities(model, [[1]]), [[0.2, 0.8]])
        with self.assertRaises(ValueError):
            validate_model(SimpleNamespace(classes_=np.array([0, 1, 2])), 'RandomForest')
        with self.assertRaises(ValueError):
            validate_model(SimpleNamespace(output_shape=(None, 3)), 'CNN')

    def test_missing_model_guides_retraining(self):
        self.assertEqual(MODEL_DIR, ROOT / 'models')
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            with self.assertRaisesRegex(FileNotFoundError, 'sound_analysis.ipynb'):
                load_models(['RandomForest'], directory)


class DatasetTest(unittest.TestCase):
    def test_group_split_prevents_source_leakage(self):
        # 같은 영상에서 두 라벨이 나오는 경우도 모두 한 split에 배정되어야 한다.
        labels = np.tile([0, 1, 0, 1], 12)
        groups = np.repeat([f'video_{i}' for i in range(12)], 4)
        parts = split_by_source(labels, groups)
        self.assertEqual(sorted(np.concatenate(parts).tolist()), list(range(len(labels))))
        for i, part in enumerate(parts):
            self.assertEqual(set(labels[part]), {0, 1})
            for other in parts[i + 1:]:
                self.assertFalse(set(groups[part]) & set(groups[other]))
        for first, second in zip(parts, split_by_source(labels, groups)):
            np.testing.assert_array_equal(first, second)

    def test_insufficient_sources_rejected(self):
        with self.assertRaises(ValueError):
            split_by_source([0, 1, 0, 1], ['a', 'a', 'b', 'b'])

    def test_three_independent_sources_per_class(self):
        labels = np.array([0, 0, 0, 1, 1, 1])
        for part in split_by_source(labels, ['a', 'b', 'c', 'd', 'e', 'f']):
            self.assertEqual(set(labels[part]), {0, 1})

    def test_collect_binary_and_mixed_audio(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            root = Path(directory)
            for label in CLASSES:
                folder = root / label / 'same_video'
                folder.mkdir(parents=True)
                sf.write(folder / 'mixed.WAV', np.zeros(SR), SR)
            records = collect_audio_files(root)
            self.assertEqual([r['label'] for r in records], [0, 1])
            self.assertEqual({r['source_id'] for r in records}, {'same_video'})
            sf.write(root / 'wasp' / 'ungrouped.wav', np.zeros(SR), SR)
            with self.assertRaisesRegex(ValueError, 'source_id'):
                collect_audio_files(root)

    def test_long_training_file_is_not_silently_cropped(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            root = Path(directory)
            for label in CLASSES:
                folder = root / label / 'video'
                folder.mkdir(parents=True)
                sf.write(folder / 'long.wav', np.zeros(SR * 3), SR)
            with self.assertRaises(ValueError):
                collect_audio_files(root)


class AudioIntegrationTest(unittest.TestCase):
    def test_offset_padding_and_duration(self):
        from ai_model.src.audio_preprocessing import load_audio_file
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            path = Path(directory) / 'segments.wav'
            t = np.arange(SR) / SR
            sf.write(path, np.concatenate([0.1 * np.sin(2 * np.pi * f * t) for f in (200, 800, 1200)]), SR)
            y, sr = load_audio_file(path, duration=1.0, offset=1.0)
            self.assertEqual(len(y), SR)
            dominant = np.fft.rfftfreq(len(y), 1 / sr)[np.argmax(abs(np.fft.rfft(y)))]
            self.assertAlmostEqual(dominant, 800, delta=1)
            padded, _ = load_audio_file(path, offset=2.5)
            self.assertEqual(len(padded), 2 * SR)
            self.assertTrue(np.all(padded[SR // 2:] == 0))
            with self.assertRaises(ValueError):
                load_audio_file(path, offset=4)

    def test_real_wav_ml_train_save_load_and_analyze(self):
        from ai_model.src.audio_preprocessing import load_audio_file
        from ai_model.src.feature_extraction import extract_audio_features_from_audio
        from ai_model.src.inference import analyze_audio
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            root = Path(directory)
            rows, labels = [], [0, 0, 1, 1]
            for i, f in enumerate((200, 220, 1600, 1800)):
                t = np.arange(2 * SR) / SR
                path = root / f'neutral_{i}.wav'
                sf.write(path, 0.1 * np.sin(2 * np.pi * f * t), SR)
                y, sr = load_audio_file(path)
                rows.append(extract_audio_features_from_audio(y, sr))
            model = RandomForestClassifier(n_estimators=8, random_state=42).fit(rows, labels)
            joblib.dump(model, root / 'randomforest.pkl')
            models = load_models(['RandomForest'], root)
            self.assertEqual(list(models), ['RandomForest'])
            result = analyze_audio(root / 'neutral_3.wav', models, 'single', 'RandomForest')
            self.assertEqual(set(result['prediction']['probabilities']), set(CLASSES))
            self.assertEqual(result['prediction']['label'], 'wasp')
            self.assertAlmostEqual(sum(result['prediction']['probabilities'].values()), 1)
            self.assertEqual(result['meta']['waspThreshold'], 0.5)
            self.assertEqual(len(result['waveform']['time']), len(result['waveform']['amplitude']))
            json.dumps(result, allow_nan=False)


class NotebookTest(unittest.TestCase):
    def test_six_notebook_models_accept_binary_training(self):
        import tensorflow as tf
        from lightgbm import LGBMClassifier
        from xgboost import XGBClassifier
        from ai_model.src.config import IMG_HEIGHT, IMG_WIDTH
        notebook = json.loads((ROOT / 'sound_analysis.ipynb').read_text(encoding='utf-8'))
        sources = [''.join(c['source']) for c in notebook['cells'] if c['cell_type'] == 'code']
        rng = np.random.default_rng(42)
        # 실제 CNN/CRNN/MobileNet 구조 검사. 네트워크 다운로드 없이 구조만 검증한다.
        def offline_mobilenet(**kwargs):
            return tf.keras.applications.MobileNetV2(**{**kwargs, 'weights': None})
        namespace = dict(np=np, tf=tf, layers=tf.keras.layers, models=tf.keras.models,
                         CLASSES=CLASSES, IMG_HEIGHT=IMG_HEIGHT, IMG_WIDTH=IMG_WIDTH,
                         MobileNetV2=offline_mobilenet,
                         X_train_crnn=np.zeros((2, 128, 188, 1), dtype=np.float32))
        for name, marker, shape in (
            ('CNN', 'cnn_model = models.Sequential', (2, 128, 128, 1)),
            ('MobileNetV2', 'mobilenet_base = MobileNetV2', (2, 128, 128, 3)),
            ('CRNN', 'crnn_input_shape = X_train_crnn', (2, 128, 188, 1)),
        ):
            with self.subTest(model=name), contextlib.redirect_stdout(io.StringIO()):
                exec(next(s for s in sources if marker in s), namespace)
                variable = {'CNN': 'cnn_model', 'MobileNetV2': 'mobilenet_model', 'CRNN': 'crnn_model'}[name]
                model = namespace[variable]
                self.assertEqual(model.output_shape[-1], 2)
                model.compile(optimizer='adam', loss='sparse_categorical_crossentropy')
                x = rng.random(shape, dtype=np.float32)
                loss = model.train_on_batch(x, np.array([0, 1]))
                self.assertTrue(np.isfinite(loss))
                probs = model(x, training=False).numpy()
                self.assertEqual(predict_classes(probs).shape, (2,))
                validate_model(model, name)
                tf.keras.backend.clear_session()
        x = rng.random((20, 4))
        namespace.update(RandomForestClassifier=RandomForestClassifier, LGBMClassifier=LGBMClassifier,
                         XGBClassifier=XGBClassifier, SEED=42, X_train_ml=x,
                         y_train_ml=np.tile([0, 1], 10), ml_sample_weights=np.ones(20))
        for name, variable in (('RandomForest', 'rf_model'), ('LightGBM', 'lgbm_model'), ('XGBoost', 'xgb_model')):
            with self.subTest(model=name), contextlib.redirect_stdout(io.StringIO()):
                source = next(s for s in sources if f'{variable} = ' in s)
                exec(source.replace('n_estimators = 200', 'n_estimators = 2'), namespace)
                probs = ordered_ml_probabilities(namespace[variable], x)
                self.assertEqual(probs.shape, (20, 2))
                validate_model(namespace[variable], name)

    def test_clean_outputs_and_python_syntax(self):
        notebook = json.loads((ROOT / 'sound_analysis.ipynb').read_text(encoding='utf-8'))
        for i, cell in enumerate(notebook['cells']):
            if cell['cell_type'] == 'code':
                self.assertEqual(cell['outputs'], [])
                self.assertIsNone(cell['execution_count'])
                source = ''.join(line for line in cell['source'] if not line.lstrip().startswith(('%', '!')))
                ast.parse(source, filename=f'cell_{i}')

    def test_wasp_recall_uses_positive_class_one(self):
        from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                                     f1_score, confusion_matrix)
        notebook = json.loads((ROOT / 'sound_analysis.ipynb').read_text(encoding='utf-8'))
        source = next(''.join(c['source']) for c in notebook['cells'] if 'def evaluate_model(' in ''.join(c['source']))
        namespace = dict(accuracy_score=accuracy_score, precision_score=precision_score,
                         recall_score=recall_score, f1_score=f1_score,
                         confusion_matrix=confusion_matrix, WASP_INDEX=1)
        exec(source, namespace)
        result = namespace['evaluate_model']([0, 0, 1, 1], [0, 0, 0, 1], 'test', False)
        self.assertEqual(result['Wasp Recall'], 0.5)
        self.assertEqual(result['False Negative'], 1)
        self.assertEqual(result['False Positive'], 0)


if __name__ == '__main__':
    unittest.main()

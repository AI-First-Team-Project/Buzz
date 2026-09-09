'''
.keras / .pkl 파일 로딩
'''

from pathlib import Path
import joblib
import numpy as np

from .config import CLASSES, MODEL_DIR

CNN_MODEL_PATH = MODEL_DIR / 'cnn.keras'
MOBILENET_MODEL_PATH = MODEL_DIR / 'mobilenetv2.keras'
CRNN_MODEL_PATH = MODEL_DIR / 'crnn.keras'

RF_MODEL_PATH = MODEL_DIR / 'randomforest.pkl'
LGBM_MODEL_PATH = MODEL_DIR / 'lightgbm.pkl'
XGB_MODEL_PATH = MODEL_DIR / 'xgboost.pkl'

'''
저장된 딥러닝 / 머신러닝 모델을 로드
'''
MODEL_FILES = {
    'CNN': 'cnn.keras', 'MobileNetV2': 'mobilenetv2.keras', 'CRNN': 'crnn.keras',
    'RandomForest': 'randomforest.pkl', 'LightGBM': 'lightgbm.pkl', 'XGBoost': 'xgboost.pkl',
}


def validate_model(model, name):
    if MODEL_FILES[name].endswith('.keras'):
        if model.output_shape[-1] != len(CLASSES):
            raise ValueError(f'{name}: 2개 출력이 필요합니다. 기존 3분류 모델을 재학습하세요.')
    else:
        classes = np.asarray(model.classes_)
        if classes.shape != (2,) or set(classes.tolist()) != {0, 1}:
            raise ValueError(f'{name}: non_wasp=0, wasp=1로 재학습해야 합니다.')
    return model


def load_models(model_names=None, model_dir=MODEL_DIR):
    """지정 모델만 로드. 생략하면 앙상블용 6개 모델을 로드한다."""
    names = list(MODEL_FILES) if model_names is None else list(model_names)
    if not names or any(name not in MODEL_FILES for name in names):
        raise ValueError(f'지원하는 모델을 지정하세요: {list(MODEL_FILES)}')
    paths = {name: Path(model_dir) / MODEL_FILES[name] for name in names}
    missing = [str(path) for path in paths.values() if not path.is_file()]
    if missing:
        raise FileNotFoundError('이진분류 모델이 없습니다. sound_analysis.ipynb에서 재학습하세요:\n' + '\n'.join(missing))
    loaded = {}
    for name, path in paths.items():
        if path.suffix == '.keras':
            import tensorflow as tf
            model = tf.keras.models.load_model(path, compile=False)
        else:
            model = joblib.load(path)
        loaded[name] = validate_model(model, name)
    return loaded

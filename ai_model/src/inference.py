'''
CNN / MobileNet / CRNN / ML 추론
Ensemble
analyze_audio()
'''

import time
import numpy as np

from .config import CLASSES, SR, DURATION, WASP_THRESHOLD
from .binary_classification import make_prediction_result, ordered_ml_probabilities

from .audio_preprocessing import (
    load_audio_file,
    create_mel_spectrogram_from_audio,
    prepare_cnn_dataset,
    prepare_mobilenet_dataset,
    prepare_crnn_dataset
)

from .feature_extraction import extract_audio_features_from_audio

from .visualization import create_audio_visualization_data

'''
딥러닝 모델별 입력 생성 및 공통 이진분류 판정
'''
def predict_with_cnn(y, sr, model):
    mel = create_mel_spectrogram_from_audio(y, sr)
    model_input = prepare_cnn_dataset(np.array([mel], dtype = np.float32))
    probs = model.predict(model_input, verbose = 0)[0]

    return make_prediction_result(probs)

def predict_with_mobilenet(y, sr, model):
    mel = create_mel_spectrogram_from_audio(y, sr)
    model_input = prepare_mobilenet_dataset(np.array([mel], dtype = np.float32))
    probs = model.predict(model_input, verbose = 0)[0]

    return make_prediction_result(probs)

def predict_with_crnn(y, sr, model):
    mel = create_mel_spectrogram_from_audio(y, sr)
    model_input = prepare_crnn_dataset(np.array([mel], dtype = np.float32))
    probs = model.predict(model_input, verbose = 0)[0]

    return make_prediction_result(probs)

def predict_with_ml_model(y, sr, model):
    features = (extract_audio_features_from_audio(y, sr).reshape(1, -1))
    probs = ordered_ml_probabilities(model, features)[0]

    return make_prediction_result(probs)

'''
지정한 단일 모델로 추론
'''
def predict_with_single_model(y, sr, models, model_name):
    if model_name == 'CNN':
        return predict_with_cnn(y, sr, models['CNN'])
    elif model_name == 'MobileNetV2':
        return predict_with_mobilenet(y, sr, models['MobileNetV2'])
    elif model_name == 'CRNN':
        return predict_with_crnn(y, sr, models['CRNN'])
    elif model_name == 'RandomForest':
        return predict_with_ml_model(y, sr, models['RandomForest'])
    elif model_name == 'LightGBM':
        return predict_with_ml_model(y, sr, models['LightGBM'])
    elif model_name == 'XGBoost':
        return predict_with_ml_model(y, sr, models['XGBoost'])
    else:
        raise ValueError(f'지원하지 않는 모델입니다: {model_name}')

'''
6개 모델 Soft Voting Ensemble
'''
def predict_with_ensemble(y, sr, models):
    results = [
        predict_with_cnn(y, sr, models['CNN']),
        predict_with_mobilenet(y, sr, models['MobileNetV2']),
        predict_with_crnn(y, sr, models['CRNN']),
        predict_with_ml_model(y, sr, models['RandomForest']),
        predict_with_ml_model(y, sr, models['LightGBM']),
        predict_with_ml_model(y, sr, models['XGBoost'])
    ]

    ensemble_probs = np.mean([
        result['probabilities']
        for result in results
    ], axis = 0)

    return make_prediction_result(ensemble_probs)

'''
신규 오디오 파일 최종 분석

inference_type:
- 'single'
- 'ensemble'

model_name:
- single 일 때 사용할 모델 이름
'''
def analyze_audio(audio_path, models, inference_type, model_name = None,
                  threshold = WASP_THRESHOLD, offset = 0.0):
    total_start = time.perf_counter()

    start = time.perf_counter()

    # 오디오 1회 로드
    y, sr = load_audio_file(audio_path, sr = SR, duration = DURATION, offset = offset)

    audio_time = time.perf_counter() - start

    # =========================
    # Prediction
    # =========================

    start = time.perf_counter()

    if inference_type == 'ensemble':
        prediction_result = predict_with_ensemble(y, sr, models)

        used_model = 'Ensemble'

    elif inference_type == 'single':
        if model_name is None:
            raise ValueError('single 추론에서는 model_name이 필요합니다.')

        prediction_result = predict_with_single_model(y, sr, models, model_name)

        used_model = model_name

    else:
        raise ValueError(f'지원하지 않는 추론 방식입니다: {inference_type}')

    prediction_result = make_prediction_result(prediction_result['probabilities'], threshold)
    inference_time = time.perf_counter() - start

    # =========================
    # UI Visualization (로컬 실험용; 서버는 공통 전처리 후 그래프를 생성한다.)
    # =========================

    start = time.perf_counter()

    visualization_data = create_audio_visualization_data(y, sr)

    visualization_time = time.perf_counter() - start

    # =========================
    # JSON 반환 형태
    # =========================

    probabilities = {
        CLASSES[i]: float(prediction_result['probabilities'][i])
        for i in range(len(CLASSES))
    }

    total_time = time.perf_counter() - total_start

    return {
        # 모델 전용 이진분류 응답. 서버/앱의 기존 3분류 스키마는 다음 단계에서 변경한다.
        'prediction': {
            'label': prediction_result['prediction'],
            'confidence': prediction_result['confidence'],
            'probabilities': probabilities,
        },
        'meta': {'modelName': used_model, 'waspThreshold': threshold,
                 'offset': offset, 'duration': DURATION},
        'timing': {
            'audio': audio_time,
            'inference': inference_time,
            'visualization': visualization_time,
            'total': total_time
        },
        **visualization_data
    }

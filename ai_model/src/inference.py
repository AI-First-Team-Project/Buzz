'''
CNN / MobileNet / CRNN / ML 추론
Ensemble
analyze_audio()
'''

import numpy as np

from .config import CLASSES, SR, DURATION

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
모델 확률값을 공통 결과 형식으로 변환
'''
def make_prediction_result(probs):
    probs = np.asarray(probs, dtype = np.float32)
    pred_index = int(np.argmax(probs))

    return {
        'prediction': CLASSES[pred_index],
        'confidence': float(probs[pred_index]),
        'probabilities': probs
    }

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
    probs = model.predict(model_input, verbose = 0)

    return make_prediction_result(probs)

def predict_with_ml_model(y, sr, model):
    features = (extract_audio_features_from_audio(y, sr).reshape(1, -1))
    raw_probs = model.predict_proba(features)[0]

    # 클래스 순서 안정적으로 맞추기
    probs = np.zeros(len(CLASSES), dtype = np.float32)

    for class_index, probability in zip(model.classes_, raw_probs):
        probs[int(class_index)] = float(probability)

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
def analyze_audio(audio_path, models, inference_type, model_name = None):
    # 오디오 1회 로드
    y, sr = load_audio_file(audio_path, sr = SR, duration = DURATION)

    # =========================
    # Prediction
    # =========================

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

    # =========================
    # UI Visualization
    # =========================

    visualization_data = create_audio_visualization_data(y, sr)

    # =========================
    # JSON 반환 형태
    # =========================

    probabilities = {
        CLASSES[i]: float(prediction_result['probabilities][i]'])
        for i in range(len(CLASSES))
    }

    return {
        'model': used_model,
        'prediction': prediction_result['prediction'],
        'confidence': prediction_result['confidence'],
        'probabilities': probabilities,
        **visualization_data
    }
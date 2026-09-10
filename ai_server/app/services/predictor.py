"""ai_model의 학습 모델을 FastAPI 응답 계약으로 변환하는 추론 어댑터."""
import sys
from pathlib import Path
from threading import Lock

import numpy as np

from ..config import AI_MODEL_DIR, AI_MODEL_NAME, AI_MODEL_THRESHOLD, PROJECT_ROOT

# ai_server/run.py를 ai_server 폴더에서 실행해도 형제 ai_model 패키지를 찾게 한다.
project_root = str(PROJECT_ROOT)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from ai_model.src.audio_preprocessing import (
    create_mel_spectrogram_from_audio,
    load_audio_file,
    prepare_cnn_dataset,
    prepare_crnn_dataset,
    prepare_mobilenet_dataset,
)
from ai_model.src.binary_classification import make_prediction_result, ordered_ml_probabilities
from ai_model.src.feature_extraction import extract_audio_features_from_audio
from ai_model.src.inference import predict_with_single_model
from ai_model.src.model_loader import load_models

# 요청마다 모델을 다시 읽지 않도록 서버 프로세스 시작 시 한 번만 로드한다.
_MODELS = load_models([AI_MODEL_NAME], AI_MODEL_DIR)
_INFERENCE_LOCK = Lock()


def predict_audio(audio_path: Path) -> dict:
    """업로드 음원을 실제 모델로 분석하고 JSON 직렬화 가능한 예측값을 반환한다."""
    if hasattr(audio_path, "seek"):
        audio_path.seek(0)
    y, sr = load_audio_file(audio_path)
    # 사용자 테스트와 자동 분석이 겹쳐도 하나의 모델 인스턴스를 동시에 호출하지 않는다.
    with _INFERENCE_LOCK:
        result = predict_with_single_model(y, sr, _MODELS, AI_MODEL_NAME)
        result = make_prediction_result(result["probabilities"], AI_MODEL_THRESHOLD)
    probabilities = {
        "non_wasp": float(result["probabilities"][0]),
        "wasp": float(result["probabilities"][1]),
    }
    return {
        "prediction": {
            "label": result["prediction"],
            "confidence": result["confidence"],
            "probabilities": probabilities,
        },
        "meta": {"modelName": AI_MODEL_NAME},
    }


def predict_audio_batch(audio_paths: list[Path]) -> list[dict]:
    """Run multiple two-second inputs in one model call and preserve input order."""
    if not audio_paths:
        return []

    loaded = []
    for audio_path in audio_paths:
        if hasattr(audio_path, "seek"):
            audio_path.seek(0)
        loaded.append(load_audio_file(audio_path))

    signals = [item[0] for item in loaded]
    sample_rates = [item[1] for item in loaded]
    if len(set(sample_rates)) != 1:
        raise ValueError("배치 음원의 샘플레이트가 일치하지 않습니다.")
    sample_rate = sample_rates[0]

    with _INFERENCE_LOCK:
        if AI_MODEL_NAME in {"CNN", "MobileNetV2", "CRNN"}:
            mel_batch = np.asarray(
                [create_mel_spectrogram_from_audio(signal, sample_rate) for signal in signals],
                dtype=np.float32,
            )
            if AI_MODEL_NAME == "CNN":
                model_input = prepare_cnn_dataset(mel_batch)
            elif AI_MODEL_NAME == "MobileNetV2":
                model_input = prepare_mobilenet_dataset(mel_batch)
            else:
                model_input = prepare_crnn_dataset(mel_batch)
            probabilities_batch = _MODELS[AI_MODEL_NAME].predict(model_input, verbose=0)
        else:
            features = np.asarray(
                [extract_audio_features_from_audio(signal, sample_rate) for signal in signals],
                dtype=np.float32,
            )
            probabilities_batch = ordered_ml_probabilities(_MODELS[AI_MODEL_NAME], features)

    responses = []
    for probabilities in probabilities_batch:
        result = make_prediction_result(probabilities, AI_MODEL_THRESHOLD)
        responses.append(
            {
                "prediction": {
                    "label": result["prediction"],
                    "confidence": result["confidence"],
                    "probabilities": {
                        "non_wasp": float(result["probabilities"][0]),
                        "wasp": float(result["probabilities"][1]),
                    },
                },
                "meta": {"modelName": AI_MODEL_NAME},
            }
        )
    return responses

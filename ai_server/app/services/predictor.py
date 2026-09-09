"""ai_model의 학습 모델을 FastAPI 응답 계약으로 변환하는 추론 어댑터."""
import sys
from pathlib import Path

from ..config import AI_MODEL_DIR, AI_MODEL_NAME, AI_MODEL_THRESHOLD, PROJECT_ROOT

# ai_server/run.py를 ai_server 폴더에서 실행해도 형제 ai_model 패키지를 찾게 한다.
project_root = str(PROJECT_ROOT)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from ai_model.src.audio_preprocessing import load_audio_file
from ai_model.src.binary_classification import make_prediction_result
from ai_model.src.inference import predict_with_single_model
from ai_model.src.model_loader import load_models

# 요청마다 모델을 다시 읽지 않도록 서버 프로세스 시작 시 한 번만 로드한다.
_MODELS = load_models([AI_MODEL_NAME], AI_MODEL_DIR)


def predict_audio(audio_path: Path) -> dict:
    """업로드 음원을 실제 모델로 분석하고 JSON 직렬화 가능한 예측값을 반환한다."""
    if hasattr(audio_path, "seek"):
        audio_path.seek(0)
    y, sr = load_audio_file(audio_path)
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

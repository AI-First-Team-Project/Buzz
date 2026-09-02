"""AI 추론 어댑터.

현재 팀의 최종 운영 모델이 확정되기 전까지 MOCK 모드로 동작한다.
최종 모델 선정 후에는 predict_audio() 내부만 교체하면 API 계약은 그대로 유지된다.
"""
from pathlib import Path

from ..schemas import Probabilities

MODEL_NAME = "mock-placeholder"


def predict_audio(audio_path: Path) -> tuple[str, float, Probabilities, str]:
    """Return (class_name, confidence, probabilities, model_name).

    주의: 지금은 UI/API 통합 테스트용 Mock 예측이다.
    파일명에 wasp/hornet/vespa/말벌, bee/honeybee/꿀벌, other가 있으면
    그 클래스가 나오도록 해 팀 데모 개발을 쉽게 했다.
    """
    name = audio_path.name.lower()

    if any(key in name for key in ("wasp", "hornet", "vespa", "말벌")):
        probs = Probabilities(wasp=0.968, bee=0.021, other=0.011)
        return "wasp", probs.wasp, probs, MODEL_NAME

    if any(key in name for key in ("bee", "honeybee", "꿀벌")):
        probs = Probabilities(wasp=0.032, bee=0.934, other=0.034)
        return "bee", probs.bee, probs, MODEL_NAME

    probs = Probabilities(wasp=0.08, bee=0.12, other=0.80)
    return "other", probs.other, probs, MODEL_NAME

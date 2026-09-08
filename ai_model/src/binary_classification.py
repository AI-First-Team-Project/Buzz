"""학습 평가와 추론이 공유하는 이진분류 확률/판정 규칙."""

import numpy as np

from .config import CLASSES, WASP_INDEX, WASP_THRESHOLD


def validate_probabilities(probabilities):
    probs = np.asarray(probabilities, dtype=np.float64)
    if probs.ndim not in (1, 2) or probs.shape[-1] != len(CLASSES):
        raise ValueError('이진분류 확률은 [non_wasp, wasp] 2개여야 합니다. 기존 3분류 모델은 재학습하세요.')
    if not np.all(np.isfinite(probs)) or np.any((probs < 0) | (probs > 1)):
        raise ValueError('확률은 유한한 0~1 값이어야 합니다.')
    if not np.allclose(probs.sum(axis=-1), 1.0, atol=1e-5):
        raise ValueError('non_wasp와 wasp 확률의 합은 1이어야 합니다.')
    return probs


def predict_classes(probabilities, threshold=WASP_THRESHOLD):
    if not np.isfinite(threshold) or not 0 < threshold < 1:
        raise ValueError('말벌 판정 임계값은 0과 1 사이여야 합니다.')
    probs = validate_probabilities(probabilities)
    return (probs[..., WASP_INDEX] >= threshold).astype(np.int32)


def make_prediction_result(probabilities, threshold=WASP_THRESHOLD):
    probs = validate_probabilities(probabilities)
    if probs.ndim != 1:
        raise ValueError('단일 구간의 확률 벡터가 필요합니다.')
    index = int(predict_classes(probs, threshold))
    return {
        'prediction': CLASSES[index],
        'confidence': float(probs[index]),
        'probabilities': probs,
    }


def ordered_ml_probabilities(model, features):
    """sklearn 계열의 classes_ 순서를 공통 인덱스에 맞춘다."""
    classes = np.asarray(model.classes_)
    if classes.shape != (2,) or set(classes.tolist()) != {0, 1}:
        raise ValueError('ML 모델은 non_wasp=0, wasp=1로 재학습해야 합니다.')
    raw = np.asarray(model.predict_proba(features))
    if raw.ndim != 2 or raw.shape[1] != 2:
        raise ValueError('ML 모델의 predict_proba 출력은 (N, 2)여야 합니다.')
    probs = raw[:, [int(np.flatnonzero(classes == i)[0]) for i in range(2)]]
    return validate_probabilities(probs)

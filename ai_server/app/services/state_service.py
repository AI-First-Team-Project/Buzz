"""사업장별 연속 판정 횟수와 상태 전환을 계산하는 순수 도메인 로직."""
from dataclasses import dataclass
from typing import Literal

from ..config import (
    DANGER_CONSECUTIVE_DETECTIONS,
    NORMAL_CONSECUTIVE_NON_DETECTIONS,
)

SystemState = Literal["NORMAL", "DANGER"]
ClassName = Literal["non_wasp", "wasp"]
TransitionName = Literal["danger", "recovery"]


@dataclass(frozen=True)
class StateDecision:
    status: SystemState
    consecutive_wasp: int
    consecutive_non_wasp: int
    transition: TransitionName | None = None


def advance_detection_state(
    current_status: SystemState,
    prediction: ClassName,
    consecutive_wasp: int,
    consecutive_non_wasp: int,
) -> StateDecision:
    """한 번의 원시 판정을 반영해 다음 상태와 연속 횟수를 반환한다."""
    if DANGER_CONSECUTIVE_DETECTIONS < 1 or NORMAL_CONSECUTIVE_NON_DETECTIONS < 1:
        raise ValueError("연속 감지·해제 횟수는 1 이상이어야 합니다.")

    if prediction == "wasp":
        wasp_count = min(consecutive_wasp + 1, DANGER_CONSECUTIVE_DETECTIONS)
        if current_status == "NORMAL" and wasp_count >= DANGER_CONSECUTIVE_DETECTIONS:
            return StateDecision("DANGER", wasp_count, 0, "danger")
        return StateDecision(current_status, wasp_count, 0)

    if prediction == "non_wasp":
        non_wasp_count = min(
            consecutive_non_wasp + 1,
            NORMAL_CONSECUTIVE_NON_DETECTIONS,
        )
        if current_status == "DANGER" and non_wasp_count >= NORMAL_CONSECUTIVE_NON_DETECTIONS:
            return StateDecision("NORMAL", 0, non_wasp_count, "recovery")
        return StateDecision(current_status, 0, non_wasp_count)

    raise ValueError(f"지원하지 않는 판정입니다: {prediction}")

from fastapi import APIRouter

from ..config import (
    AI_MODEL_NAME,
    AI_MODEL_THRESHOLD,
    DANGER_CONSECUTIVE_DETECTIONS,
    MANUAL_DANGER_CLEAR_ENABLED,
    NORMAL_CONSECUTIVE_NON_DETECTIONS,
)

router = APIRouter(tags=["system"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": "buzz-ai-server",
        "message": "FastAPI server is running",
        "model": AI_MODEL_NAME,
        "waspThreshold": AI_MODEL_THRESHOLD,
        "dangerConsecutiveDetections": DANGER_CONSECUTIVE_DETECTIONS,
        "normalConsecutiveNonDetections": NORMAL_CONSECUTIVE_NON_DETECTIONS,
        "manualDangerClearEnabled": MANUAL_DANGER_CLEAR_ENABLED,
    }

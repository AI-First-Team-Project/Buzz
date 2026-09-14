from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..database import db_enabled, save_app_settings, safe_update_gate_status
from ..detection_settings import get_settings, set_settings
from ..store import close_dangerous_doors, reset_detection_streaks

router = APIRouter(prefix="/api/settings", tags=["settings"])


class DetectionSettings(BaseModel):
    wasp_threshold_percent: int = Field(ge=60, le=99)
    wasp_alert: bool
    vibration: bool
    auto_close: bool


class DetectionSettingsUpdate(BaseModel):
    wasp_threshold_percent: int | None = Field(default=None, ge=60, le=99)
    wasp_alert: bool | None = None
    vibration: bool | None = None
    auto_close: bool | None = None


@router.get("", response_model=DetectionSettings)
def read_settings():
    return DetectionSettings.model_validate(get_settings())


@router.put("", response_model=DetectionSettings)
def update_settings(payload: DetectionSettingsUpdate):
    previous = get_settings()
    changes = payload.model_dump(exclude_none=True)
    updated = DetectionSettings.model_validate({**previous, **changes})
    if previous == updated.model_dump():
        return updated
    if db_enabled():
        try:
            save_app_settings(updated.model_dump())
        except Exception as exc:
            raise HTTPException(503, "설정 저장에 실패했습니다.") from exc
    set_settings(updated.model_dump())
    if previous["wasp_threshold_percent"] != updated.wasp_threshold_percent:
        reset_detection_streaks()
    if not previous["auto_close"] and updated.auto_close:
        for site_id in close_dangerous_doors():
            safe_update_gate_status(site_id, "closed")
    return updated

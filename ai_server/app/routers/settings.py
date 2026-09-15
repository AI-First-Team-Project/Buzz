from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..database import db_enabled, save_app_settings
from ..detection_settings import get_settings, set_settings
from ..store import reset_detection_streaks

router = APIRouter(prefix="/api/settings", tags=["settings"])


class DetectionSettings(BaseModel):
    wasp_threshold_percent: int = Field(ge=60, le=99)
    wasp_alert: bool
    vibration: bool
    auto_close: bool = True


class DetectionSettingsUpdate(BaseModel):
    wasp_threshold_percent: int | None = Field(default=None, ge=60, le=99)
    wasp_alert: bool | None = None
    vibration: bool | None = None
    auto_close: bool | None = None


@router.get("", response_model=DetectionSettings)
def read_settings():
    return get_settings()


@router.put("", response_model=DetectionSettings)
def update_settings(payload: DetectionSettingsUpdate):
    changes = payload.model_dump(exclude_none=True)
    if changes.get("auto_close") is False:
        raise HTTPException(422, "안전 정책상 자동 폐쇄는 끌 수 없습니다.")
    previous = get_settings()
    updated = DetectionSettings.model_validate({**previous, **changes, "auto_close": True}).model_dump()
    if updated == previous:
        return updated
    if db_enabled():
        try:
            save_app_settings(updated)
        except Exception as exc:
            raise HTTPException(503, "설정 저장에 실패했습니다.") from exc
    set_settings(updated)
    if previous["wasp_threshold_percent"] != updated["wasp_threshold_percent"]:
        reset_detection_streaks()
    return updated

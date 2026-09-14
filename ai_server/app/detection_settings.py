"""Shared settings for model classification, automatic gate control and clients."""

from threading import Lock

from .config import AI_MODEL_THRESHOLD

_lock = Lock()
_settings = {
    "wasp_threshold_percent": round(AI_MODEL_THRESHOLD * 100),
    "wasp_alert": True,
    "vibration": True,
    "auto_close": True,
}


def get_settings() -> dict:
    with _lock:
        return _settings.copy()


def set_settings(settings: dict) -> None:
    with _lock:
        _settings.update(settings)


def get_wasp_threshold_percent() -> int:
    return get_settings()["wasp_threshold_percent"]


def set_wasp_threshold_percent(percent: int) -> None:
    set_settings({"wasp_threshold_percent": percent})


def get_wasp_threshold() -> float:
    return get_wasp_threshold_percent() / 100


def is_auto_close_enabled() -> bool:
    return get_settings()["auto_close"]

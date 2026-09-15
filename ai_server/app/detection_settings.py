"""Runtime settings shared by inference and notification clients."""

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
    normalized = dict(settings)
    normalized["auto_close"] = True
    with _lock:
        _settings.update(normalized)


def get_wasp_threshold() -> float:
    return get_settings()["wasp_threshold_percent"] / 100


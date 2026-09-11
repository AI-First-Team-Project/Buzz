from __future__ import annotations
from copy import deepcopy
from datetime import datetime
from threading import Lock

_lock = Lock()
_state = {
    "enabled": True,
    "sites": {
        site_id: {
            "site_id": site_id,
            "state": "WAITING",
            "current_file": None,
            "chunk_index": None,
            "chunk_start": None,
            "chunk_end": None,
            "prediction": None,
            "confidence": None,
            "analysis_id": None,
            "message": "시뮬레이터 대기 중",
            "updated_at": None,
            "logs": [],
        }
        for site_id in (1, 2, 3)
    },
}

def get_state():
    with _lock:
        return deepcopy(_state)

def set_enabled(enabled: bool):
    with _lock:
        _state["enabled"] = bool(enabled)
        now = datetime.now().astimezone().isoformat()
        for site in _state["sites"].values():
            site["state"] = "WAITING" if enabled else "STOPPED"
            site["message"] = "시뮬레이터 시작" if enabled else "시뮬레이터 중지"
            site["updated_at"] = now
        return deepcopy(_state)

def report(site_id: int, **values):
    with _lock:
        site = _state["sites"].get(site_id)
        if site is None:
            raise KeyError(site_id)
        site.update({k: v for k, v in values.items() if v is not None})
        site["updated_at"] = datetime.now().astimezone().isoformat()
        log = values.get("log")
        if log:
            site["logs"].insert(0, {"time": site["updated_at"], "message": log})
            del site["logs"][30:]
        return deepcopy(site)

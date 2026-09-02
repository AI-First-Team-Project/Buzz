from copy import deepcopy
from datetime import datetime
from threading import Lock
from uuid import uuid4

from .schemas import Probabilities

_lock = Lock()

_sites = {
    1: {
        "site_id": 1,
        "site_name": "사업장 1",
        "status": "NORMAL",
        "detected_class": None,
        "confidence": 0.0,
        "probabilities": Probabilities(wasp=0.0, bee=0.0, other=0.0),
        "door_status": "OPEN",
        "last_analysis_time": None,
    },
    2: {
        "site_id": 2,
        "site_name": "사업장 2",
        "status": "NORMAL",
        "detected_class": None,
        "confidence": 0.0,
        "probabilities": Probabilities(wasp=0.0, bee=0.0, other=0.0),
        "door_status": "OPEN",
        "last_analysis_time": None,
    },
    3: {
        "site_id": 3,
        "site_name": "사업장 3",
        "status": "NORMAL",
        "detected_class": None,
        "confidence": 0.0,
        "probabilities": Probabilities(wasp=0.0, bee=0.0, other=0.0),
        "door_status": "OPEN",
        "last_analysis_time": None,
    },
}

_history: list[dict] = []


def get_site(site_id: int) -> dict | None:
    with _lock:
        row = _sites.get(site_id)
        return deepcopy(row) if row else None


def list_history(limit: int = 100) -> list[dict]:
    with _lock:
        return deepcopy(_history[:limit])


def apply_prediction(site_id: int, class_name: str, confidence: float, probabilities: Probabilities, timestamp: datetime) -> dict:
    with _lock:
        if site_id not in _sites:
            raise KeyError(site_id)

        site = _sites[site_id]
        wasp_detected = class_name == "wasp"
        site["status"] = "DANGER" if wasp_detected else "NORMAL"
        site["detected_class"] = class_name
        site["confidence"] = confidence
        site["probabilities"] = probabilities
        site["last_analysis_time"] = timestamp

        # 발표 핵심 시나리오: 말벌 감지 시 가상 문 자동 폐쇄
        if wasp_detected:
            site["door_status"] = "CLOSED"
            _history.insert(0, {
                "id": str(uuid4()),
                "type": "danger",
                "site_id": site_id,
                "site_name": site["site_name"],
                "title": "말벌 감지",
                "timestamp": timestamp,
                "result": class_name,
                "confidence": confidence,
                "door_status": site["door_status"],
                "action": "자동 폐쇄",
            })

        return deepcopy(site)


def set_door(site_id: int, action: str) -> dict:
    with _lock:
        if site_id not in _sites:
            raise KeyError(site_id)

        site = _sites[site_id]
        now = datetime.now().astimezone()
        site["door_status"] = "OPEN" if action == "open" else "CLOSED"

        _history.insert(0, {
            "id": str(uuid4()),
            "type": "gate",
            "site_id": site_id,
            "site_name": site["site_name"],
            "title": "사용자 문 열기" if action == "open" else "사용자 문 닫기",
            "timestamp": now,
            "result": site["detected_class"],
            "confidence": site["confidence"] if site["detected_class"] else None,
            "door_status": site["door_status"],
            "action": "수동 개방" if action == "open" else "수동 폐쇄",
        })

        return deepcopy(site)

from copy import deepcopy
from datetime import datetime
from threading import Lock
from uuid import uuid4

from .schemas import Probabilities
from .services.state_service import advance_detection_state

_lock = Lock()

_sites = {
    1: {
        "site_id": 1,
        "site_name": "사업장 1",
        "status": "NORMAL",
        "detected_class": None,
        "confidence": 0.0,
        "probabilities": Probabilities(non_wasp=0.0, wasp=0.0),
        "door_status": "OPEN",
        "last_analysis_time": None,
        "latest_analysis_id": None,
        "consecutive_wasp": 0,
        "consecutive_non_wasp": 0,
    },
    2: {
        "site_id": 2,
        "site_name": "사업장 2",
        "status": "NORMAL",
        "detected_class": None,
        "confidence": 0.0,
        "probabilities": Probabilities(non_wasp=0.0, wasp=0.0),
        "door_status": "OPEN",
        "last_analysis_time": None,
        "latest_analysis_id": None,
        "consecutive_wasp": 0,
        "consecutive_non_wasp": 0,
    },
    3: {
        "site_id": 3,
        "site_name": "사업장 3",
        "status": "NORMAL",
        "detected_class": None,
        "confidence": 0.0,
        "probabilities": Probabilities(non_wasp=0.0, wasp=0.0),
        "door_status": "OPEN",
        "last_analysis_time": None,
        "latest_analysis_id": None,
        "consecutive_wasp": 0,
        "consecutive_non_wasp": 0,
    },
}

_history: list[dict] = []


def get_site(site_id: int) -> dict | None:
    with _lock:
        row = _sites.get(site_id)
        return deepcopy(row) if row else None


def list_sites() -> list[dict]:
    with _lock:
        return deepcopy([_sites[site_id] for site_id in sorted(_sites)])


def list_history(limit: int = 100) -> list[dict]:
    with _lock:
        return deepcopy(_history[:limit])


def apply_prediction(
    site_id: int,
    class_name: str,
    confidence: float,
    probabilities: Probabilities,
    timestamp: datetime,
    analysis_id: str,
) -> dict:
    with _lock:
        if site_id not in _sites:
            raise KeyError(site_id)

        site = _sites[site_id]
        decision = advance_detection_state(
            current_status=site["status"],
            prediction=class_name,
            consecutive_wasp=site["consecutive_wasp"],
            consecutive_non_wasp=site["consecutive_non_wasp"],
        )
        site["detected_class"] = class_name
        site["confidence"] = confidence
        site["probabilities"] = probabilities
        site["last_analysis_time"] = timestamp
        site["latest_analysis_id"] = analysis_id
        site["consecutive_wasp"] = decision.consecutive_wasp
        site["consecutive_non_wasp"] = decision.consecutive_non_wasp
        site["status"] = decision.status

        # 상태가 실제로 전환될 때만 이벤트를 생성하여 중복 알림을 막는다.
        if decision.transition == "danger":
            events = [{
                "id": str(uuid4()),
                "type": "danger",
                "site_id": site_id,
                "site_name": site["site_name"],
                "title": "말벌 감지",
                "timestamp": timestamp,
                "result": class_name,
                "confidence": confidence,
                "door_status": "CLOSED",
                "action": "위험 상태 전환",
                "analysis_id": analysis_id,
            }]
            if site["door_status"] != "CLOSED":
                site["door_status"] = "CLOSED"
                events.append({
                    "id": str(uuid4()),
                    "type": "gate",
                    "site_id": site_id,
                    "site_name": site["site_name"],
                    "title": "출입문 자동 폐쇄",
                    "timestamp": timestamp,
                    "result": class_name,
                    "confidence": confidence,
                    "door_status": "CLOSED",
                    "action": "자동 폐쇄",
                    "analysis_id": analysis_id,
                })
            _history[0:0] = events

        elif decision.transition == "recovery":
            # 정상 복귀가 문 자동 개방을 뜻하지는 않는다. 문은 별도 제어 명령으로 연다.
            _history.insert(0, {
                "id": str(uuid4()),
                "type": "recovery",
                "site_id": site_id,
                "site_name": site["site_name"],
                "title": "위험 상태 자동 해제",
                "timestamp": timestamp,
                "result": class_name,
                "confidence": confidence,
                "door_status": site["door_status"],
                "action": "정상 상태 복귀",
                "analysis_id": analysis_id,
            })

        elif decision.status == "DANGER" and class_name == "wasp" and site["door_status"] == "OPEN":
            # 위험 중 수동 개방 후 말벌이 다시 탐지되면 즉시 재폐쇄한다.
            site["door_status"] = "CLOSED"
            _history.insert(0, {
                "id": str(uuid4()),
                "type": "gate",
                "site_id": site_id,
                "site_name": site["site_name"],
                "title": "말벌 재탐지 · 출입문 자동 폐쇄",
                "timestamp": timestamp,
                "result": class_name,
                "confidence": confidence,
                "door_status": "CLOSED",
                "action": "자동 재폐쇄",
                "analysis_id": analysis_id,
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
            "analysis_id": site["latest_analysis_id"],
        })

        return deepcopy(site)

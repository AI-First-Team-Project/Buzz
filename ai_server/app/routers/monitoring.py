from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from ..config import WORKER_STALE_AFTER_SECONDS
from ..database import db_enabled, list_status_history, list_detection_events, safe_update_gate_status
from ..schemas import DoorCommand, HistoryItem, SiteStatusResponse
from ..store import get_site, list_history, list_sites, set_door

router = APIRouter(prefix="/api", tags=["monitoring"])


def _with_worker_status(site: dict) -> dict:
    result = dict(site)
    analyzed_at = result["last_analysis_time"]
    if analyzed_at is None:
        result["worker_status"] = "WAITING"
        result["last_analysis_age_seconds"] = None
        return result

    now = datetime.now().astimezone()
    age_seconds = max(0.0, (now - analyzed_at).total_seconds())
    result["last_analysis_age_seconds"] = round(age_seconds, 1)
    result["worker_status"] = (
        "RUNNING" if age_seconds <= WORKER_STALE_AFTER_SECONDS else "DEGRADED"
    )
    return result


@router.get("/status", response_model=list[SiteStatusResponse])
def statuses():
    return [_with_worker_status(site) for site in list_sites()]


@router.get("/status/{site_id}", response_model=SiteStatusResponse)
def status(site_id: int):
    site = get_site(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    return _with_worker_status(site)


@router.get("/history", response_model=list[HistoryItem])
def history(limit: int = Query(default=100, ge=1, le=500)):
    memory = list_history(limit)
    if not db_enabled():
        return memory
    try:
        persisted = list_status_history(limit)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="상태 변경 이력을 조회하지 못했습니다.") from exc
    merged = {item["id"]: item for item in persisted}
    merged.update({item["id"]: item for item in memory})
    def event_time(item):
        value = item["timestamp"]
        return value.timestamp() if isinstance(value, datetime) else datetime.fromisoformat(value).timestamp()
    return sorted(merged.values(), key=event_time, reverse=True)[:limit]


@router.post("/door/{site_id}", response_model=SiteStatusResponse)
def door(site_id: int, command: DoorCommand):
    try:
        result = _with_worker_status(set_door(site_id, command.action))
        db_status = "open" if command.action == "open" else "closed"
        safe_update_gate_status(site_id, db_status)
        return result
    except KeyError:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")


@router.get("/analysis-logs")
def analysis_logs(
    limit: int = Query(default=100, ge=1, le=500),
    analysis_type: str | None = Query(default=None),
):
    """MySQL에 저장된 live/test/simulation 분석 로그를 조회한다."""
    if analysis_type not in {None, "live", "test", "simulation"}:
        raise HTTPException(status_code=400, detail="analysis_type은 live, test, simulation 중 하나여야 합니다.")
    try:
        return list_detection_events(limit=limit, analysis_type=analysis_type)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"MySQL 로그 조회 실패: {exc}") from exc

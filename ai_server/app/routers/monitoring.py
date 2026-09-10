from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from ..config import WORKER_STALE_AFTER_SECONDS
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
    return list_history(limit)


@router.post("/door/{site_id}", response_model=SiteStatusResponse)
def door(site_id: int, command: DoorCommand):
    try:
        return _with_worker_status(set_door(site_id, command.action))
    except KeyError:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")

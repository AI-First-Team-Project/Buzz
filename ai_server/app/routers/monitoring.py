from fastapi import APIRouter, HTTPException, Query

from ..schemas import DoorCommand, HistoryItem, SiteStatusResponse
from ..store import get_site, list_history, set_door

router = APIRouter(prefix="/api", tags=["monitoring"])


@router.get("/status/{site_id}", response_model=SiteStatusResponse)
def status(site_id: int):
    site = get_site(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    return site


@router.get("/history", response_model=list[HistoryItem])
def history(limit: int = Query(default=100, ge=1, le=500)):
    return list_history(limit)


@router.post("/door/{site_id}", response_model=SiteStatusResponse)
def door(site_id: int, command: DoorCommand):
    try:
        return set_door(site_id, command.action)
    except KeyError:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")

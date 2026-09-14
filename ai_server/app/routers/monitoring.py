from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query

from ..config import WORKER_STALE_AFTER_SECONDS
from ..database import (
    create_site_record, db_enabled, get_detection_event_detail, list_detection_events, list_report_records, list_site_records,
    list_status_history, list_status_history_since, safe_update_gate_status,
    save_report_record,
)
from ..schemas import DoorCommand, HistoryItem, ReportCreate, SiteCreate, SiteStatusResponse
from ..store import get_site, list_history, list_sites, register_site, set_door

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
    if db_enabled():
        try:
            for record in list_site_records():
                register_site(int(record["id"]), record["name"])
        except Exception:
            pass
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


@router.get("/history/summary")
def history_summary(
    site_id: int | None = Query(default=None, ge=1),
    days: int = Query(default=7, ge=1, le=90),
):
    local_zone = ZoneInfo("Asia/Seoul")
    today = datetime.now(local_zone).date()
    first_day = today - timedelta(days=days - 1)
    since_utc = datetime.combine(first_day, datetime.min.time(), local_zone).astimezone(timezone.utc).replace(tzinfo=None)
    try:
        events = list_status_history_since(since_utc, site_id) if db_enabled() else list_history(500)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"이력 집계를 조회하지 못했습니다: {exc}") from exc
    if site_id is not None:
        events = [event for event in events if int(event.get("site_id", 0)) == site_id]
    daily = {first_day + timedelta(days=offset): 0 for offset in range(days)}
    in_range = []
    for event in events:
        raw = event.get("timestamp") or event.get("_occurred_at_utc")
        if not raw:
            continue
        parsed = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        local_date = parsed.astimezone(local_zone).date()
        if local_date not in daily:
            continue
        in_range.append(event)
        if event.get("type") == "danger" and event.get("result") == "wasp":
            daily[local_date] += 1
    return {
        "site_id": site_id,
        "days": [{"date": day.isoformat(), "wasp_count": daily[day]} for day in daily],
        "totals": {
            "events": len(in_range),
            "wasp": sum(daily.values()),
            "danger": sum(1 for event in in_range if event.get("type") == "danger"),
            "automatic_gate": sum(1 for event in in_range if event.get("type") == "gate" and "자동" in str(event.get("action", ""))),
        },
    }


@router.get("/sites")
def sites():
    try:
        return list_site_records()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"사업장 목록을 조회하지 못했습니다: {exc}") from exc


@router.post("/sites", status_code=201)
def create_site(payload: SiteCreate):
    try:
        record = create_site_record(payload.name, payload.location, payload.description)
        register_site(int(record["id"]), record["name"])
        return record
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"사업장을 등록하지 못했습니다: {exc}") from exc


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
    limit: int = Query(default=100, ge=1, le=5000),
    analysis_type: str | None = Query(default=None),
    site_id: int | None = Query(default=None, ge=1),
    prediction: str | None = Query(default=None),
    start_at: datetime | None = Query(default=None),
    end_at: datetime | None = Query(default=None),
):
    """MySQL에 저장된 live/test/simulation 분석 로그를 조회한다."""
    if analysis_type not in {None, "live", "test", "simulation"}:
        raise HTTPException(status_code=400, detail="analysis_type은 live, test, simulation 중 하나여야 합니다.")
    if prediction not in {None, "wasp", "non_wasp"}:
        raise HTTPException(status_code=400, detail="prediction은 wasp 또는 non_wasp여야 합니다.")
    try:
        return list_detection_events(limit, analysis_type, site_id, prediction, start_at, end_at)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"MySQL 로그 조회 실패: {exc}") from exc


@router.get("/analysis-logs/{event_id}")
def analysis_log_detail(event_id: int):
    try:
        event = get_detection_event_detail(event_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"분석 상세 조회 실패: {exc}") from exc
    if event is None:
        raise HTTPException(status_code=404, detail="분석 이력을 찾을 수 없습니다.")
    return event


@router.get("/reports")
def reports(limit: int = Query(default=100, ge=1, le=500)):
    try:
        return list_report_records(limit)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"보고서 이력을 조회하지 못했습니다: {exc}") from exc


@router.post("/reports", status_code=201)
def create_report(payload: ReportCreate):
    if payload.period_start > payload.period_end:
        raise HTTPException(status_code=400, detail="조회 시작일은 종료일보다 늦을 수 없습니다.")
    try:
        return save_report_record(payload.site_id, payload.period_start, payload.period_end,
                                  payload.file_name, payload.report_type, payload.filters)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"보고서 이력을 저장하지 못했습니다: {exc}") from exc

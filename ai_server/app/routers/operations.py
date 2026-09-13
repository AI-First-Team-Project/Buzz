from __future__ import annotations
from pathlib import Path
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..database import safe_save_file_test_result, safe_list_file_test_results
from ..services.file_test_service import analyze_full_file
from ..simulator_store import get_state, report, set_enabled
from ..upload_storage import save_upload

router = APIRouter(prefix="/api", tags=["operations"])
_memory_tests: list[dict] = []


def _save(file: UploadFile) -> Path:
    return save_upload(file)

@router.get("/simulator/status")
def simulator_status():
    return get_state()

@router.post("/simulator/start")
def simulator_start():
    return set_enabled(True)

@router.post("/simulator/stop")
def simulator_stop():
    return set_enabled(False)

@router.post("/simulator/report")
def simulator_report(
    site_id: int = Form(...), state: str = Form(...), current_file: str | None = Form(None),
    chunk_index: int | None = Form(None), chunk_start: float | None = Form(None), chunk_end: float | None = Form(None),
    prediction: str | None = Form(None), confidence: float | None = Form(None), analysis_id: str | None = Form(None),
    message: str | None = Form(None), log: str | None = Form(None),
):
    try:
        return report(site_id, state=state, current_file=current_file, chunk_index=chunk_index,
                      chunk_start=chunk_start, chunk_end=chunk_end, prediction=prediction,
                      confidence=confidence, analysis_id=analysis_id, message=message, log=log)
    except KeyError:
        raise HTTPException(404, "사업장을 찾을 수 없습니다.")

@router.post("/test/analyze-full")
def test_analyze_full(file: UploadFile = File(...), site_id: int = Form(1)):
    if site_id not in (1, 2, 3):
        raise HTTPException(400, "site_id는 1~3만 가능합니다.")
    path = _save(file)
    try:
        result = analyze_full_file(path, file.filename or path.name, site_id)
        _memory_tests.insert(0, result)
        del _memory_tests[50:]
        safe_save_file_test_result(result)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(422, f"전체 파일 분석 실패: {exc}") from exc
    finally:
        path.unlink(missing_ok=True)

@router.get("/test/history")
def test_history(limit: int = 20):
    db_rows = safe_list_file_test_results(max(1, min(limit, 100)))
    return db_rows if db_rows is not None else _memory_tests[:limit]

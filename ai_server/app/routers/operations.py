from __future__ import annotations
import json
import shutil
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..config import ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, UPLOAD_DIR
from ..database import safe_save_file_test_result, safe_list_file_test_results
from ..services.file_test_service import analyze_full_file
from ..simulator_store import get_state, report, set_enabled

router = APIRouter(prefix="/api", tags=["operations"])
_memory_tests: list[dict] = []


def _save(file: UploadFile) -> Path:
    suffix = Path(file.filename or "audio.wav").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "MP3 또는 WAV 파일만 업로드할 수 있습니다.")
    path = UPLOAD_DIR / f"{uuid4().hex}_{Path(file.filename or 'audio').name}"
    with path.open("wb") as out:
        shutil.copyfileobj(file.file, out)
    if path.stat().st_size > MAX_UPLOAD_BYTES:
        path.unlink(missing_ok=True)
        raise HTTPException(413, "파일 크기는 30MB 이하여야 합니다.")
    return path

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

import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..config import ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, UPLOAD_DIR
from ..schemas import AnalysisResponse, AnalyzePathRequest
from ..services.analysis_service import analyze_audio
from ..store import apply_prediction

router = APIRouter(prefix="/api", tags=["analysis"])


def _save_upload(file: UploadFile) -> Path:
    suffix = Path(file.filename or "audio.wav").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="MP3 또는 WAV 파일만 업로드할 수 있습니다.")

    safe_name = f"{uuid4().hex}{suffix}"
    saved_path = UPLOAD_DIR / safe_name
    with saved_path.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    if saved_path.stat().st_size > MAX_UPLOAD_BYTES:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(status_code=413, detail="파일 크기는 30MB 이하여야 합니다.")

    named_path = UPLOAD_DIR / f"{uuid4().hex}_{Path(file.filename or 'audio').name}"
    saved_path.replace(named_path)
    return named_path


@router.post("/test/analyze", response_model=AnalysisResponse)
async def test_analyze(file: UploadFile = File(...)):
    """사용자 테스트 전용. 자동 감지 상태/문/이력에는 영향을 주지 않는다."""
    try:
        named_path = _save_upload(file)
        return analyze_audio(named_path, "user_test")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"오디오 분석 실패: {exc}") from exc


@router.post("/auto/analyze", response_model=AnalysisResponse)
async def auto_analyze(
    file: UploadFile = File(...),
    site_id: int = Form(3),
):
    """자동 감지용 직접 업로드 엔드포인트. Kafka 없이 FastAPI가 음원을 직접 수신한다."""
    try:
        named_path = _save_upload(file)
        result = analyze_audio(named_path, "auto_detection")
        apply_prediction(
            site_id=site_id,
            class_name=result.prediction.label,
            confidence=result.prediction.confidence,
            probabilities=result.prediction.probabilities,
            timestamp=result.meta.timestamp,
        )
        return result
    except KeyError:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"오디오 분석 실패: {exc}") from exc


@router.post("/internal/analyze-file", response_model=AnalysisResponse)
def analyze_file_from_path(payload: AnalyzePathRequest):
    """서버 로컬/공유 경로의 음원 파일을 자동 감지 경로로 분석한다."""
    audio_path = Path(payload.file_path).expanduser().resolve()
    if not audio_path.exists() or not audio_path.is_file():
        raise HTTPException(status_code=404, detail="음원 파일을 찾을 수 없습니다.")
    if audio_path.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="MP3 또는 WAV 파일만 분석할 수 있습니다.")

    try:
        result = analyze_audio(audio_path, payload.source)
        apply_prediction(
            site_id=payload.site_id,
            class_name=result.prediction.label,
            confidence=result.prediction.confidence,
            probabilities=result.prediction.probabilities,
            timestamp=result.meta.timestamp,
        )
        return result
    except KeyError:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"오디오 분석 실패: {exc}") from exc

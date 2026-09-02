import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..config import ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, UPLOAD_DIR
from ..schemas import AnalysisResponse, AnalyzePathRequest
from ..services.analysis_service import analyze_audio
from ..store import apply_prediction

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/test/analyze", response_model=AnalysisResponse)
async def test_analyze(file: UploadFile = File(...)):
    """사용자 테스트 전용.

    자동 감지의 위험 상태/가상 문 상태/이력에는 영향을 주지 않는다.
    """
    suffix = Path(file.filename or "audio.wav").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="MP3 또는 WAV 파일만 업로드할 수 있습니다.")

    safe_name = f"{uuid4().hex}{suffix}"
    saved_path = UPLOAD_DIR / safe_name

    try:
        with saved_path.open("wb") as out:
            shutil.copyfileobj(file.file, out)
        if saved_path.stat().st_size > MAX_UPLOAD_BYTES:
            saved_path.unlink(missing_ok=True)
            raise HTTPException(status_code=413, detail="파일 크기는 30MB 이하여야 합니다.")

        # Mock predictor가 파일명 힌트를 사용할 수 있도록 원본 파일명을 보존한다.
        named_path = UPLOAD_DIR / f"{uuid4().hex}_{Path(file.filename or 'audio').name}"
        saved_path.replace(named_path)
        return analyze_audio(named_path, "user_test")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"오디오 분석 실패: {exc}") from exc


@router.post("/internal/analyze-file", response_model=AnalysisResponse)
def analyze_file_from_kafka(payload: AnalyzePathRequest):
    """Kafka Consumer가 전달한 파일 경로를 분석하는 내부 엔드포인트."""
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

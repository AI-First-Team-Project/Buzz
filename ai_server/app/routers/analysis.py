import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from ..config import ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, UPLOAD_DIR
from ..schemas import AnalysisResponse, AnalyzePathRequest
from ..services.analysis_service import analyze_audio
from ..store import apply_prediction

router = APIRouter(prefix="/api", tags=["analysis"])


def _base_url(request: Request) -> str:
    return str(request.base_url).rstrip("")


@router.post("/test/analyze", response_model=AnalysisResponse)
async def test_analyze(
    request: Request,
    file: UploadFile = File(...),
):
    """사용자 테스트 탭 전용.

    운영 상태/문 상태/이력에는 영향을 주지 않는다.
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

        # Mock predictor가 파일명 힌트를 사용할 수 있도록 원본 이름을 별도 복사명으로 보존
        named_path = UPLOAD_DIR / f"{uuid4().hex}_{Path(file.filename or 'audio').name}"
        saved_path.replace(named_path)
        result = analyze_audio(named_path, "user_test", _base_url(request))
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"오디오 분석 실패: {exc}") from exc


@router.post("/internal/analyze-file", response_model=AnalysisResponse)
def analyze_file_from_kafka(request: Request, payload: AnalyzePathRequest):
    """Kafka Consumer와 연결하기 위한 내부 통합 지점.

    Kafka 파트는 파일 자체가 아니라 file_path/site_id를 넘기면 된다.
    이 API는 분석 후 운영 상태를 갱신하고, 말벌이면 가상 문을 자동으로 닫는다.
    """
    audio_path = Path(payload.file_path).expanduser().resolve()
    if not audio_path.exists() or not audio_path.is_file():
        raise HTTPException(status_code=404, detail="음원 파일을 찾을 수 없습니다.")
    if audio_path.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="MP3 또는 WAV 파일만 분석할 수 있습니다.")

    try:
        result = analyze_audio(audio_path, payload.source, _base_url(request))
        apply_prediction(
            site_id=payload.site_id,
            class_name=result.class_name,
            confidence=result.confidence,
            probabilities=result.probabilities,
            timestamp=result.timestamp,
        )
        return result
    except KeyError:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"오디오 분석 실패: {exc}") from exc

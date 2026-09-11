import shutil
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..config import ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, UPLOAD_DIR
from ..database import safe_save_detection_result, safe_update_gate_status
from ..latest_analysis_store import (
    cache_latest_visualization,
    get_latest_analysis_source,
    get_latest_visualization,
    set_latest_analysis_source,
)
from ..schemas import AnalysisResponse, AnalyzePathRequest, BatchAnalysisItemResponse, LatestVisualizationResponse
from ..services.analysis_service import analyze_audio, analyze_audio_batch, create_visualization_response
from ..store import apply_prediction, get_site

router = APIRouter(prefix="/api", tags=["analysis"])


def _apply_prediction_and_sync_gate(**kwargs) -> bool:
    site_id = kwargs["site_id"]
    previous = get_site(site_id)
    updated = apply_prediction(**kwargs)
    if previous is not None and previous["door_status"] != "CLOSED" and updated["door_status"] == "CLOSED":
        safe_update_gate_status(site_id, "closed")
    return previous is not None and previous["status"] != updated["status"]


def _audio_bytes(saved_audio) -> bytes:
    if isinstance(saved_audio, Path):
        return saved_audio.read_bytes()
    position = saved_audio.tell()
    saved_audio.seek(0)
    content = saved_audio.read()
    saved_audio.seek(position)
    return content


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
async def test_analyze(
    file: UploadFile = File(...),
    expected_label: str | None = Form(default=None),
):
    """사용자 테스트 전용. 결과는 MySQL에 test 로그로 저장한다."""
    if expected_label not in {None, "wasp", "non_wasp"}:
        raise HTTPException(status_code=400, detail="expected_label은 wasp 또는 non_wasp만 가능합니다.")
    try:
        named_path = _save_upload(file)
        result = analyze_audio(named_path, "user_test", file.filename)
        safe_save_detection_result(
            site_id=None,
            file_path=named_path,
            result=result,
            analysis_type="test",
            expected_label=expected_label,
        )
        return result
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
        result = analyze_audio(named_path, "auto_detection", file.filename)
        status_changed = _apply_prediction_and_sync_gate(
            site_id=site_id,
            class_name=result.prediction.label,
            confidence=result.prediction.confidence,
            probabilities=result.prediction.probabilities,
            timestamp=result.meta.timestamp,
            analysis_id=result.analysis_id,
        )
        safe_save_detection_result(
            site_id=site_id,
            file_path=named_path,
            result=result,
            analysis_type="live",
            force_record=status_changed,
        )
        return result
    except KeyError:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"오디오 분석 실패: {exc}") from exc


@router.post("/auto/analyze-batch", response_model=list[BatchAnalysisItemResponse])
async def auto_analyze_batch(
    files: list[UploadFile] = File(...),
    site_ids: list[int] = Form(...),
):
    """Analyze up to three sites in one model batch and update each site independently."""
    if len(files) != len(site_ids):
        raise HTTPException(status_code=400, detail="files와 site_ids 개수가 같아야 합니다.")
    if not files or len(files) > 3:
        raise HTTPException(status_code=400, detail="한 배치에는 1~3개 음원이 필요합니다.")
    if len(set(site_ids)) != len(site_ids):
        raise HTTPException(status_code=400, detail="한 배치에서 사업장 ID가 중복될 수 없습니다.")
    if any(get_site(site_id) is None for site_id in site_ids):
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")

    saved = []
    try:
        saved = [(_save_upload(file), file.filename) for file in files]
        results = analyze_audio_batch(saved)
        response = []
        for site_id, result, (saved_audio, _) in zip(site_ids, results, saved, strict=True):
            status_changed = _apply_prediction_and_sync_gate(
                site_id=site_id,
                class_name=result.prediction.label,
                confidence=result.prediction.confidence,
                probabilities=result.prediction.probabilities,
                timestamp=result.meta.timestamp,
                analysis_id=result.analysis_id,
            )
            safe_save_detection_result(
                site_id=site_id,
                file_path=None,
                result=result,
                analysis_type="simulation",
                force_record=status_changed,
            )
            set_latest_analysis_source(site_id, result, _audio_bytes(saved_audio))
            response.append(BatchAnalysisItemResponse(siteId=site_id, analysis=result))
        return response
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"배치 오디오 분석 실패: {exc}") from exc
    finally:
        for saved_audio, _ in saved:
            if isinstance(saved_audio, Path):
                saved_audio.unlink(missing_ok=True)


@router.get("/analysis/latest/{site_id}", response_model=LatestVisualizationResponse)
def latest_analysis(site_id: int):
    """분석 화면이 열렸을 때만 최신 음원의 시각화 JSON을 생성해 반환한다."""
    cached = get_latest_visualization(site_id)
    if cached is not None:
        return cached

    source = get_latest_analysis_source(site_id)
    if source is None:
        raise HTTPException(status_code=404, detail="아직 수신한 자동 분석 음원이 없습니다.")

    audio = BytesIO(source["audio_bytes"])
    audio.name = source["analysis"].audio.file_name
    try:
        visualization = create_visualization_response(audio, source["analysis"])
        cache_latest_visualization(site_id, source["analysis"].analysis_id, visualization)
        return visualization
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"최신 분석 시각화 생성 실패: {exc}") from exc


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
        status_changed = _apply_prediction_and_sync_gate(
            site_id=payload.site_id,
            class_name=result.prediction.label,
            confidence=result.prediction.confidence,
            probabilities=result.prediction.probabilities,
            timestamp=result.meta.timestamp,
            analysis_id=result.analysis_id,
        )
        safe_save_detection_result(
            site_id=payload.site_id,
            file_path=audio_path,
            result=result,
            analysis_type="live",
            force_record=status_changed,
        )
        return result
    except KeyError:
        raise HTTPException(status_code=404, detail="사업장을 찾을 수 없습니다.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"오디오 분석 실패: {exc}") from exc

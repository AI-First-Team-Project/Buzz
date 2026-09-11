"""사업장별 최신 자동 분석 음원을 메모리에 하나씩 보관한다."""
from threading import Lock

from .schemas import BatchAnalysisResult, LatestVisualizationResponse

_lock = Lock()
_latest: dict[int, dict] = {}


def set_latest_analysis_source(
    site_id: int,
    analysis: BatchAnalysisResult,
    audio_bytes: bytes,
) -> None:
    with _lock:
        _latest[site_id] = {
            "analysis": analysis.model_copy(deep=True),
            "audio_bytes": bytes(audio_bytes),
            "visualization": None,
        }


def get_latest_analysis_source(site_id: int) -> dict | None:
    with _lock:
        source = _latest.get(site_id)
        if source is None:
            return None
        return {
            "analysis": source["analysis"].model_copy(deep=True),
            "audio_bytes": bytes(source["audio_bytes"]),
        }


def get_latest_visualization(site_id: int) -> LatestVisualizationResponse | None:
    with _lock:
        source = _latest.get(site_id)
        if source is None or source["visualization"] is None:
            return None
        return source["visualization"].model_copy(deep=True)


def cache_latest_visualization(
    site_id: int,
    analysis_id: str,
    visualization: LatestVisualizationResponse,
) -> bool:
    """같은 분석 ID가 여전히 최신일 때만 계산 결과를 캐시한다."""
    with _lock:
        source = _latest.get(site_id)
        if source is None or source["analysis"].analysis_id != analysis_id:
            return False
        source["visualization"] = visualization.model_copy(deep=True)
        return True

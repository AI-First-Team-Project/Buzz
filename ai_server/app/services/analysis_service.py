from datetime import datetime
from pathlib import Path

from ..schemas import AnalysisResponse
from .audio_analysis import create_analysis_images
from .predictor import predict_audio


def analyze_audio(audio_path: Path, source: str, base_url: str) -> AnalysisResponse:
    analysis_id, duration_sec, images = create_analysis_images(audio_path, base_url)
    class_name, confidence, probabilities, model_name = predict_audio(audio_path)

    return AnalysisResponse(
        analysis_id=analysis_id,
        **{"class": class_name},
        confidence=confidence,
        probabilities=probabilities,
        duration_sec=duration_sec,
        source=source,
        timestamp=datetime.now().astimezone(),
        model_name=model_name,
        images=images,
    )

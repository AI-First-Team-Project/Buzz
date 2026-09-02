from datetime import datetime
from pathlib import Path
from uuid import uuid4

from ..config import SAMPLE_RATE
from ..schemas import (
    AnalysisMeta,
    AnalysisResponse,
    AudioInfo,
    PredictionInfo,
)
from .audio_analysis import create_analysis_data
from .predictor import predict_audio


def analyze_audio(audio_path: Path, source: str) -> AnalysisResponse:
    duration_sec, waveform, fft, spectrogram, mfcc = create_analysis_data(audio_path)
    class_name, confidence, probabilities, model_name = predict_audio(audio_path)

    return AnalysisResponse(
        analysisId=uuid4().hex,
        audio=AudioInfo(
            fileName=audio_path.name,
            sampleRate=SAMPLE_RATE,
            duration=duration_sec,
        ),
        prediction=PredictionInfo(
            label=class_name,
            confidence=confidence,
            probabilities=probabilities,
        ),
        waveform=waveform,
        fft=fft,
        spectrogram=spectrogram,
        mfcc=mfcc,
        meta=AnalysisMeta(
            source=source,
            modelName=model_name,
            timestamp=datetime.now().astimezone(),
        ),
    )

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


def analyze_audio(audio_path: Path, source: str, original_file_name: str | None = None) -> AnalysisResponse:
    duration_sec, waveform, fft, spectrogram, mfcc = create_analysis_data(audio_path)
    model_result = predict_audio(audio_path)

    return AnalysisResponse(
        analysisId=uuid4().hex,
        audio=AudioInfo(
            fileName=original_file_name or audio_path.name,
            sampleRate=SAMPLE_RATE,
            duration=duration_sec,
        ),
        # 모델 종류와 무관하게 prediction/meta 부분만 가져오고 스키마로 검증한다.
        # 모델의 로컬 시각화/timing은 내부 진단용이며 앱 그래프는 서버가 생성한다.
        prediction=PredictionInfo.model_validate(model_result['prediction']),
        waveform=waveform,
        fft=fft,
        spectrogram=spectrogram,
        mfcc=mfcc,
        meta=AnalysisMeta(
            source=source,
            modelName=model_result['meta']['modelName'],
            timestamp=datetime.now().astimezone(),
        ),
    )

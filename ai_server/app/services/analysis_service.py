from datetime import datetime
from pathlib import Path
from uuid import uuid4

from ..config import DURATION_SEC, SAMPLE_RATE
from ..schemas import (
    AnalysisMeta,
    AnalysisResponse,
    AudioInfo,
    BatchAnalysisResult,
    PredictionInfo,
    LatestVisualizationResponse,
)
from .audio_analysis import create_analysis_data
from .predictor import predict_audio, predict_audio_batch


def analyze_audio(audio_path: Path, source: str, original_file_name: str | None = None) -> AnalysisResponse:
    duration_sec, waveform, fft, spectrogram, mfcc = create_analysis_data(audio_path)
    if mfcc is None:
        raise RuntimeError("사용자 음원 분석에 필요한 MFCC가 생성되지 않았습니다.")
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


def analyze_audio_batch(
    audio_items: list[tuple[Path, str | None]],
    source: str = "auto_detection",
) -> list[BatchAnalysisResult]:
    """Infer all files in one model batch without user-test visualization payloads."""
    predictions = predict_audio_batch([path for path, _ in audio_items])
    timestamp = datetime.now().astimezone()

    responses = []
    for (audio_path, original_file_name), model_result in zip(
        audio_items, predictions, strict=True
    ):
        responses.append(
            BatchAnalysisResult(
                analysisId=uuid4().hex,
                audio=AudioInfo(
                    fileName=original_file_name or audio_path.name,
                    sampleRate=SAMPLE_RATE,
                    duration=DURATION_SEC,
                ),
                prediction=PredictionInfo.model_validate(model_result["prediction"]),
                meta=AnalysisMeta(
                    source=source,
                    modelName=model_result["meta"]["modelName"],
                    timestamp=timestamp,
                ),
            )
        )
    return responses


def create_visualization_response(
    audio_path: Path,
    analysis: BatchAnalysisResult,
) -> LatestVisualizationResponse:
    """이미 추론한 최신 음원에서 화면용 수치만 계산해 전체 응답을 구성한다."""
    duration_sec, waveform, fft, spectrogram, _ = create_analysis_data(
        audio_path,
        include_mfcc=False,
    )
    return LatestVisualizationResponse(
        analysisId=analysis.analysis_id,
        audio=AudioInfo(
            fileName=analysis.audio.file_name,
            sampleRate=SAMPLE_RATE,
            duration=duration_sec,
        ),
        prediction=analysis.prediction,
        waveform=waveform,
        fft=fft,
        spectrogram=spectrogram,
        meta=analysis.meta,
    )

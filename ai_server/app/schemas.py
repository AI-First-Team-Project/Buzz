from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ClassName = Literal["non_wasp", "wasp"]
SourceName = Literal["user_test", "auto_detection"]
DoorState = Literal["OPEN", "CLOSED"]
SystemState = Literal["NORMAL", "DANGER"]
WorkerState = Literal["WAITING", "RUNNING", "DEGRADED"]


class Probabilities(BaseModel):
    non_wasp: float = Field(ge=0, le=1)
    wasp: float = Field(ge=0, le=1)


class AudioInfo(BaseModel):
    file_name: str = Field(alias="fileName")
    sample_rate: int = Field(alias="sampleRate")
    duration: float

    model_config = {"populate_by_name": True}


class PredictionInfo(BaseModel):
    label: ClassName
    confidence: float = Field(ge=0, le=1)
    probabilities: Probabilities


class WaveformData(BaseModel):
    # 축소된 파형의 실제 시간(초). 원본 sampleRate로 배열 인덱스를 나누면 안 된다.
    time: list[float]
    amplitude: list[float]


class FFTData(BaseModel):
    frequency: list[float]
    magnitude_db: list[float] = Field(alias="magnitudeDb")

    model_config = {"populate_by_name": True}


class SpectrogramData(BaseModel):
    time: list[float]
    frequency: list[float]
    db: list[list[float]]


class MFCCData(BaseModel):
    time: list[float]
    coefficients: list[list[float]]


class AnalysisMeta(BaseModel):
    source: SourceName
    model_name: str = Field(alias="modelName")
    timestamp: datetime

    model_config = {"populate_by_name": True}


class AnalysisResponse(BaseModel):
    analysis_id: str = Field(alias="analysisId")
    audio: AudioInfo
    prediction: PredictionInfo
    waveform: WaveformData
    fft: FFTData
    spectrogram: SpectrogramData
    mfcc: MFCCData
    meta: AnalysisMeta

    model_config = {"populate_by_name": True}


class LatestVisualizationResponse(BaseModel):
    """실시간 분석 화면 전용 응답. 최신 실제 2초 chunk의 전체 상세 신호를 포함한다."""

    analysis_id: str = Field(alias="analysisId")
    audio: AudioInfo
    prediction: PredictionInfo
    waveform: WaveformData
    fft: FFTData
    spectrogram: SpectrogramData
    mfcc: MFCCData
    meta: AnalysisMeta

    model_config = {"populate_by_name": True}


class BatchAnalysisResult(BaseModel):
    analysis_id: str = Field(alias="analysisId")
    audio: AudioInfo
    prediction: PredictionInfo
    meta: AnalysisMeta

    model_config = {"populate_by_name": True}


class BatchAnalysisItemResponse(BaseModel):
    site_id: int = Field(alias="siteId")
    analysis: BatchAnalysisResult

    model_config = {"populate_by_name": True}


class SiteStatusResponse(BaseModel):
    site_id: int
    site_name: str
    status: SystemState
    detected_class: ClassName | None
    confidence: float
    probabilities: Probabilities
    door_status: DoorState
    last_analysis_time: datetime | None
    latest_analysis_id: str | None
    consecutive_wasp: int = Field(ge=0)
    consecutive_non_wasp: int = Field(ge=0)
    worker_status: WorkerState
    last_analysis_age_seconds: float | None = Field(default=None, ge=0)


class HistoryItem(BaseModel):
    id: str
    type: Literal["danger", "recovery", "gate"]
    site_id: int
    site_name: str
    title: str
    timestamp: datetime
    result: ClassName | None = None
    confidence: float | None = None
    door_status: DoorState
    action: str
    analysis_id: str | None = None


class DoorCommand(BaseModel):
    action: Literal["open", "close"]


class AnalyzePathRequest(BaseModel):
    file_path: str
    site_id: int = 3
    source: Literal["auto_detection"] = "auto_detection"

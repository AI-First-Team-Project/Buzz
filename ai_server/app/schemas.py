from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ClassName = Literal["wasp", "bee", "other"]
SourceName = Literal["user_test", "kafka"]
DoorState = Literal["OPEN", "CLOSED"]
SystemState = Literal["NORMAL", "DANGER"]


class Probabilities(BaseModel):
    wasp: float = Field(ge=0, le=1)
    bee: float = Field(ge=0, le=1)
    other: float = Field(ge=0, le=1)


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


class SiteStatusResponse(BaseModel):
    site_id: int
    site_name: str
    status: SystemState
    detected_class: ClassName | None
    confidence: float
    probabilities: Probabilities
    door_status: DoorState
    last_analysis_time: datetime | None


class HistoryItem(BaseModel):
    id: str
    type: Literal["danger", "gate"]
    site_id: int
    site_name: str
    title: str
    timestamp: datetime
    result: ClassName | None = None
    confidence: float | None = None
    door_status: DoorState
    action: str


class DoorCommand(BaseModel):
    action: Literal["open", "close"]


class AnalyzePathRequest(BaseModel):
    file_path: str
    site_id: int = 3
    source: Literal["kafka"] = "kafka"

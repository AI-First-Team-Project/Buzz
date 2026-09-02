from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

ClassName = Literal["wasp", "bee", "other"]
SourceName = Literal["user_test", "kafka", "manual"]
DoorState = Literal["OPEN", "CLOSED"]
SystemState = Literal["NORMAL", "DANGER"]


class Probabilities(BaseModel):
    wasp: float = Field(ge=0, le=1)
    bee: float = Field(ge=0, le=1)
    other: float = Field(ge=0, le=1)


class AnalysisImages(BaseModel):
    waveplot: str
    fft: str
    mel: str
    mfcc: str


class AnalysisResponse(BaseModel):
    analysis_id: str
    class_name: ClassName = Field(alias="class")
    confidence: float = Field(ge=0, le=1)
    probabilities: Probabilities
    duration_sec: float
    source: SourceName
    timestamp: datetime
    model_name: str
    images: AnalysisImages

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
    source: Literal["kafka", "manual"] = "kafka"

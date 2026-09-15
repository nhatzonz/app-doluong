from pydantic import BaseModel, Field
from typing import Optional

class SensorSample(BaseModel):
    ax: float
    ay: float
    az: float
    timestamp: float  # ms

class LocationData(BaseModel):
    lat: Optional[float] = None
    lon: Optional[float] = None
    speed: Optional[float] = 0
    altitude: Optional[float] = 0

class SegmentRequest(BaseModel):
    samples: list[SensorSample] = Field(min_length=16)
    location: Optional[LocationData] = None

class SegmentResponse(BaseModel):
    wrms: float          # av — overall vibration total value (ISO 2631-1)
    aw_z: float          # truc dung, Wk
    aw_xy: float         # truc ngang, Wd
    fs: float
    duration: float
    comfort: str
    color: str

class SegmentWithFeatures(BaseModel):
    wrms: float
    comfort: str
    color: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    speed: Optional[float] = 0
    duration: Optional[float] = None

class FullTripRequest(BaseModel):
    segments: list[SegmentWithFeatures]

class FullAnalysisResponse(BaseModel):
    r2_score: Optional[float]
    baseline_r2: Optional[float]
    feature_importances: dict
    n_train: int
    n_test: int
    note: str
    overall_wrms: float
    overall_comfort: str
    total_duration: float

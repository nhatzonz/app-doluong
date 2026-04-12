from pydantic import BaseModel
from typing import Optional

class SensorSample(BaseModel):
    ax: float
    ay: float
    az: float
    timestamp: float

class LocationData(BaseModel):
    lat: float
    lon: float
    speed: Optional[float] = 0
    altitude: Optional[float] = 0

class SegmentRequest(BaseModel):
    samples: list[SensorSample]
    location: LocationData

class SegmentResponse(BaseModel):
    wrms: float
    comfort: str
    color: str

class SegmentWithFeatures(BaseModel):
    wrms: float
    comfort: str
    color: str
    lat: float
    lon: float
    speed: Optional[float] = 0

class FullTripRequest(BaseModel):
    segments: list[SegmentWithFeatures]

class FullAnalysisResponse(BaseModel):
    r2_score: float
    feature_importances: dict
    overall_wrms: float
    overall_comfort: str

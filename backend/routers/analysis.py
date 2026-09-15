from fastapi import APIRouter
from ..models.schemas import (
    SegmentRequest, SegmentResponse,
    FullTripRequest, FullAnalysisResponse,
)
from ..services.wrms_calculator import analyze_segment as compute_segment, energy_average
from ..services.comfort_classifier import classify, get_color
from ..services.ml_model import train_and_predict

router = APIRouter()

DEFAULT_SEGMENT_DURATION = 2.0


@router.post("/analyze", response_model=SegmentResponse)
async def analyze_segment(data: SegmentRequest):
    """Phan tich 1 segment (realtime)"""
    result = compute_segment(
        [s.ax for s in data.samples],
        [s.ay for s in data.samples],
        [s.az for s in data.samples],
        [s.timestamp for s in data.samples],
    )
    return SegmentResponse(
        **result,
        comfort=classify(result["wrms"]),
        color=get_color(result["wrms"]),
    )


@router.post("/analyze-full", response_model=FullAnalysisResponse)
async def analyze_full_trip(data: FullTripRequest):
    """Phan tich toan bo chuyen di voi ML"""
    wrms_values = [s.wrms for s in data.segments]
    speeds = [s.speed or 0 for s in data.segments]
    durations = [s.duration or DEFAULT_SEGMENT_DURATION for s in data.segments]

    ml_result = train_and_predict(wrms_values, speeds)
    overall_wrms = energy_average(wrms_values, durations)

    return FullAnalysisResponse(
        **ml_result,
        overall_wrms=overall_wrms,
        overall_comfort=classify(overall_wrms),
        total_duration=float(sum(durations)),
    )

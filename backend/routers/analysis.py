import numpy as np
from fastapi import APIRouter
from ..models.schemas import (
    SegmentRequest, SegmentResponse,
    FullTripRequest, FullAnalysisResponse,
)
from ..services.wrms_calculator import calculate_wrms_from_xyz
from ..services.comfort_classifier import classify, get_color
from ..services.ml_model import train_and_predict

router = APIRouter()


@router.post("/analyze", response_model=SegmentResponse)
async def analyze_segment(data: SegmentRequest):
    """Phan tich 1 segment (realtime)"""
    ax = [s.ax for s in data.samples]
    ay = [s.ay for s in data.samples]
    az = [s.az for s in data.samples]

    wrms = calculate_wrms_from_xyz(ax, ay, az)
    comfort = classify(wrms)
    color = get_color(wrms)

    return SegmentResponse(wrms=wrms, comfort=comfort, color=color)


@router.post("/analyze-full", response_model=FullAnalysisResponse)
async def analyze_full_trip(data: FullTripRequest):
    """Phan tich toan bo chuyen di voi ML"""
    wrms_values = [s.wrms for s in data.segments]
    speeds = [s.speed or 0 for s in data.segments]

    ml_result = train_and_predict(wrms_values, speeds)

    overall_wrms = float(np.mean(wrms_values))
    overall_comfort = classify(overall_wrms)

    return FullAnalysisResponse(
        r2_score=ml_result["r2_score"],
        feature_importances=ml_result["feature_importances"],
        overall_wrms=overall_wrms,
        overall_comfort=overall_comfort,
    )

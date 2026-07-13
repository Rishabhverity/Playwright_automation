from fastapi import FastAPI

from app.models import SplitRequest, SplitResponse
from app.splitter import evaluate_split, split_duration

app = FastAPI(title="Learning Duration Splitter")


@app.post("/split-learning-duration", response_model=SplitResponse)
def split_learning_duration(request: SplitRequest) -> SplitResponse:
    durations = split_duration(request.total_minutes, request.unit_count)
    valid, severity, flags, recommendations = evaluate_split(durations)

    return SplitResponse(
        valid=valid,
        severity=severity,
        durations=durations,
        flags=flags,
        recommendations=recommendations,
    )

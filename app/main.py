from fastapi import FastAPI

from app.quality_checker import check_learning_unit_quality
from app.schemas import LearningUnitInput, QualityCheckResponse

app = FastAPI(
    title="Learning Unit Quality Checker",
    description="Validates whether a generated learning unit is complete, clear, and review-ready.",
    version="1.0.0",
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/check-learning-unit-quality", response_model=QualityCheckResponse)
def check_learning_unit_quality_endpoint(
    unit: LearningUnitInput,
) -> QualityCheckResponse:
    return check_learning_unit_quality(unit)

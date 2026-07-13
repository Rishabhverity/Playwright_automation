from typing import Literal, Optional

from pydantic import BaseModel, Field


VALID_LEVELS = {"K1", "K2", "K3", "K4", "K5", "K6"}

ACTION_VERBS = {
    "Explain",
    "Describe",
    "Identify",
    "Apply",
    "Analyze",
    "Compare",
    "Design",
    "Evaluate",
    "Create",
}


class LearningUnitInput(BaseModel):
    unit_id: Optional[str] = None
    title: Optional[str] = None
    concept: Optional[str] = None
    level: Optional[str] = None
    outcome: Optional[str] = None
    estimated_minutes: Optional[int] = None
    source_locator: Optional[str] = None
    validation_flags: list[str] = Field(default_factory=list)


class QualityCheckResponse(BaseModel):
    valid: bool
    severity: Literal["pass", "warning", "error"]
    quality_score: int
    flags: list[str]
    recommendations: list[str]

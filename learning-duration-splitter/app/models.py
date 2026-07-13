from pydantic import BaseModel, Field


class SplitRequest(BaseModel):
    total_minutes: int = Field(..., ge=5, description="Total estimated duration in minutes")
    unit_count: int = Field(..., gt=0, description="Number of learning units to create")


class SplitResponse(BaseModel):
    valid: bool
    severity: str
    durations: list[int]
    flags: list[str]
    recommendations: list[str]

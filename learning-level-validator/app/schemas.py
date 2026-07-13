from typing import Optional

from pydantic import BaseModel, Field


class ValidateLearningLevelRequest(BaseModel):
    level: str = Field(..., min_length=1)


class ValidateLearningLevelResponse(BaseModel):
    valid: bool
    level: str
    meaning: Optional[str]
    flags: list[str]
    recommendations: list[str]

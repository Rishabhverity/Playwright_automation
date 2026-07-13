from fastapi import FastAPI

from app.schemas import ValidateLearningLevelRequest, ValidateLearningLevelResponse
from app.validator import validate_learning_level

app = FastAPI(title="Learning Level Validator")


@app.post("/validate-learning-level", response_model=ValidateLearningLevelResponse)
def validate_level(request: ValidateLearningLevelRequest) -> ValidateLearningLevelResponse:
    result = validate_learning_level(request.level)
    return ValidateLearningLevelResponse(**result)

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.validator import validate_learning_level

client = TestClient(app)


@pytest.mark.parametrize(
    ("level", "expected_meaning"),
    [
        ("K1", "Remember"),
        ("K2", "Understand"),
        ("K3", "Apply"),
        ("K4", "Analyze"),
        ("K5", "Evaluate"),
        ("K6", "Create"),
    ],
)
def test_valid_levels_return_correct_meaning(level: str, expected_meaning: str) -> None:
    result = validate_learning_level(level)

    assert result["valid"] is True
    assert result["level"] == level
    assert result["meaning"] == expected_meaning
    assert result["flags"] == []
    assert result["recommendations"] == []


@pytest.mark.parametrize(
    ("level", "expected_meaning"),
    [
        ("K1", "Remember"),
        ("K2", "Understand"),
        ("K3", "Apply"),
        ("K4", "Analyze"),
        ("K5", "Evaluate"),
        ("K6", "Create"),
    ],
)
def test_endpoint_valid_levels(level: str, expected_meaning: str) -> None:
    response = client.post("/validate-learning-level", json={"level": level})

    assert response.status_code == 200
    assert response.json() == {
        "valid": True,
        "level": level,
        "meaning": expected_meaning,
        "flags": [],
        "recommendations": [],
    }


def test_invalid_level_returns_invalid_learning_level_flag() -> None:
    result = validate_learning_level("Beginner")

    assert result["valid"] is False
    assert result["level"] == "Beginner"
    assert result["meaning"] is None
    assert result["flags"] == ["invalid_learning_level"]
    assert result["recommendations"] == ["Use one of K1, K2, K3, K4, K5, K6."]


def test_endpoint_invalid_level() -> None:
    response = client.post("/validate-learning-level", json={"level": "Beginner"})

    assert response.status_code == 200
    assert response.json() == {
        "valid": False,
        "level": "Beginner",
        "meaning": None,
        "flags": ["invalid_learning_level"],
        "recommendations": ["Use one of K1, K2, K3, K4, K5, K6."],
    }


def test_empty_level_returns_validation_error() -> None:
    response = client.post("/validate-learning-level", json={"level": ""})

    assert response.status_code == 422

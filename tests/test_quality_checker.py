import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.quality_checker import check_learning_unit_quality
from app.schemas import LearningUnitInput

client = TestClient(app)


def _base_unit(**overrides) -> LearningUnitInput:
    payload = {
        "unit_id": "unit-test",
        "title": "Explain AI in daily life",
        "concept": "AI in daily life",
        "level": "K2",
        "outcome": "Explain the role of AI in daily life using common examples.",
        "estimated_minutes": 15,
        "source_locator": "pages 2-4",
        "validation_flags": [],
    }
    payload.update(overrides)
    return LearningUnitInput(**payload)


def test_valid_learning_unit_returns_pass_and_score_100():
    result = check_learning_unit_quality(_base_unit())

    assert result.valid is True
    assert result.severity == "pass"
    assert result.quality_score == 100
    assert result.flags == []
    assert result.recommendations == []


def test_missing_title_returns_error():
    result = check_learning_unit_quality(_base_unit(title=""))

    assert result.valid is False
    assert result.severity == "error"
    assert "missing_title" in result.flags


def test_invalid_level_returns_error():
    result = check_learning_unit_quality(_base_unit(level="K9"))

    assert result.valid is False
    assert result.severity == "error"
    assert "invalid_level" in result.flags


def test_outcome_below_20_characters_returns_error():
    result = check_learning_unit_quality(_base_unit(outcome="Too short outcome."))

    assert result.valid is False
    assert result.severity == "error"
    assert "outcome_too_short" in result.flags


def test_duration_below_5_returns_error():
    result = check_learning_unit_quality(_base_unit(estimated_minutes=4))

    assert result.valid is False
    assert result.severity == "error"
    assert "duration_too_short" in result.flags


def test_duration_above_25_returns_error():
    result = check_learning_unit_quality(_base_unit(estimated_minutes=26))

    assert result.valid is False
    assert result.severity == "error"
    assert "duration_too_long" in result.flags


def test_duration_between_21_and_25_returns_warning():
    result = check_learning_unit_quality(_base_unit(estimated_minutes=22))

    assert result.valid is True
    assert result.severity == "warning"
    assert "duration_outside_target_range" in result.flags


def test_missing_source_locator_returns_warning():
    result = check_learning_unit_quality(_base_unit(source_locator=None))

    assert result.valid is True
    assert result.severity == "warning"
    assert "missing_source_locator" in result.flags


def test_title_without_action_verb_returns_warning():
    result = check_learning_unit_quality(_base_unit(title="AI in daily life"))

    assert result.valid is True
    assert result.severity == "warning"
    assert "title_missing_action_verb" in result.flags


def test_existing_validation_flags_are_carried_forward():
    result = check_learning_unit_quality(
        _base_unit(validation_flags=["prior_issue_flag"])
    )

    assert "prior_issue_flag" in result.flags
    assert result.severity == "warning"
    assert result.quality_score == 90


def test_quality_score_reduces_for_warnings_and_errors():
    warning_result = check_learning_unit_quality(
        _base_unit(
            title="AI in daily life",
            source_locator=None,
            estimated_minutes=22,
        )
    )
    assert warning_result.quality_score == 70

    error_result = check_learning_unit_quality(
        _base_unit(title="", estimated_minutes=3)
    )
    assert error_result.quality_score <= 40


def test_endpoint_returns_success_for_valid_unit():
    response = client.post(
        "/check-learning-unit-quality",
        json={
            "unit_id": "unit-001",
            "title": "Explain AI in daily life",
            "concept": "AI in daily life",
            "level": "K2",
            "outcome": "Explain the role of AI in daily life using common examples.",
            "estimated_minutes": 15,
            "source_locator": "pages 2-4",
            "validation_flags": [],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["severity"] == "pass"
    assert data["quality_score"] == 100

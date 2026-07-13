# Learning Unit Quality Checker

A small standalone FastAPI service that validates whether a generated learning unit is complete, clear, and review-ready.

## Features

- Single POST endpoint for quality validation
- Rule-based checks for title, concept, level, outcome, duration, and source locator
- Severity levels: `pass`, `warning`, and `error`
- Quality score from 0–100 based on errors and warnings
- Pytest test suite

## Project Structure

```
learning-unit-quality-checker/
  app/
    __init__.py
    main.py
    schemas.py
    quality_checker.py
  tests/
    test_quality_checker.py
  sample_inputs/
    valid_learning_unit.json
    warning_learning_unit.json
    invalid_learning_unit.json
  requirements.txt
  README.md
```

## Setup

1. Create and activate a virtual environment (recommended):

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Run the Service

From the `learning-unit-quality-checker` directory:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://127.0.0.1:8000`.

Interactive docs: `http://127.0.0.1:8000/docs`

## Sample Request

**POST** `/check-learning-unit-quality`

```json
{
  "unit_id": "unit-001",
  "title": "Explain AI in daily life",
  "concept": "AI in daily life",
  "level": "K2",
  "outcome": "Explain the role of AI in daily life using common examples.",
  "estimated_minutes": 15,
  "source_locator": "pages 2-4",
  "validation_flags": []
}
```

**Success response:**

```json
{
  "valid": true,
  "severity": "pass",
  "quality_score": 100,
  "flags": [],
  "recommendations": []
}
```

## Warning Example

Sample input: `sample_inputs/warning_learning_unit.json`

```json
{
  "unit_id": "unit-002",
  "title": "AI in daily life",
  "concept": "AI in daily life",
  "level": "K2",
  "outcome": "Explain the role of AI in daily life using common examples.",
  "estimated_minutes": 22,
  "source_locator": null,
  "validation_flags": []
}
```

**Response:**

```json
{
  "valid": true,
  "severity": "warning",
  "quality_score": 70,
  "flags": [
    "title_missing_action_verb",
    "duration_outside_target_range",
    "missing_source_locator"
  ],
  "recommendations": [
    "Start the title with an action verb such as Explain, Describe, Identify, Apply, Analyze, Compare, Design, Evaluate, or Create.",
    "Recommended duration is between 10 and 20 minutes.",
    "Add a source locator such as page number or section reference."
  ]
}
```

## Validation Rules

| Rule | Type |
|------|------|
| Title is required | Error |
| Concept is required | Error |
| Level is required and must be K1–K6 | Error |
| Outcome is required and at least 20 characters | Error |
| Estimated minutes is required | Error |
| Duration below 5 or above 25 minutes | Error |
| Duration outside 10–20 minutes | Warning |
| Source locator missing | Warning |
| Title should start with an action verb | Warning |
| Concept longer than 80 characters | Warning |
| Outcome same as title | Warning |
| Existing `validation_flags` are carried forward | Warning |

## Severity and Scoring

- **Error:** `valid=false`, `severity=error`
- **Warning only:** `valid=true`, `severity=warning`
- **No issues:** `valid=true`, `severity=pass`

Quality score starts at 100:

- −30 points per error
- −10 points per warning
- Minimum score is 0

## Run Tests

```bash
pytest -v
```

## Health Check

**GET** `/health` returns `{"status": "ok"}`.

## cURL Example

```bash
curl -X POST "http://127.0.0.1:8000/check-learning-unit-quality" \
  -H "Content-Type: application/json" \
  -d @sample_inputs/valid_learning_unit.json
```

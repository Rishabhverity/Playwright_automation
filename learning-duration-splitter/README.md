# Learning Duration Splitter

A small standalone FastAPI service that splits a topic's total estimated duration into reasonable learning unit durations for course design.

## Purpose

Large topics are often broken into smaller learning units. Each unit should ideally be easy to teach, review, and reuse. This service takes a total duration and unit count, then returns a balanced split with validation feedback.

## Setup

1. Create and activate a virtual environment (recommended):

   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # macOS / Linux
   source venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

## Run the Service

From the `learning-duration-splitter` directory:

```bash
python -m uvicorn app.main:app --reload
```

On Windows, if `uvicorn` is not recognized, use `python -m uvicorn` (as shown above) instead of calling `uvicorn` directly.

If port `8000` is blocked, use another port:

```bash
python -m uvicorn app.main:app --reload --port 8080
```

The API will be available at `http://127.0.0.1:8000` (or your chosen port).

Interactive docs: `http://127.0.0.1:8000/docs`

## API

### POST /split-learning-duration

**Request:**

```json
{
  "total_minutes": 60,
  "unit_count": 4
}
```

**Success response (ideal split):**

```json
{
  "valid": true,
  "severity": "pass",
  "durations": [15, 15, 15, 15],
  "flags": [],
  "recommendations": []
}
```

**Warning response (valid but outside ideal 10-20 minute range):**

```json
{
  "valid": true,
  "severity": "warning",
  "durations": [5],
  "flags": ["outside_ideal_range"],
  "recommendations": [
    "Aim for 10-20 minutes per unit; adjust total_minutes or unit_count to better fit the ideal range."
  ]
}
```

**Error response (unit below 5 or above 25 minutes):**

```json
{
  "valid": false,
  "severity": "error",
  "durations": [4, 3, 3],
  "flags": ["unit_duration_below_minimum"],
  "recommendations": [
    "Reduce unit_count or increase total_minutes so each unit is at least 5 minutes (shortest unit is 3 minutes)."
  ]
}
```

### Validation rules

- `total_minutes` is required and must be at least 5
- `unit_count` is required and must be greater than 0
- Ideal unit duration: 10-20 minutes (`severity: pass`)
- Acceptable unit duration: 5-25 minutes
- Outside ideal range returns `severity: warning`
- Any unit below 5 or above 25 returns `severity: error` with `valid: false`

Invalid input (e.g. `unit_count: 0` or `total_minutes: 4`) returns HTTP `422`.

### Sample curl request

```bash
curl -X POST http://127.0.0.1:8000/split-learning-duration \
  -H "Content-Type: application/json" \
  -d "{\"total_minutes\": 60, \"unit_count\": 4}"
```

## Project Structure

```
learning-duration-splitter/
  app/
    __init__.py
    main.py
    models.py
    splitter.py
  requirements.txt
  README.md
```

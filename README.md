# Learning Level Validator

A small standalone FastAPI service that validates learning levels (K1–K6) and returns their Bloom's taxonomy meaning.

## Learning Levels

| Level | Meaning    |
|-------|------------|
| K1    | Remember   |
| K2    | Understand |
| K3    | Apply      |
| K4    | Analyze    |
| K5    | Evaluate   |
| K6    | Create     |

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

From the `learning-level-validator` directory:

```bash
python -m uvicorn app.main:app --reload
```

On Windows, if `uvicorn` or `pytest` is not recognized, always use `python -m` (as shown above) instead of calling them directly.

The API will be available at `http://127.0.0.1:8000`.

Interactive docs: `http://127.0.0.1:8000/docs`

## API

### POST /validate-learning-level

**Request:**

```json
{
  "level": "K3"
}
```

**Success response (valid level):**

```json
{
  "valid": true,
  "level": "K3",
  "meaning": "Apply",
  "flags": [],
  "recommendations": []
}
```

**Response (invalid level):**

```json
{
  "valid": false,
  "level": "Beginner",
  "meaning": null,
  "flags": ["invalid_learning_level"],
  "recommendations": ["Use one of K1, K2, K3, K4, K5, K6."]
}
```

**Validation error (empty level):**

Sending an empty `level` returns HTTP `422` with a Pydantic validation error.

### Sample curl requests

Valid level:

```bash
curl -X POST http://127.0.0.1:8000/validate-learning-level \
  -H "Content-Type: application/json" \
  -d "{\"level\": \"K3\"}"
```

Invalid level:

```bash
curl -X POST http://127.0.0.1:8000/validate-learning-level \
  -H "Content-Type: application/json" \
  -d "{\"level\": \"Beginner\"}"
```

## Run Tests

From the `learning-level-validator` directory:

```bash
python -m pytest
```

Run with verbose output:

```bash
python -m pytest -v
```

## Project Structure

```
learning-level-validator/
  app/
    __init__.py
    main.py
    schemas.py
    validator.py
  tests/
    test_validator.py
  requirements.txt
  README.md
```

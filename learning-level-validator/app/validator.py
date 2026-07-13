LEARNING_LEVELS = {
    "K1": "Remember",
    "K2": "Understand",
    "K3": "Apply",
    "K4": "Analyze",
    "K5": "Evaluate",
    "K6": "Create",
}

RECOMMENDATION = "Use one of K1, K2, K3, K4, K5, K6."


def validate_learning_level(level: str) -> dict:
    meaning = LEARNING_LEVELS.get(level)
    if meaning is not None:
        return {
            "valid": True,
            "level": level,
            "meaning": meaning,
            "flags": [],
            "recommendations": [],
        }
    return {
        "valid": False,
        "level": level,
        "meaning": None,
        "flags": ["invalid_learning_level"],
        "recommendations": [RECOMMENDATION],
    }

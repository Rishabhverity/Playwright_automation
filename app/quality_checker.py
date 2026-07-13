from app.schemas import ACTION_VERBS, VALID_LEVELS, LearningUnitInput, QualityCheckResponse

ERROR_PENALTY = 30
WARNING_PENALTY = 10

RECOMMENDATIONS: dict[str, str] = {
    "missing_title": "Provide a title for the learning unit.",
    "missing_concept": "Provide a concept for the learning unit.",
    "missing_level": "Provide a level for the learning unit.",
    "invalid_level": "Level must be one of K1, K2, K3, K4, K5, or K6.",
    "missing_outcome": "Provide a learning outcome for the unit.",
    "outcome_too_short": "Outcome must be at least 20 characters long.",
    "missing_estimated_minutes": "Provide an estimated duration in minutes.",
    "duration_too_short": "Estimated duration must be at least 5 minutes.",
    "duration_too_long": "Estimated duration must not exceed 25 minutes.",
    "duration_outside_target_range": "Recommended duration is between 10 and 20 minutes.",
    "missing_source_locator": "Add a source locator such as page number or section reference.",
    "title_missing_action_verb": (
        "Start the title with an action verb such as Explain, Describe, Identify, "
        "Apply, Analyze, Compare, Design, Evaluate, or Create."
    ),
    "concept_too_long": "Keep the concept concise (80 characters or fewer).",
    "outcome_same_as_title": "Outcome should describe what learners will achieve, not repeat the title.",
}


def _is_blank(value: str | None) -> bool:
    return value is None or not str(value).strip()


def _title_starts_with_action_verb(title: str) -> bool:
    first_word = title.strip().split()[0] if title.strip() else ""
    return first_word.capitalize() in ACTION_VERBS


def _dedupe_flags(flags: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for flag in flags:
        if flag and flag not in seen:
            seen.add(flag)
            ordered.append(flag)
    return ordered


def check_learning_unit_quality(unit: LearningUnitInput) -> QualityCheckResponse:
    errors: list[str] = []
    warnings: list[str] = []

    if _is_blank(unit.title):
        errors.append("missing_title")
    elif not _title_starts_with_action_verb(unit.title):
        warnings.append("title_missing_action_verb")

    if _is_blank(unit.concept):
        errors.append("missing_concept")
    elif len(unit.concept.strip()) > 80:
        warnings.append("concept_too_long")

    if _is_blank(unit.level):
        errors.append("missing_level")
    elif unit.level.strip() not in VALID_LEVELS:
        errors.append("invalid_level")

    if _is_blank(unit.outcome):
        errors.append("missing_outcome")
    elif len(unit.outcome.strip()) < 20:
        errors.append("outcome_too_short")

    if unit.estimated_minutes is None:
        errors.append("missing_estimated_minutes")
    else:
        minutes = unit.estimated_minutes
        if minutes < 5:
            errors.append("duration_too_short")
        elif minutes > 25:
            errors.append("duration_too_long")
        elif minutes < 10 or minutes > 20:
            warnings.append("duration_outside_target_range")

    if _is_blank(unit.source_locator):
        warnings.append("missing_source_locator")

    if (
        not _is_blank(unit.title)
        and not _is_blank(unit.outcome)
        and unit.title.strip().lower() == unit.outcome.strip().lower()
    ):
        warnings.append("outcome_same_as_title")

    carried_flags = [flag for flag in unit.validation_flags if flag]
    error_set = set(errors)
    warning_set = set(warnings) | (set(carried_flags) - error_set)
    all_flags = _dedupe_flags(carried_flags + errors + warnings)

    if errors:
        severity = "error"
        valid = False
    elif warning_set:
        severity = "warning"
        valid = True
    else:
        severity = "pass"
        valid = True

    score = 100 - (len(error_set) * ERROR_PENALTY) - (len(warning_set) * WARNING_PENALTY)
    score = max(score, 0)

    recommendations = [RECOMMENDATIONS[flag] for flag in all_flags if flag in RECOMMENDATIONS]

    return QualityCheckResponse(
        valid=valid,
        severity=severity,
        quality_score=score,
        flags=all_flags,
        recommendations=recommendations,
    )

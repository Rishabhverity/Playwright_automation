IDEAL_MIN = 10
IDEAL_MAX = 20
ABSOLUTE_MIN = 5
ABSOLUTE_MAX = 25


def split_duration(total_minutes: int, unit_count: int) -> list[int]:
    base, remainder = divmod(total_minutes, unit_count)
    return [base + (1 if i < remainder else 0) for i in range(unit_count)]


def evaluate_split(durations: list[int]) -> tuple[bool, str, list[str], list[str]]:
    flags: list[str] = []
    recommendations: list[str] = []

    below_min = [d for d in durations if d < ABSOLUTE_MIN]
    above_max = [d for d in durations if d > ABSOLUTE_MAX]
    outside_ideal = [d for d in durations if d < IDEAL_MIN or d > IDEAL_MAX]

    if below_min:
        flags.append("unit_duration_below_minimum")
        recommendations.append(
            f"Reduce unit_count or increase total_minutes so each unit is at least "
            f"{ABSOLUTE_MIN} minutes (shortest unit is {min(durations)} minutes)."
        )

    if above_max:
        flags.append("unit_duration_above_maximum")
        recommendations.append(
            f"Increase unit_count or reduce total_minutes so each unit is at most "
            f"{ABSOLUTE_MAX} minutes (longest unit is {max(durations)} minutes)."
        )

    if below_min or above_max:
        return False, "error", flags, recommendations

    if outside_ideal:
        flags.append("outside_ideal_range")
        recommendations.append(
            f"Aim for {IDEAL_MIN}-{IDEAL_MAX} minutes per unit; adjust total_minutes "
            f"or unit_count to better fit the ideal range."
        )
        return True, "warning", flags, recommendations

    return True, "pass", flags, recommendations

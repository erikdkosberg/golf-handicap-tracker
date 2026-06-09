import datetime
import math
from dataclasses import dataclass
from typing import Optional


def round_sort_key(round_obj) -> tuple:
    """Stable chronological sort key; handles unsaved rounds (id=None)."""
    rd = round_obj.date or datetime.date.min
    rid = round_obj.id if round_obj.id is not None else 0
    return (rd, rid)

# Approximation of the WHS "Player Equation" for expected 9-hole score
# differentials at a course of standard difficulty. Derived from USGA examples:
# HI 14.0 -> 8.5, HI 15.0 -> 9.0, HI 16.0 -> 9.52
_EXPECTED_9_LOOKUP = {
    -5.0: -1.2,
    0.0: 1.4,
    5.0: 3.9,
    10.0: 6.5,
    14.0: 8.5,
    15.0: 9.0,
    16.0: 9.52,
    20.0: 11.6,
    25.0: 14.1,
    30.0: 16.7,
    36.0: 19.7,
    54.0: 28.9,
}


def effective_hole_count(round_obj) -> int:
    """Return 9 or 18, inferring from stored data when hole_count is missing."""
    if round_obj.hole_count in (9, 18):
        return round_obj.hole_count
    if round_obj.par is not None and round_obj.par <= 36:
        return 9
    if round_obj.course_rating is not None and round_obj.course_rating < 50:
        return 9
    return 18


def round_score_differential(score, course_rating, course_slope) -> float:
    """Raw score differential (unrounded)."""
    return (score - course_rating) * 113 / course_slope


def round_to_tenth(value: float) -> float:
    """Round to nearest tenth; .5 rounds upward (WHS Rule 5.1)."""
    return math.floor(value * 10 + 0.5) / 10


def truncate_handicap_index(value: float) -> float:
    """Truncate Handicap Index to one decimal (WHS Rule 5.2)."""
    return math.trunc(value * 10) / 10


def expected_9_hole_differential(handicap_index: float) -> float:
    """Expected 9-hole score differential for a given Handicap Index."""
    if handicap_index is None:
        handicap_index = 10.0

    keys = sorted(_EXPECTED_9_LOOKUP.keys())
    if handicap_index <= keys[0]:
        return _EXPECTED_9_LOOKUP[keys[0]]
    if handicap_index >= keys[-1]:
        return _EXPECTED_9_LOOKUP[keys[-1]]

    for lo, hi in zip(keys, keys[1:]):
        if lo <= handicap_index <= hi:
            ratio = (handicap_index - lo) / (hi - lo)
            return _EXPECTED_9_LOOKUP[lo] + ratio * (
                _EXPECTED_9_LOOKUP[hi] - _EXPECTED_9_LOOKUP[lo]
            )
    return handicap_index * 0.51 + 1.36


def differentials_to_use_count(total: int) -> int:
    """How many lowest differentials to use (WHS Rule 5.2a)."""
    if total < 3:
        return 0
    if total <= 5:
        return 1
    if total <= 8:
        return 2
    if total <= 11:
        return 3
    if total <= 14:
        return 4
    if total <= 16:
        return 5
    if total <= 18:
        return 6
    if total == 19:
        return 7
    return 8


STANDARD_PAR = 72
STANDARD_COURSE_RATING = 72.0
STANDARD_COURSE_SLOPE = 113


@dataclass
class HandicapResult:
    handicap_index: Optional[float]
    max_diff_used: Optional[float]
    improvement_cutoff: Optional[float]
    maintain_cutoff: Optional[float]
    score_differentials: list
    handicap_round_ids: set
    used_differential_count: int


def _index_from_recent_differentials(recent_diffs: list[float]) -> Optional[float]:
    count = differentials_to_use_count(len(recent_diffs))
    if count == 0:
        return None
    lowest = sorted(recent_diffs)[:count]
    avg = sum(lowest) / count
    return truncate_handicap_index(avg * 0.96)


def score_for_differential(
    differential: float,
    course_rating: float = STANDARD_COURSE_RATING,
    course_slope: int = STANDARD_COURSE_SLOPE,
) -> int:
    """Convert a score differential to an 18-hole gross score."""
    return round(differential * course_slope / 113 + course_rating)


def compute_maintain_cutoff(
    entries: list[tuple],
    current_hi: Optional[float],
    improvement_cutoff: Optional[float],
) -> Optional[float]:
    """
    Max differential for the next round that keeps handicap from increasing,
    when the oldest round in the 20-round window counts toward the index.
    """
    if len(entries) < 20 or current_hi is None or improvement_cutoff is None:
        return None

    dropping_diff = entries[-20][1]
    if dropping_diff > improvement_cutoff:
        return None

    base_diffs = [d for _, d in entries[-20:]][1:]
    best = None
    for tenths in range(0, 600):
        candidate = tenths / 10.0
        new_hi = _index_from_recent_differentials(base_diffs + [candidate])
        if new_hi is not None and new_hi <= current_hi:
            best = candidate

    return round_to_tenth(best) if best is not None else None


def build_score_differentials(rounds_chronological) -> list[tuple]:
    """
    Process rounds oldest-first and return [(round_obj, differential), ...].
    Applies WHS 9-hole expected-score rules once 54 holes have been posted.
    """
    valid_rounds = [
        r
        for r in rounds_chronological
        if r.course_rating is not None and r.course_slope is not None
    ]
    total_holes = sum(effective_hole_count(r) for r in valid_rounds)
    use_nine_hole_expected = total_holes >= 54

    entries = []
    for rnd in valid_rounds:
        hole_count = effective_hole_count(rnd)

        if hole_count == 18:
            diff = round_to_tenth(
                round_score_differential(rnd.score, rnd.course_rating, rnd.course_slope)
            )
            entries.append((rnd, diff))
            continue

        if hole_count == 9 and use_nine_hole_expected:
            prior_diffs = [d for _, d in entries]
            recent = prior_diffs[-20:]
            current_hi = _index_from_recent_differentials(recent)
            if current_hi is None:
                current_hi = 10.0

            nine_diff = round_score_differential(
                rnd.score, rnd.course_rating, rnd.course_slope
            )
            expected = expected_9_hole_differential(current_hi)
            combined = round_to_tenth(nine_diff + expected)
            entries.append((rnd, combined))

    return entries


def calculate_handicap(rounds) -> tuple[Optional[float], Optional[float]]:
    """Backward-compatible API: returns (handicap_index, max_diff_used)."""
    result = compute_handicap(rounds)
    return result.handicap_index, result.max_diff_used


def compute_handicap(
    rounds,
    *,
    chronological=None,
    entries=None,
) -> HandicapResult:
    """Compute Handicap Index and related metadata from a user's rounds."""
    if not rounds:
        return HandicapResult(None, None, None, None, [], set(), 0)

    if chronological is None:
        chronological = sorted(rounds, key=round_sort_key)
    if entries is None:
        entries = build_score_differentials(chronological)

    if not entries:
        return HandicapResult(None, None, None, None, entries, set(), 0)

    recent_entries = entries[-20:]
    recent_diffs = [d for _, d in recent_entries]
    use_count = differentials_to_use_count(len(recent_diffs))

    if use_count == 0:
        return HandicapResult(None, None, None, None, entries, set(), 0)

    lowest = sorted(recent_diffs)[:use_count]
    avg = sum(lowest) / use_count
    handicap_index = truncate_handicap_index(avg * 0.96)
    max_diff_used = max(lowest)
    improvement_cutoff = max_diff_used
    maintain_cutoff = compute_maintain_cutoff(
        entries, handicap_index, improvement_cutoff
    )

    handicap_round_ids = {rnd.id for rnd, _ in recent_entries}

    return HandicapResult(
        handicap_index=handicap_index,
        max_diff_used=max_diff_used,
        improvement_cutoff=improvement_cutoff,
        maintain_cutoff=maintain_cutoff,
        score_differentials=entries,
        handicap_round_ids=handicap_round_ids,
        used_differential_count=use_count,
    )


def differential_for_round(round_obj, rounds_before) -> Optional[float]:
    """Score differential for a single round given all prior rounds."""
    if round_obj.course_rating is None or round_obj.course_slope is None:
        return None

    hole_count = effective_hole_count(round_obj)
    if hole_count == 18:
        return round_to_tenth(
            round_score_differential(
                round_obj.score, round_obj.course_rating, round_obj.course_slope
            )
        )

    holes_before = sum(effective_hole_count(r) for r in rounds_before)
    if holes_before + hole_count < 54:
        return None

    prior_entries = build_score_differentials(
        sorted(rounds_before, key=round_sort_key)
    )
    prior_diffs = [d for _, d in prior_entries][-20:]
    current_hi = _index_from_recent_differentials(prior_diffs) or 10.0

    nine_diff = round_score_differential(
        round_obj.score, round_obj.course_rating, round_obj.course_slope
    )
    expected = expected_9_hole_differential(current_hi)
    return round_to_tenth(nine_diff + expected)


def has_hole_by_hole_data(round_obj) -> bool:
    hole_scores = round_obj.hole_scores
    if not hole_scores:
        return False
    if isinstance(hole_scores, dict):
        return len(hole_scores) > 0
    if isinstance(hole_scores, list):
        return len(hole_scores) > 0
    return False


def lowest_18_hole_round_to_par(rounds):
    """Best score relative to par among 18-hole rounds only."""
    candidates = [
        r
        for r in rounds
        if effective_hole_count(r) == 18
        and r.par is not None
        and r.score is not None
    ]
    if not candidates:
        return None
    best = min(candidates, key=lambda r: r.score - r.par)
    return {
        "score": best.score,
        "par": best.par,
        "to_par": best.score - best.par,
        "date": best.date.strftime("%Y-%m-%d"),
        "course": best.course,
        "tees": best.tees,
    }


def count_score_types(hole_scores):
    birdies = pars = bogeys = double_or_worse = 0
    if not hole_scores:
        return birdies, pars, bogeys, double_or_worse

    holes = hole_scores.values() if isinstance(hole_scores, dict) else hole_scores
    for hole in holes:
        if not hole or not isinstance(hole, dict):
            continue
        score = hole.get("score")
        par = hole.get("par")
        if not isinstance(score, (int, float)) or not isinstance(par, (int, float)):
            continue
        diff = score - par
        if diff == -1:
            birdies += 1
        elif diff == 0:
            pars += 1
        elif diff == 1:
            bogeys += 1
        elif diff >= 2:
            double_or_worse += 1
    return birdies, pars, bogeys, double_or_worse


def _build_chart_data(chronological_rounds, entries):
    """Last 20 eighteen-hole rounds with score, differential, and handicap after each."""
    entry_idx_by_id = {rnd.id: i for i, (rnd, _) in enumerate(entries)}
    eighteen_hole = [
        r
        for r in chronological_rounds
        if effective_hole_count(r) == 18
        and r.course_rating is not None
        and r.course_slope is not None
    ]
    last_20 = eighteen_hole[-20:]

    chart_data = []
    for rnd in last_20:
        idx = entry_idx_by_id.get(rnd.id)
        if idx is None:
            continue
        diff = entries[idx][1]
        diffs_through = [d for _, d in entries[: idx + 1]][-20:]
        hi = _index_from_recent_differentials(diffs_through)
        chart_data.append(
            {
                "date": rnd.date.strftime("%Y-%m-%d"),
                "score": rnd.score,
                "differential": diff,
                "handicap": hi,
            }
        )
    return chart_data


def compute_dashboard_stats(
    rounds,
    *,
    chronological=None,
    entries=None,
):
    """Aggregate stats for the dashboard, computed server-side."""
    if not rounds:
        return {}

    if chronological is None:
        chronological = sorted(rounds, key=round_sort_key)
    if entries is None:
        entries = build_score_differentials(chronological)
    diff_by_id = {rnd.id: diff for rnd, diff in entries}
    entry_idx_by_id = {rnd.id: i for i, (rnd, _) in enumerate(entries)}

    recent_entries = entries[-20:]
    recent_diffs = [d for _, d in recent_entries]
    use_count = differentials_to_use_count(len(recent_diffs))
    lowest_used = (
        sorted(recent_diffs)[:use_count] if use_count else []
    )
    cutoff = max(lowest_used) if lowest_used else None
    highlighted_ids = set()
    if cutoff is not None:
        highlighted_ids = {
            rnd.id for rnd, diff in recent_entries if diff <= cutoff
        }

    lowest_diff = min((d for _, d in entries), default=None)
    avg_diff_20 = (
        sum(recent_diffs) / len(recent_diffs) if recent_diffs else None
    )

    sorted_by_date_desc = sorted(rounds, key=round_sort_key, reverse=True)
    last_10 = sorted_by_date_desc[:10]
    last_10_chrono = sorted(last_10, key=round_sort_key)

    trend_handicaps = []
    for rnd in last_10_chrono:
        idx = entry_idx_by_id.get(rnd.id)
        if idx is None:
            trend_handicaps.append(None)
            continue
        prior_diffs = [d for _, d in entries[:idx]][-20:]
        hi = _index_from_recent_differentials(prior_diffs)
        if hi is None and rnd.id in diff_by_id:
            hi = truncate_handicap_index(diff_by_id[rnd.id] * 0.96)
        trend_handicaps.append(hi)

    handicap_trend = None
    valid_trend = [h for h in trend_handicaps if h is not None]
    if len(valid_trend) > 1:
        handicap_trend = round(valid_trend[-1] - valid_trend[0], 2)

    chart_data = _build_chart_data(chronological, entries)

    last_20_with_scores = [
        r
        for r in sorted_by_date_desc
        if has_hole_by_hole_data(r)
    ][:20]

    total_birdies = total_pars = total_bogeys = total_dbl = 0
    for rnd in last_20_with_scores:
        b, p, bg, d = count_score_types(rnd.hole_scores)
        total_birdies += b
        total_pars += p
        total_bogeys += bg
        total_dbl += d

    score_round_count = len(last_20_with_scores) or 1

    return {
        "lowest_differential": lowest_diff,
        "average_differential_20": avg_diff_20,
        "handicap_trend_10": handicap_trend,
        "improvement_cutoff": cutoff,
        "highlighted_round_ids": list(highlighted_ids),
        "chart_data": chart_data,
        "avg_birdies": round(total_birdies / score_round_count, 2),
        "avg_pars": round(total_pars / score_round_count, 2),
        "avg_bogeys": round(total_bogeys / score_round_count, 2),
        "avg_double_or_worse": round(total_dbl / score_round_count, 2),
        "lowest_round_to_par": lowest_18_hole_round_to_par(rounds),
        "differentials_by_id": diff_by_id,
    }

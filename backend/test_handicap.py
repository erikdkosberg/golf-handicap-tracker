import unittest
from datetime import date
from types import SimpleNamespace

from handicap import (
    build_score_differentials,
    compute_handicap,
    differentials_to_use_count,
    effective_hole_count,
    expected_9_hole_differential,
    lowest_18_hole_round_to_par,
    round_to_tenth,
    truncate_handicap_index,
)


def make_round(
    id,
    score,
    cr,
    sr,
    dt,
    hole_count=None,
    par=None,
    hole_scores=None,
):
    return SimpleNamespace(
        id=id,
        score=score,
        course_rating=cr,
        course_slope=sr,
        date=dt,
        hole_count=hole_count,
        par=par,
        hole_scores=hole_scores,
        course="Test",
        tees="Blue",
    )


class HandicapTests(unittest.TestCase):
    def test_effective_hole_count_defaults_to_18(self):
        rnd = make_round(1, 80, 71.0, 125, date(2025, 1, 1), hole_count=None, par=72)
        self.assertEqual(effective_hole_count(rnd), 18)

    def test_effective_hole_count_infers_9_from_rating(self):
        rnd = make_round(1, 42, 35.7, 120, date(2025, 1, 1), hole_count=None, par=36)
        self.assertEqual(effective_hole_count(rnd), 9)

    def test_differentials_to_use_count(self):
        self.assertEqual(differentials_to_use_count(3), 1)
        self.assertEqual(differentials_to_use_count(6), 2)
        self.assertEqual(differentials_to_use_count(20), 8)

    def test_truncate_handicap_index(self):
        self.assertEqual(truncate_handicap_index(4.59), 4.5)
        self.assertEqual(truncate_handicap_index(4.51), 4.5)

    def test_round_to_tenth(self):
        self.assertEqual(round_to_tenth(5.45), 5.5)
        self.assertEqual(round_to_tenth(5.44), 5.4)

    def test_expected_9_hole_differential_known_points(self):
        self.assertAlmostEqual(expected_9_hole_differential(15.0), 9.0, places=1)
        self.assertAlmostEqual(expected_9_hole_differential(16.0), 9.52, places=1)

    def test_18_hole_handicap_from_three_rounds(self):
        rounds = [
            make_round(1, 85, 72.0, 113, date(2025, 1, 1), hole_count=18),
            make_round(2, 83, 72.0, 113, date(2025, 1, 2), hole_count=18),
            make_round(3, 81, 72.0, 113, date(2025, 1, 3), hole_count=18),
        ]
        result = compute_handicap(rounds)
        self.assertIsNotNone(result.handicap_index)
        self.assertEqual(result.used_differential_count, 1)

    def test_none_hole_count_rounds_counted_as_18(self):
        rounds = [
            make_round(1, 78, 71.2, 134, date(2025, 1, 1)),
            make_round(2, 77, 72.0, 129, date(2025, 1, 2)),
            make_round(3, 74, 71.0, 126, date(2025, 1, 3)),
        ]
        entries = build_score_differentials(rounds)
        self.assertEqual(len(entries), 3)

    def test_lowest_round_to_par_excludes_9_hole(self):
        rounds = [
            make_round(1, 38, 35.0, 120, date(2025, 1, 1), hole_count=9, par=36),
            make_round(2, 72, 70.0, 120, date(2025, 1, 2), hole_count=18, par=70),
            make_round(3, 80, 71.0, 120, date(2025, 1, 3), hole_count=18, par=72),
        ]
        best = lowest_18_hole_round_to_par(rounds)
        self.assertEqual(best["score"], 72)
        self.assertEqual(best["to_par"], 2)

    def test_improvement_cutoff_is_max_of_used_lowest(self):
        rounds = [
            make_round(i, 80 + i, 72.0, 113, date(2025, 1, i), hole_count=18)
            for i in range(1, 21)
        ]
        result = compute_handicap(rounds)
        self.assertIsNotNone(result.improvement_cutoff)
        self.assertEqual(result.improvement_cutoff, result.max_diff_used)


if __name__ == "__main__":
    unittest.main()

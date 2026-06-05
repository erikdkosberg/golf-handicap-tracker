"""Remove duplicate rounds (same user, date, score).

Keeps the best row per group: prefers hole-by-hole data, then rating/slope, then highest id.
Run: DATABASE_URL=... python dedupe_rounds.py [--dry-run]
"""

import sys
from collections import defaultdict

from dotenv import load_dotenv

load_dotenv()

from database import SessionLocal
from handicap import has_hole_by_hole_data
from models import Round


def _row_quality(r):
    """Higher is better when choosing which duplicate to keep."""
    return (
        has_hole_by_hole_data(r),
        r.course_rating is not None,
        r.course_slope is not None,
        r.course is not None,
        r.id,
    )


def dedupe_rounds(dry_run=False):
    db = SessionLocal()
    rounds = db.query(Round).order_by(Round.user_id, Round.date, Round.score, Round.id).all()
    groups = defaultdict(list)
    for r in rounds:
        groups[(r.user_id, r.date, r.score)].append(r)

    to_delete = []
    for group in groups.values():
        if len(group) < 2:
            continue
        keep = max(group, key=_row_quality)
        to_delete.extend(r for r in group if r.id != keep.id)

    print(f"Found {len(to_delete)} duplicate rows to remove")
    for r in to_delete:
        print(
            f"  DELETE id={r.id} user={r.user_id} date={r.date} "
            f"score={r.score} course={r.course!r}"
        )

    if dry_run:
        print("Dry run — no changes made.")
        db.close()
        return len(to_delete)

    for r in to_delete:
        db.delete(r)
    db.commit()
    db.close()
    print(f"Deleted {len(to_delete)} rows.")
    return len(to_delete)


if __name__ == "__main__":
    dedupe_rounds(dry_run="--dry-run" in sys.argv)

# load_to_neon.py
import json
from app import db, User, Round, app  # Adjust imports as needed

import datetime


def load_data():
    with open("data.json") as f:
        data = json.load(f)

    # Import users (as before)
    for u in data["users"]:
        u.pop("id", None)
        if not User.query.filter_by(email=u["email"]).first():
            db.session.add(User(**u))
    db.session.commit()

    # Map emails to user IDs (if you need to remap user_id references)
    email_to_user = {u.email: u.id for u in User.query.all()}

    # Import rounds
    for r in data["rounds"]:
        r.pop("id", None)
        # Convert date string to date object
        if isinstance(r["date"], str):
            try:
                r["date"] = datetime.datetime.strptime(r["date"], "%Y-%m-%d").date()
            except Exception:
                r["date"] = None
        # (Optional: remap user_id if user IDs changed)
        db.session.add(Round(**r))
    db.session.commit()


if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # Create tables if they don't exist
        load_data()

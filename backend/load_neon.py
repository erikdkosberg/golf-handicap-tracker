import datetime
import json

from database import SessionLocal, engine, Base
from models import Round, User


def load_data():
    db = SessionLocal()
    try:
        with open("data.json") as f:
            data = json.load(f)

        for u in data["users"]:
            u.pop("id", None)
            if not db.query(User).filter_by(email=u["email"]).first():
                db.add(User(**u))
        db.commit()

        for r in data["rounds"]:
            r.pop("id", None)
            if isinstance(r["date"], str):
                try:
                    r["date"] = datetime.datetime.strptime(
                        r["date"], "%Y-%m-%d"
                    ).date()
                except Exception:
                    r["date"] = None
            db.add(Round(**r))
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    load_data()

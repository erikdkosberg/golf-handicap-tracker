import json

from database import SessionLocal, engine, Base
from models import Round, User


def row_to_dict(row):
    d = dict(row.__dict__)
    d.pop("_sa_instance_state", None)
    if "date" in d and d["date"] is not None:
        d["date"] = d["date"].strftime("%Y-%m-%d")
    return d


def dump_data():
    db = SessionLocal()
    try:
        data = {
            "users": [row_to_dict(u) for u in db.query(User).all()],
            "rounds": [row_to_dict(r) for r in db.query(Round).all()],
        }
        with open("data.json", "w") as f:
            json.dump(data, f, indent=2)
    finally:
        db.close()


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    dump_data()

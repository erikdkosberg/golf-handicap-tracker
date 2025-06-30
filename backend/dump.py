from app import app, db, User, Round
import json


def row_to_dict(row):
    d = dict(row.__dict__)
    d.pop("_sa_instance_state", None)
    # Convert date fields to string
    if "date" in d and d["date"] is not None:
        d["date"] = d["date"].strftime("%Y-%m-%d")
    return d


def dump_data():
    data = {
        "users": [row_to_dict(u) for u in User.query.all()],
        "rounds": [row_to_dict(r) for r in Round.query.all()],
    }
    with open("data.json", "w") as f:
        json.dump(data, f, indent=2)


if __name__ == "__main__":
    with app.app_context():
        dump_data()

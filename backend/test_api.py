import os

import requests

host = os.environ.get("API_URL", "http://localhost:5050")
test_email = os.environ.get("TEST_EMAIL", "erik@example.com")
test_password = os.environ.get("TEST_PASSWORD", "test")


def login(email: str, password: str) -> str:
    res = requests.post(f"{host}/login", json={"email": email, "password": password})
    res.raise_for_status()
    return res.json()["token"]


def test_get_rounds(token: str):
    res = requests.get(f"{host}/rounds", headers={"Authorization": f"Bearer {token}"})
    if res.status_code != 200:
        raise Exception(f"Failed to get rounds: {res.status_code} {res.text}")
    return res.json()


if __name__ == "__main__":
    token = login(test_email, test_password)
    print(token)
    rounds = test_get_rounds(token)
    print(rounds)

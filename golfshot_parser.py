import os

from imapclient import IMAPClient
import pyzmail
import requests
from bs4 import BeautifulSoup

IMAP_HOST = os.environ.get("IMAP_HOST", "imap.gmail.com")
EMAIL = os.environ.get("GMAIL_EMAIL")
APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")
GOLFER_FIRST_NAME = os.environ.get("GOLFER_FIRST_NAME", "Erik")
BACKEND_URL = os.environ.get("BACKEND_URL")
PROCESSED_LABEL = "golfshot-processed"


def parse_golfshot_html(html, your_name):
    soup = BeautifulSoup(html, "lxml")
    info_cells = soup.find_all("td", {"valign": "top", "height": "25"})
    golfer = info_cells[0].get_text(strip=True) if len(info_cells) > 0 else None
    course = info_cells[1].get_text(strip=True) if len(info_cells) > 1 else None
    tees = info_cells[3].get_text(strip=True) if len(info_cells) > 3 else None
    date_and_location = info_cells[4].get_text(strip=True) if len(info_cells) > 4 else None
    date = date_and_location.split(",")[0].strip() if date_and_location else None

    score = None
    for row in soup.find_all("tr"):
        cell = row.find("span", string=lambda s: s and s.strip() == your_name)
        if cell:
            b_tags = row.find_all("b")
            if b_tags:
                score = b_tags[-1].get_text(strip=True)
            break

    hole_scores = []
    for row in soup.find_all("tr"):
        cell = row.find("span", string=lambda s: s and s.strip() == your_name)
        if cell:
            b_tags = row.find_all("b")
            hole_scores = [b.get_text(strip=True) for b in b_tags[:-1]]
            break

    return {
        "golfer": golfer,
        "course": course,
        "tees": tees,
        "date": date,
        "score": score,
        "hole_scores": hole_scores,
    }


def process_golfshot_emails():
    if not EMAIL or not APP_PASSWORD:
        raise RuntimeError(
            "Set GMAIL_EMAIL and GMAIL_APP_PASSWORD environment variables"
        )

    with IMAPClient(IMAP_HOST) as client:
        print("Logging into Gmail...")
        client.login(EMAIL, APP_PASSWORD)
        client.select_folder("INBOX", readonly=False)

        search_criteria = [
            "FROM",
            "support@golfshot.com",
            "SUBJECT",
            "Scorecard",
        ]
        messages = client.search(search_criteria)
        print(f"Found {len(messages)} unprocessed Golfshot email(s).")

        for uid in messages:
            raw_message = client.fetch([uid], ["BODY[]"])
            message = pyzmail.PyzMessage.factory(raw_message[uid][b"BODY[]"])
            html_content = None
            if message.html_part:
                html_content = message.html_part.get_payload().decode(
                    message.html_part.charset
                )
            elif message.text_part:
                html_content = message.text_part.get_payload().decode(
                    message.text_part.charset
                )
            else:
                continue

            fields = parse_golfshot_html(html_content, GOLFER_FIRST_NAME)
            print("Parsed round:", fields)

            if BACKEND_URL:
                try:
                    resp = requests.post(BACKEND_URL, json=fields)
                    print(f"Posted to backend: {resp.status_code} {resp.text}")
                except Exception as e:
                    print("Failed to post to backend:", e)


if __name__ == "__main__":
    process_golfshot_emails()

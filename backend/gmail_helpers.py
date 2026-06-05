import datetime
import os

from dotenv import load_dotenv

load_dotenv()

from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from sqlalchemy.orm import Session

from models import SyncProgress

GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
GOOGLE_CLIENT_SECRET = os.environ["GOOGLE_CLIENT_SECRET"]
GOOGLE_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI", "http://localhost:5050/oauth2callback"
)


def get_flow():
    return Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uris": [REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=GOOGLE_SCOPES,
        redirect_uri=REDIRECT_URI,
    )


def creds_to_token_data(creds):
    return {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": creds.scopes,
    }


def get_gmail_service(token_data):
    creds = Credentials(**token_data)
    return build("gmail", "v1", credentials=creds)


def set_sync_progress(db: Session, user_id, total, current):
    sp = db.query(SyncProgress).filter_by(user_id=user_id).first()
    if not sp:
        sp = SyncProgress(user_id=user_id, total_rounds=total, rounds_synced=current)
        db.add(sp)
    else:
        sp.total_rounds = total
        sp.rounds_synced = current
        sp.last_updated = datetime.datetime.utcnow()
    db.commit()


def clear_sync_progress(db: Session, user_id):
    db.query(SyncProgress).filter_by(user_id=user_id).delete()
    db.commit()

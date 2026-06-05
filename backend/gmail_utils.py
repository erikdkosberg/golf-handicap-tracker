import os
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

CLIENT_SECRETS_FILE = "client_secret.json"  # Google OAuth2 creds

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
REDIRECT_URI = "http://localhost:5000/oauth2callback"


def get_auth_flow():
    return Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )


def get_gmail_service(token_data):
    creds = Credentials(**token_data)
    service = build("gmail", "v1", credentials=creds)
    return service


def fetch_golfshot_emails(service):
    # Only gets recent Golfshot emails (customize query as needed)
    results = (
        service.users()
        .messages()
        .list(userId="me", q="from:support@golfshot.com subject:Scorecard")
        .execute()
    )
    messages = results.get("messages", [])
    emls = []
    for msg in messages:
        msg_full = (
            service.users()
            .messages()
            .get(userId="me", id=msg["id"], format="raw")
            .execute()
        )
        import base64

        eml_bytes = base64.urlsafe_b64decode(msg_full["raw"].encode("ASCII"))
        emls.append(eml_bytes)
    return emls

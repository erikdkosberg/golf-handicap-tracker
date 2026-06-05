# testing the application locally

## Backend

Create `backend/.env` (not committed) with at least:

```
DATABASE_URL=postgresql://...
SECRET_KEY=changeme
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FRONTEND_URL=http://localhost:3000
GOOGLE_REDIRECT_URI=http://localhost:5050/oauth2callback
OAUTHLIB_INSECURE_TRANSPORT=1
```

Start the API:

```
cd backend && uvicorn app:app --host 0.0.0.0 --port 5050 --reload
```

Swagger docs: http://localhost:5050/docs

## Frontend

API URL is set automatically via env files:

- `frontend/.env.development` → `http://localhost:5050`
- `frontend/.env.production` → AWS API Gateway URL for trackmyhandicap.com

Start the frontend:

```
cd frontend && npm start
```

## Production backend deploy

The API runs on AWS Lambda via Zappa. Deploy from a Linux environment (or Docker)
so dependencies get compatible manylinux wheels:

```
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt zappa
zappa update dev
```

`zappa_settings.json` is local-only and must include `aws_environment_variables`
for DATABASE_URL, SECRET_KEY, and Google OAuth credentials.

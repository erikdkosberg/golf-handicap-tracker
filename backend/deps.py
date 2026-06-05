import os

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User

_db_url = os.environ.get("DATABASE_URL", "sqlite:///golf.db")
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if _db_url.startswith("sqlite"):
        SECRET_KEY = "dev-only-insecure-key"
    else:
        raise RuntimeError("SECRET_KEY environment variable must be set in production")
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail={"message": "Token missing or invalid"})
    try:
        data = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        user = db.query(User).filter_by(id=data["user_id"]).first()
        if user is None:
            raise HTTPException(status_code=401, detail={"message": "User not found"})
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail={"message": "Token is invalid"})

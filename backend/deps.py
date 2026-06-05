import os

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User

SECRET_KEY = os.environ.get("SECRET_KEY", "changeme")
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

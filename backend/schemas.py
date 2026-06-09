from typing import Any, Optional

from pydantic import BaseModel, field_validator


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class RoundCreateRequest(BaseModel):
    score: int
    course_rating: float
    course_slope: int
    hole_count: int = 18
    date: Optional[str] = None
    course: Optional[str] = None
    tees: Optional[str] = None
    yardage: Optional[int] = None
    par: Optional[int] = None
    hole_scores: Optional[Any] = None


class RoundUpdateRequest(BaseModel):
    score: Optional[int] = None
    course_rating: Optional[float] = None
    course_slope: Optional[int] = None
    course: Optional[str] = None
    tees: Optional[str] = None
    yardage: Optional[int] = None
    par: Optional[int] = None


class HandicapCalculateRequest(BaseModel):
    score: int
    course_rating: float
    course_slope: int

    @field_validator("score", mode="before")
    @classmethod
    def coerce_score(cls, value):
        if isinstance(value, float):
            return round(value)
        return value


class GmailSyncRequest(BaseModel):
    player_name: str = ""

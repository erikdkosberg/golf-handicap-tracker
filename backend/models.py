import datetime

from sqlalchemy import (
    BigInteger,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True)
    email = Column(String(120), unique=True, nullable=False)
    password = Column(Text, nullable=False)
    google_refresh_token = Column(Text, nullable=True)
    google_email = Column(String(120), nullable=True)
    last_golfshot_sync = Column(DateTime, nullable=True)
    last_golfshot_sync_message = Column(BigInteger, nullable=True)

    rounds = relationship("Round", backref="user", lazy=True)


class Round(Base):
    __tablename__ = "round"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    date = Column(Date, default=datetime.date.today)
    score = Column(Integer, nullable=False)
    course_rating = Column(Float, nullable=False)
    course_slope = Column(Integer, nullable=False)
    course = Column(String(120), nullable=True)
    tees = Column(String(50), nullable=True)
    yardage = Column(Integer, nullable=True)
    par = Column(Integer, nullable=True)
    hole_count = Column(Integer, nullable=True)
    handicap_at_time = Column(Float, nullable=True)
    hole_scores = Column(JSON, nullable=True)


class SyncProgress(Base):
    __tablename__ = "sync_progress"

    user_id = Column(Integer, ForeignKey("user.id"), primary_key=True)
    total_rounds = Column(Integer)
    rounds_synced = Column(Integer)
    last_updated = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

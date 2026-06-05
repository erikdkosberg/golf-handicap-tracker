import base64
import datetime
import os

import jwt
from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, RedirectResponse
from sqlalchemy.orm import Session
from werkzeug.security import check_password_hash, generate_password_hash

from database import Base, engine, get_db
from deps import SECRET_KEY, get_current_user
from gmail_helpers import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_SCOPES,
    clear_sync_progress,
    creds_to_token_data,
    get_flow,
    get_gmail_service,
    set_sync_progress,
)
from golfshot_parser import parse_golfshot_email
from handicap import (
    build_score_differentials,
    calculate_handicap,
    compute_dashboard_stats,
    compute_handicap,
    effective_hole_count,
    expected_9_hole_differential,
    has_hole_by_hole_data,
    round_score_differential,
    round_to_tenth,
)
from models import Round, SyncProgress, User
from schemas import (
    GmailSyncRequest,
    HandicapCalculateRequest,
    LoginRequest,
    RegisterRequest,
    RoundCreateRequest,
    RoundUpdateRequest,
)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

app = FastAPI(title="Golf Handicap API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://warm-douhua-8b61f7.netlify.app",
        "https://trackmyhandicap.com",
        "https://www.trackmyhandicap.com",
        "http://www.trackmyhandicap.com",
        "http://trackmyhandicap.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail})


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


def parse_date(value):
    if value is None:
        return None
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, str):
        return datetime.datetime.strptime(value, "%Y-%m-%d").date()
    return value


def _round_has_hole_data(hole_scores) -> bool:
    if not hole_scores:
        return False
    if isinstance(hole_scores, dict):
        return len(hole_scores) > 0
    if isinstance(hole_scores, list):
        return len(hole_scores) > 0
    return False


def upsert_golfshot_round(db, user_id, round_data, hi_at_time):
    """
    Insert a Golfshot round unless a duplicate exists (same date + score).
    If a duplicate lacks hole-by-hole data and the new round has it, update in place.
    Returns True if a row was inserted or updated, False if skipped.
    """
    rd_date = parse_date(round_data["date"])
    score = round_data["score"]
    new_hole_scores = round_data.get("hole_scores")

    duplicates = (
        db.query(Round)
        .filter(
            Round.user_id == user_id,
            Round.date == rd_date,
            Round.score == score,
        )
        .all()
    )

    if duplicates:
        if any(has_hole_by_hole_data(r) for r in duplicates):
            return False
        if _round_has_hole_data(new_hole_scores):
            existing = duplicates[0]
            existing.hole_scores = new_hole_scores
            existing.course_rating = round_data.get("course_rating")
            existing.course_slope = round_data.get("course_slope")
            existing.course = round_data.get("course")
            existing.tees = round_data.get("tees")
            existing.yardage = round_data.get("yardage")
            existing.par = round_data.get("par")
            hole_count = round_data.get("hole_count")
            if hole_count == 21:
                hole_count = 18
            elif hole_count == 11:
                hole_count = 9
            existing.hole_count = hole_count
            db.commit()
            return True
        return False

    hole_count = round_data.get("hole_count")
    if hole_count == 21:
        hole_count = 18
    elif hole_count == 11:
        hole_count = 9

    new_round = Round(
        user_id=user_id,
        date=rd_date,
        score=score,
        course_rating=round_data.get("course_rating"),
        course_slope=round_data.get("course_slope"),
        course=round_data.get("course"),
        tees=round_data.get("tees"),
        yardage=round_data.get("yardage"),
        par=round_data.get("par"),
        hole_count=hole_count,
        handicap_at_time=hi_at_time,
        hole_scores=new_hole_scores,
    )
    db.add(new_round)
    db.commit()
    return True


# --- AUTH & USER MANAGEMENT ---


@app.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter_by(email=data.email).first():
        return JSONResponse(
            {"message": "Email already registered"}, status_code=400
        )
    hashed_pw = generate_password_hash(data.password)
    user = User(email=data.email, password=hashed_pw)
    db.add(user)
    db.commit()
    return {"message": "Registered successfully!"}


@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=data.email).first()
    if not user or not check_password_hash(user.password, data.password):
        return JSONResponse({"message": "Invalid credentials"}, status_code=401)
    token = jwt.encode(
        {
            "user_id": user.id,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        },
        SECRET_KEY,
        algorithm="HS256",
    )
    return {"token": token}


# --- ROUNDS ---


@app.post("/rounds")
def add_round(
    data: RoundCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    hole_count = data.hole_count
    existing_rounds = (
        db.query(Round)
        .filter_by(user_id=current_user.id)
        .order_by(Round.date.desc())
        .all()
    )
    current_hi = calculate_handicap(existing_rounds)[0]

    if hole_count == 9:
        hole_scores = data.hole_scores or []
        if len(hole_scores) != 9:
            return JSONResponse({"error": "All 9 holes must be played."}, status_code=400)
        score = data.score
        cr = data.course_rating
        sr = data.course_slope
        nine_diff = (score - cr) * 113 / sr
        expected_diff = expected_9_hole_differential(
            current_hi if current_hi is not None else 10.0
        )
        composite_diff = nine_diff + expected_diff

        new_round = Round(
            user_id=current_user.id,
            date=parse_date(data.date),
            score=score,
            course_rating=cr,
            course_slope=sr,
            course=data.course,
            tees=data.tees,
            yardage=data.yardage,
            par=data.par,
            hole_count=9,
            hole_scores=data.hole_scores,
            handicap_at_time=current_hi,
        )
        db.add(new_round)
        db.commit()
        return {"message": "9-hole round added!", "composite_diff": composite_diff}

    if hole_count == 18:
        new_round = Round(
            user_id=current_user.id,
            date=parse_date(data.date),
            score=data.score,
            course_rating=data.course_rating,
            course_slope=data.course_slope,
            course=data.course,
            tees=data.tees,
            yardage=data.yardage,
            par=data.par,
            hole_count=18,
            hole_scores=data.hole_scores,
            handicap_at_time=current_hi,
        )
        db.add(new_round)
        db.commit()
        return {"message": "18-hole round added!"}

    return JSONResponse({"error": "Invalid hole count."}, status_code=400)


def _serialize_round(r, differential=None):
    return {
        "id": r.id,
        "date": r.date.strftime("%Y-%m-%d"),
        "score": r.score,
        "course_rating": r.course_rating,
        "course_slope": r.course_slope,
        "course": r.course,
        "tees": r.tees,
        "yardage": r.yardage,
        "par": r.par,
        "hole_count": effective_hole_count(r),
        "hole_scores": r.hole_scores,
        "has_hole_by_hole": has_hole_by_hole_data(r),
        "differential": differential,
    }


@app.get("/rounds")
def get_rounds(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rounds = (
        db.query(Round)
        .filter(
            Round.user_id == current_user.id,
            Round.course_rating.isnot(None),
            Round.course_slope.isnot(None),
        )
        .order_by(Round.date.desc())
        .all()
    )
    chronological = sorted(rounds, key=lambda r: (r.date, r.id))
    entries = build_score_differentials(chronological)
    diff_by_id = {rnd.id: diff for rnd, diff in entries}
    return [
        _serialize_round(r, diff_by_id.get(r.id))
        for r in rounds
    ]


@app.get("/handicap")
def get_handicap(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rounds = (
        db.query(Round)
        .filter(
            Round.user_id == current_user.id,
            Round.course_rating.isnot(None),
            Round.course_slope.isnot(None),
        )
        .order_by(Round.date.desc())
        .all()
    )
    result = compute_handicap(rounds)
    stats = compute_dashboard_stats(rounds)
    return {
        "handicap": result.handicap_index,
        "max_diff_used": result.max_diff_used,
        "improvement_cutoff": stats.get("improvement_cutoff"),
        "stats": {
            "total_rounds": len(rounds),
            "lowest_differential": stats.get("lowest_differential"),
            "average_differential_20": stats.get("average_differential_20"),
            "handicap_trend_10": stats.get("handicap_trend_10"),
            "avg_birdies": stats.get("avg_birdies"),
            "avg_pars": stats.get("avg_pars"),
            "avg_bogeys": stats.get("avg_bogeys"),
            "avg_double_or_worse": stats.get("avg_double_or_worse"),
        },
        "lowest_round_to_par": stats.get("lowest_round_to_par"),
        "highlighted_round_ids": stats.get("highlighted_round_ids", []),
        "chart_data": stats.get("chart_data", []),
    }


@app.post("/handicap/calculate")
def calculate_projected_handicap(
    data: HandicapCalculateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rounds = (
        db.query(Round)
        .filter(
            Round.user_id == current_user.id,
            Round.course_rating.isnot(None),
            Round.course_slope.isnot(None),
        )
        .order_by(Round.date.desc())
        .all()
    )
    fake_round = Round(
        score=data.score,
        course_rating=data.course_rating,
        course_slope=data.course_slope,
        date=datetime.date.today(),
        hole_count=18,
    )
    all_rounds = sorted(rounds + [fake_round], key=lambda r: (r.date, r.id or 0))
    projected_handicap, new_max_diff = calculate_handicap(all_rounds)
    projected_differential = round_to_tenth(
        round_score_differential(data.score, data.course_rating, data.course_slope)
    )
    return {
        "projected_handicap": projected_handicap,
        "projected_differential": projected_differential,
        "max_diff_used": new_max_diff,
    }


@app.delete("/rounds/{round_id}")
def delete_round(
    round_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rnd = (
        db.query(Round)
        .filter_by(id=round_id, user_id=current_user.id)
        .first()
    )
    if not rnd:
        return JSONResponse({"message": "Round not found"}, status_code=404)
    db.delete(rnd)
    db.commit()
    return {"message": "Round deleted"}


@app.put("/rounds/{round_id}")
def update_round(
    round_id: int,
    data: RoundUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rnd = (
        db.query(Round)
        .filter_by(id=round_id, user_id=current_user.id)
        .first()
    )
    if not rnd:
        return JSONResponse({"message": "Round not found"}, status_code=404)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rnd, field, value)
    db.commit()
    return {"message": "Round updated"}


@app.get("/courses")
def get_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rounds = db.query(Round).filter_by(user_id=current_user.id).all()
    seen = set()
    courses = []
    for r in rounds:
        key = (r.course, r.tees)
        if r.course and r.tees and key not in seen:
            seen.add(key)
            courses.append(
                {
                    "course": r.course,
                    "tees": r.tees,
                    "course_rating": r.course_rating,
                    "course_slope": r.course_slope,
                    "yardage": r.yardage,
                    "par": r.par,
                }
            )
    return courses


@app.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "id": current_user.id,
        "gmail_linked": bool(current_user.google_refresh_token),
    }


# --- GMAIL INTEGRATION ---


def _oauth_state_token(user_id: int) -> str:
    return jwt.encode(
        {
            "user_id": user_id,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=10),
        },
        SECRET_KEY,
        algorithm="HS256",
    )


@app.get("/auth/google")
def google_auth(current_user: User = Depends(get_current_user)):
    flow = get_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=_oauth_state_token(current_user.id),
    )
    return {"auth_url": auth_url}


@app.get("/oauth2callback")
def oauth2callback(request: Request, db: Session = Depends(get_db)):
    flow = get_flow()
    flow.fetch_token(authorization_response=str(request.url))
    creds = flow.credentials
    service = get_gmail_service(creds_to_token_data(creds))
    profile = service.users().getProfile(userId="me").execute()
    google_email = profile["emailAddress"]

    state = request.query_params.get("state")
    if not state:
        raise HTTPException(status_code=400, detail={"message": "Missing OAuth state"})
    try:
        state_data = jwt.decode(state, SECRET_KEY, algorithms=["HS256"])
        user_id = state_data["user_id"]
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail={"message": "Invalid OAuth state"})

    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail={"message": "User not found"})
    if not creds.refresh_token:
        raise HTTPException(
            status_code=400,
            detail={"message": "Google did not return a refresh token"},
        )
    user.google_refresh_token = creds.refresh_token
    user.google_email = google_email
    db.commit()
    return RedirectResponse(url=FRONTEND_URL)


@app.get("/sync_progress")
def get_sync_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sp = db.query(SyncProgress).filter_by(user_id=current_user.id).first()
    if not sp:
        return {"status": "idle"}
    return {
        "total": sp.total_rounds,
        "current": sp.rounds_synced,
        "status": "syncing" if sp.rounds_synced < sp.total_rounds else "done",
    }


@app.post("/gmail/sync")
def gmail_sync(
    body: GmailSyncRequest = GmailSyncRequest(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        if not current_user.google_refresh_token:
            return JSONResponse(
                {"error": "No Google account linked"}, status_code=400
            )

        creds_data = {
            "token": "",
            "refresh_token": current_user.google_refresh_token,
            "token_uri": "https://oauth2.googleapis.com/token",
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "scopes": GOOGLE_SCOPES,
        }
        service = get_gmail_service(creds_data)

        last_sync_ms = current_user.last_golfshot_sync_message
        q = "from:support@golfshot.com subject:Scorecard"
        if last_sync_ms:
            q += f" after:{last_sync_ms // 1000}"

        results = (
            service.users()
            .messages()
            .list(userId="me", q=q, maxResults=300)
            .execute()
        )
        messages = results.get("messages", [])

        max_internal_date = last_sync_ms or 0
        imported = 0
        player_name = body.player_name

        for msg in messages:
            msg_meta = (
                service.users()
                .messages()
                .get(userId="me", id=msg["id"], format="metadata")
                .execute()
            )
            internal_date = int(msg_meta["internalDate"])
            if internal_date > max_internal_date:
                max_internal_date = internal_date

            msg_full = (
                service.users()
                .messages()
                .get(userId="me", id=msg["id"], format="raw")
                .execute()
            )
            eml_bytes = base64.urlsafe_b64decode(msg_full["raw"].encode("ASCII"))
            round_data = parse_golfshot_email(eml_bytes, player_name=player_name)
            if round_data:
                prior_rounds = (
                    db.query(Round)
                    .filter(Round.user_id == current_user.id)
                    .order_by(Round.date.asc())
                    .all()
                )
                hi_at_time = calculate_handicap(prior_rounds)[0]
                if upsert_golfshot_round(
                    db, current_user.id, round_data, hi_at_time
                ):
                    imported += 1
                set_sync_progress(
                    db,
                    current_user.id,
                    len(messages),
                    imported,
                )

        if max_internal_date and (
            not last_sync_ms or max_internal_date > last_sync_ms
        ):
            current_user.last_golfshot_sync_message = max_internal_date
            db.commit()

        clear_sync_progress(db, current_user.id)
        db.commit()

        return {
            "status": "completed",
            "imported": imported,
            "total_checked": len(messages),
            "last_golfshot_sync_message": str(
                current_user.last_golfshot_sync_message
            )
            if current_user.last_golfshot_sync_message
            else None,
        }
    except Exception as e:
        if "invalid_grant" in str(e):
            current_user.google_refresh_token = None
            db.commit()
            return JSONResponse(
                {
                    "error": "Google account authorization expired. Please reconnect."
                },
                status_code=401,
            )
        raise


@app.get("/")
def index():
    return PlainTextResponse("Golf Handicap API running!")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=5050, reload=True)

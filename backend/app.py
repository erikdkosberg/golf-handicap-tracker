# backend/app.py

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps
from flask_cors import cross_origin

# --- CONFIGURATION ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///golf.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
CORS(
    app,
    origins=["http://localhost:3000", "https://warm-douhua-8b61f7.netlify.app"],
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"]
)

# --- MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    rounds = db.relationship('Round', backref='user', lazy=True)

class Round(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.Date, default=datetime.date.today)
    score = db.Column(db.Integer, nullable=False)
    course_rating = db.Column(db.Float, nullable=False)
    course_slope = db.Column(db.Integer, nullable=False)
    course = db.Column(db.String(120), nullable=True)         # New
    tees = db.Column(db.String(50), nullable=True)            # New
    yardage = db.Column(db.Integer, nullable=True)            # New
    par = db.Column(db.Integer, nullable=True)                # New


# --- UTILS ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'message': 'Token missing or invalid'}), 401
        try:
            data = jwt.decode(token.split(" ")[1], app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
            if current_user is None:
                return jsonify({'message': 'User not found'}), 401
        except Exception as e:
            return jsonify({'message': 'Token is invalid'}), 401
        return f(current_user, *args, **kwargs)
    return decorated


def calculate_handicap(rounds):
    # Simple USGA method: Best 8 of last 20 differentials
    if not rounds:
        return None
    differentials = []
    for rnd in rounds:
        differential = (int(rnd.score) - int(rnd.course_rating)) * 113 / int(rnd.course_slope)
        differentials.append(differential)
    differentials.sort()
    count = min(8, len(differentials))
    avg_diff = sum(differentials[:count]) / count
    handicap = round(avg_diff * 0.96, 1)
    return handicap

# --- ROUTES ---
@app.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        # This is just the preflight request
        return '', 200
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already registered'}), 400
    hashed_pw = generate_password_hash(data['password'])
    user = User(email=data['email'], password=hashed_pw)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Registered successfully!'})


@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401
    token = jwt.encode(
        {'user_id': user.id, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)},
        app.config['SECRET_KEY'], algorithm="HS256"
    )
    return jsonify({'token': token})

@app.route('/rounds', methods=['POST'])
@token_required
def add_round(current_user):
    data = request.json
    new_round = Round(
        user_id=current_user.id,
        score=data['score'],
        course_rating=data['course_rating'],
        course_slope=data['course_slope'],
        date=datetime.datetime.strptime(data.get('date'), "%Y-%m-%d").date() if data.get('date') else datetime.date.today(),
        course=data.get('course'),
        tees=data.get('tees'),
        yardage=data.get('yardage'),
        par=data.get('par')
    )

    db.session.add(new_round)
    db.session.commit()
    return jsonify({'message': 'Round added!'})

@app.route('/rounds', methods=['GET'])
@token_required
def get_rounds(current_user):
    rounds = Round.query.filter_by(user_id=current_user.id).all()
    output = [
        {
            'id': r.id,
            'date': r.date.strftime("%Y-%m-%d"),
            'score': r.score,
            'course_rating': r.course_rating,
            'course_slope': r.course_slope,
            'course': r.course,
            'tees': r.tees,
            'yardage': r.yardage,
            'par': r.par
        } for r in rounds
    ]

    return jsonify(output)

@app.route('/handicap', methods=['GET'])
@token_required
def get_handicap(current_user):
    rounds = Round.query.filter_by(user_id=current_user.id).order_by(Round.date.desc()).limit(20).all()
    handicap = calculate_handicap(rounds)
    return jsonify({'handicap': handicap})

@app.route('/handicap/calculate', methods=['POST'])
@token_required
def calculate_projected_handicap(current_user):
    # Accept a hypothetical round and recalculate handicap
    data = request.json
    rounds = Round.query.filter_by(user_id=current_user.id).order_by(Round.date.desc()).limit(19).all()
    fake_round = Round(
        score=data['score'],
        course_rating=data['course_rating'],
        course_slope=data['course_slope'],
        date=datetime.date.today()
    )
    rounds.append(fake_round)
    handicap = calculate_handicap(rounds)
    return jsonify({'projected_handicap': handicap})

@app.route('/rounds/<int:round_id>', methods=['DELETE'])
@token_required
def delete_round(current_user, round_id):
    rnd = Round.query.filter_by(id=round_id, user_id=current_user.id).first()
    if not rnd:
        return jsonify({'message': 'Round not found'}), 404
    db.session.delete(rnd)
    db.session.commit()
    return jsonify({'message': 'Round deleted'})

@app.route('/rounds/<int:round_id>', methods=['PUT'])
@token_required
def update_round(current_user, round_id):
    rnd = Round.query.filter_by(id=round_id, user_id=current_user.id).first()
    if not rnd:
        return jsonify({'message': 'Round not found'}), 404
    data = request.json
    for field in ['score', 'course_rating', 'course_slope', 'course', 'tees', 'yardage', 'par']:
        if field in data:
            setattr(rnd, field, data[field])
    db.session.commit()
    return jsonify({'message': 'Round updated'})


@app.route('/courses', methods=['GET'])
@token_required
def get_courses(current_user):
    # Option 1: Only user's rounds
    rounds = Round.query.filter_by(user_id=current_user.id).all()
    # Option 2: All rounds, if you want a global dropdown:
    # rounds = Round.query.all()
    seen = set()
    courses = []
    for r in rounds:
        key = (r.course, r.tees)
        if r.course and r.tees and key not in seen:
            seen.add(key)
            courses.append({
                "course": r.course,
                "tees": r.tees,
                "course_rating": r.course_rating,
                "course_slope": r.course_slope,
                "yardage": r.yardage,
                "par": r.par
            })
    return jsonify(courses)

@app.route('/me', methods=['GET'])
@token_required
def me(current_user):
    return jsonify({'email': current_user.email, 'id': current_user.id})



# --- MAIN ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5050)

from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from extensions import db   # extensions에서 불러오기
from models import User, Schedule

app = Flask(__name__)
CORS(app)

<<<<<<< HEAD
# SQLite DB 연결
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///db.sqlite3"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# User 테이블
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
=======
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///db.sqlite3"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = "super-secret-key"

# db 초기화
db.init_app(app)
jwt = JWTManager(app)

# 블루프린트 등록 (auth, profile, schedule)
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.schedule import schedule_bp

app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(profile_bp, url_prefix="/profile")
app.register_blueprint(schedule_bp, url_prefix="/schedule")
>>>>>>> origin/dev

@app.route("/")
def home():
    return "Flask + SQLite 서버 동작 중!"
<<<<<<< HEAD

@app.route("/api/hello")
def hello():
    return jsonify({"message": "Hello from Flask!"})
=======
>>>>>>> origin/dev

@app.route("/users")
def users():
    return jsonify([{"id": u.id, "name": u.name} for u in User.query.all()])

if __name__ == "__main__":
<<<<<<< HEAD
    # 🚀 앱 실행 전에 DB 자동 초기화
    with app.app_context():
        db.create_all()
        if not User.query.first():  # 데이터가 없을 때만 샘플 추가
            db.session.add_all([User(name="Alice"), User(name="Bob")])
            db.session.commit()
=======
    with app.app_context():
        db.create_all()
>>>>>>> origin/dev
    app.run(debug=True)
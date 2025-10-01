from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from extensions import db   # extensions에서 불러오기
from models import User, Schedule

app = Flask(__name__)
CORS(app)

# SQLite DB 연결
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///db.sqlite3"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = "super-secret-key"  # JWT용 키

# DB 초기화
db.init_app(app)
jwt = JWTManager(app)

# 블루프린트 등록
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.schedule import schedule_bp

app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(profile_bp, url_prefix="/profile")
app.register_blueprint(schedule_bp, url_prefix="/schedule")


@app.route("/")
def home():
    return "Flask + SQLite 서버 동작 중!"


@app.route("/users")
def users():
    return jsonify([{"id": u.id, "name": u.name} for u in User.query.all()])


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
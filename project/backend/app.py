import os
from flask import Flask
from flask_cors import CORS
from extensions import db, bcrypt, jwt
from routes.auth import auth_bp
from routes.profile import profile_bp

def create_app():
    app = Flask(__name__)

    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DB_PATH = os.path.join(BASE_DIR, "instance", "project.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"

    # 기본 설정
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = "super-secret-key"  # 실제 배포 시엔 환경변수로

    # JWT 헤더 인식 설정 추가
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_HEADER_NAME"] = "Authorization"
    app.config["JWT_HEADER_TYPE"] = "Bearer"

    # 확장 기능 초기화
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # CORS 설정 (React dev 서버 허용)
    CORS(app, resources={r"/*": {"origins": ["http://127.0.0.1:5173", "http://localhost:5173"]}})

    # 블루프린트 등록
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(profile_bp, url_prefix="/profile")

    @app.route("/")
    def index():
        return {"message": "✅ Flask backend running!"}

    return app

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        from models import User 
        db.create_all()
    app.run(host="127.0.0.1", port=5000, debug=True)
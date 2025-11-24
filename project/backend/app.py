import os
from flask import Flask, request
from flask_cors import CORS
from extensions import db, bcrypt, jwt
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.available import available_bp
from routes.board import board_bp
from routes.course import course_bp
from routes.recruit import recruit_bp
from routes.schedule import schedule_bp
from routes.notification import notification_bp

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
    allowed_origins = {
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5175",
        "http://localhost:5175",
    }
    CORS(app, resources={r"/*": {"origins": list(allowed_origins)}}, supports_credentials=True)

    # 블루프린트 등록
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(profile_bp, url_prefix="/profile")
    app.register_blueprint(available_bp, url_prefix="/available")
    app.register_blueprint(board_bp, url_prefix="/board")
    app.register_blueprint(course_bp, url_prefix="/course")
    app.register_blueprint(recruit_bp, url_prefix="/recruit")
    app.register_blueprint(schedule_bp, url_prefix="/schedule")
    app.register_blueprint(notification_bp, url_prefix="/notification")


    with app.app_context():
        from models import (
            User,
            Course,
            Enrollment,
            CourseBoardComment,
            CourseBoardLike,
            CourseBoardCommentLike,
            TeamRecruitment,
            TeamRecruitmentMember,
            Schedule,
            Notification,
        )

        db.create_all()
        print("✅ Database initialized successfully!")

    @app.route("/")
    def index():
        return {"message": "✅ Flask backend running!"}
    
    @app.before_request
    def handle_options():
        if request.method == "OPTIONS":
            return '', 200
        
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="127.0.0.1", port=5000, debug=True)
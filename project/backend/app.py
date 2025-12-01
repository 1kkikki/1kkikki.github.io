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

    # 데이터베이스 설정
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DB_PATH = os.path.join(BASE_DIR, "instance", "project.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"

    # 기본 설정
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret-key")

    # JWT 헤더 인식 설정 추가
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_HEADER_NAME"] = "Authorization"
    app.config["JWT_HEADER_TYPE"] = "Bearer"

    # 확장 기능 초기화
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # CORS 설정 (개발 및 프로덕션 환경)
    allowed_origins = {
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5175",
        "http://localhost:5175",
        "https://1kkikki.github.io",
        "https://allmeet.github.io",
        os.getenv("FRONTEND_URL", ""),  # 환경 변수로 프론트엔드 URL 설정 가능
    }
    # 빈 문자열 제거
    allowed_origins = {origin for origin in allowed_origins if origin}
    
    CORS(app, resources={r"/*": {"origins": list(allowed_origins)}}, supports_credentials=True)

    # 🔥 블루프린트 등록 (prefix는 각 파일에서 설정)
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(available_bp)
    app.register_blueprint(board_bp)
    app.register_blueprint(course_bp)
    app.register_blueprint(recruit_bp)
    app.register_blueprint(schedule_bp)
    app.register_blueprint(notification_bp)

    with app.app_context():
        from models import (
            User,
            Course,
            Enrollment,
            CourseBoardPost,
            CourseBoardComment,
            CourseBoardLike,
            CourseBoardCommentLike,
            TeamRecruitment,
            TeamRecruitmentMember,
            Schedule,
            Notification,
            Poll,
            PollOption,
            PollVote,
        )

        db.create_all()
        
        # is_pinned 컬럼 마이그레이션 (기존 데이터베이스 호환성)
        try:
            import sqlite3
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # 기존 컬럼 확인
            cursor.execute("PRAGMA table_info(course_board_posts)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'is_pinned' not in columns:
                print("🔄 is_pinned 컬럼을 추가하는 중...")
                cursor.execute("ALTER TABLE course_board_posts ADD COLUMN is_pinned BOOLEAN DEFAULT 0")
                conn.commit()
                print("✅ is_pinned 컬럼이 추가되었습니다!")
            
            conn.close()
        except Exception as e:
            print(f"⚠️ 마이그레이션 확인 중 오류 (무시 가능): {e}")
        
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

# gunicorn이 app 변수를 읽을 수 있도록 모듈 레벨에서 생성
app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_ENV") == "development")
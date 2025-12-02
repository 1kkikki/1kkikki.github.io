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

    # CORS 설정 - 환경 변수와 기본값 결합
    # 환경 변수에서 허용된 origin을 가져오거나 기본값 사용
    env_origins = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else []
    env_origins = [origin.strip() for origin in env_origins if origin.strip()]
    
    # 기본 허용된 origin 목록
    default_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "https://allmeet.site",
        "https://www.allmeet.site",
        "https://1kkikki.github.io",
    ]
    
    # Vercel 도메인 패턴 추가 (환경 변수로도 설정 가능)
    vercel_domain = os.getenv("VERCEL_URL")  # Vercel이 자동으로 설정하는 환경 변수
    if vercel_domain:
        default_origins.append(f"https://{vercel_domain}")
    
    # 모든 origin 결합 (중복 제거)
    allowed_origins = list(set(default_origins + env_origins))
    
    # 프로덕션 환경에서는 더 엄격하게, 개발 환경에서는 더 유연하게
    is_production = os.getenv("FLASK_ENV") == "production" or os.getenv("ENVIRONMENT") == "production"
    
    # CORS 설정 - 모든 경로에 대해 적용
    CORS(app, 
         resources={r"/*": {
             "origins": allowed_origins,
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
             "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
             "expose_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True,
             "max_age": 3600
         }},
         allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
         expose_headers=["Content-Type", "Authorization"]
    )

    # CORS 헤더를 명시적으로 모든 응답에 추가 (안전장치)
    @app.after_request
    def after_request(response):
        origin = request.headers.get('Origin')
        if origin:
            # 허용된 origin 목록에 있거나, 개발 환경에서 localhost인 경우 허용
            if origin in allowed_origins:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
                response.headers['Access-Control-Expose-Headers'] = 'Content-Type, Authorization'
            # 개발 환경에서 localhost 패턴 허용 (유연성)
            elif not is_production and ('localhost' in origin or '127.0.0.1' in origin):
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
                response.headers['Access-Control-Expose-Headers'] = 'Content-Type, Authorization'
        return response

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
            AvailableTime,
            TeamAvailabilitySubmission,
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
            
            # available_times 테이블에 team_id 컬럼 추가 마이그레이션
            cursor.execute("PRAGMA table_info(available_times)")
            available_times_columns = [column[1] for column in cursor.fetchall()]
            
            if 'team_id' not in available_times_columns:
                print("🔄 available_times 테이블에 team_id 컬럼을 추가하는 중...")
                cursor.execute("ALTER TABLE available_times ADD COLUMN team_id INTEGER")
                # 외래 키 제약조건은 SQLite에서 ALTER TABLE로 직접 추가할 수 없으므로,
                # 필요시 별도로 처리 (일단 컬럼만 추가)
                conn.commit()
                print("✅ team_id 컬럼이 추가되었습니다!")
            
            conn.close()
        except Exception as e:
            print(f"⚠️ 마이그레이션 확인 중 오류 (무시 가능): {e}")
        
        print("✅ Database initialized successfully!")

    @app.route("/")
    def index():
        return {"message": "✅ Flask backend running!"}

    return app

# gunicorn이 app 변수를 읽을 수 있도록 모듈 레벨에서 생성
app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_ENV") == "development")
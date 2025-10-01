from flask import Flask
from extensions import db, jwt
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.schedule import schedule_bp
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = "super-secret-key"  # 환경변수로 빼면 더 안전

    # 확장 초기화
    db.init_app(app)
    jwt.init_app(app)
    CORS(app)

    # 블루프린트 등록
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(profile_bp, url_prefix="/profile")
    app.register_blueprint(schedule_bp, url_prefix="/schedule")

    @app.route("/")
    def home():
        return "✅ Flask API 서버 실행 중!"

    return app


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True)
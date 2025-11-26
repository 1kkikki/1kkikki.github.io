from flask import Blueprint, request, jsonify
from extensions import db, bcrypt
from models import User
from flask_jwt_extended import create_access_token
from datetime import timedelta

# 🔥 라우터 prefix 추가 → /auth 로 URL 구분됨
auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# =====================================================
# 회원가입
# =====================================================
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    required_fields = ["studentId", "name", "email", "username", "password", "userType"]

    if not all(field in data for field in required_fields):
        return jsonify({"message": "필수 입력값이 누락되었습니다."}), 400

    if data["userType"] not in ["student", "professor"]:
        return jsonify({"message": "유효하지 않은 사용자 유형입니다."}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"message": "이미 존재하는 이메일입니다."}), 400
    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"message": "이미 존재하는 아이디입니다."}), 400

    hashed_pw = bcrypt.generate_password_hash(data["password"]).decode("utf-8")

    new_user = User(
        student_id=data["studentId"],
        name=data["name"],
        email=data["email"],
        username=data["username"],
        password_hash=hashed_pw,
        user_type=data["userType"]
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": "회원가입 성공",
        "user": new_user.to_dict()
    }), 201


# =====================================================
# 로그인
# =====================================================
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username_or_email = data.get("email")
    password = data.get("password")

    user = User.query.filter(
        (User.email == username_or_email) | (User.username == username_or_email)
    ).first()

    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"message": "잘못된 이메일/아이디 또는 비밀번호입니다."}), 401

    access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=1))

    return jsonify({
        "message": "로그인 성공",
        "access_token": access_token,
        "user": user.to_dict(),
        "userType": user.user_type
    }), 200


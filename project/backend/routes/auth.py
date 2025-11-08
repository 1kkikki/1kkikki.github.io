from flask import Blueprint, request, jsonify
from extensions import db, bcrypt
from models import User
from flask_jwt_extended import create_access_token
from datetime import timedelta

auth_bp = Blueprint("auth", __name__)

# =====================================================
# ✅ 회원가입 (교수 / 학생 구분)
# =====================================================
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    required_fields = ["studentId", "name", "email", "username", "password", "userType"]

    # 🔸 필수값 확인
    if not all(field in data for field in required_fields):
        return jsonify({"message": "필수 입력값이 누락되었습니다."}), 400

    # 🔸 이메일 / 아이디 중복 확인
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"message": "이미 존재하는 이메일입니다."}), 400
    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"message": "이미 존재하는 아이디입니다."}), 400

    # 🔸 비밀번호 해싱
    hashed_pw = bcrypt.generate_password_hash(data["password"]).decode("utf-8")

    # 🔸 새 사용자 등록 (교수 / 학생 구분 저장)
    new_user = User(
        student_id=data["studentId"],
        name=data["name"],
        email=data["email"],
        username=data["username"],
        password_hash=hashed_pw,
        user_type=data["userType"]  # ✅ "student" or "professor"
    )

    db.session.add(new_user)
    db.session.commit()

    # 🔸 성공 응답
    return jsonify({
        "message": "회원가입 성공",
        "user": new_user.to_dict()
    }), 201


# =====================================================
# ✅ 로그인
# =====================================================
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username_or_email = data.get("email")  # 프론트에서 email 필드로 보냄
    password = data.get("password")

    # 🔸 사용자 찾기 (이메일 또는 아이디로)
    user = User.query.filter(
        (User.email == username_or_email) | (User.username == username_or_email)
    ).first()

    # 🔸 비밀번호 검증
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"message": "잘못된 이메일/아이디 또는 비밀번호입니다."}), 401

    # 🔸 JWT 토큰 발급 (1시간 유효)
    access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=1))

    # 🔸 성공 응답 (userType 포함)
    return jsonify({
        "message": "로그인 성공",
        "access_token": access_token,
        "user": user.to_dict(),      # 사용자 정보
        "userType": user.user_type   # ✅ 교수/학생 구분 포함
    }), 200
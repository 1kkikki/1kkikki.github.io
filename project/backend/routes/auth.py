from flask import Blueprint, request, jsonify
from extensions import db, bcrypt
from models import User
from flask_jwt_extended import create_access_token
from datetime import timedelta
import secrets
import string

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


# =====================================================
# 아이디 찾기
# =====================================================
@auth_bp.route("/find-id", methods=["POST"])
def find_id():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")

    if not name or not email:
        return jsonify({"message": "이름과 이메일을 모두 입력해주세요."}), 400

    user = User.query.filter_by(name=name, email=email).first()

    if not user:
        return jsonify({"message": "입력하신 정보와 일치하는 계정을 찾을 수 없습니다."}), 404

    return jsonify({
        "message": "아이디 찾기 성공",
        "username": user.username
    }), 200


# =====================================================
# 비밀번호 찾기 (임시 비밀번호 생성)
# =====================================================
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")

    if not username or not email:
        return jsonify({"message": "아이디와 이메일을 모두 입력해주세요."}), 400

    user = User.query.filter_by(username=username, email=email).first()

    if not user:
        return jsonify({"message": "입력하신 정보와 일치하는 계정을 찾을 수 없습니다."}), 404

    # 임시 비밀번호 생성 (8자리 영문+숫자 조합)
    characters = string.ascii_letters + string.digits
    temp_password = ''.join(secrets.choice(characters) for _ in range(8))

    # 비밀번호 해시화 및 저장
    hashed_pw = bcrypt.generate_password_hash(temp_password).decode("utf-8")
    user.password_hash = hashed_pw
    db.session.commit()

    # TODO: 실제 이메일 전송 기능 추가 시 아래 주석 해제하고 이메일로 전송
    # send_password_reset_email(user.email, temp_password)

    return jsonify({
        "message": "임시 비밀번호가 생성되었습니다.",
        "temp_password": temp_password  # 개발 단계에서는 임시 비밀번호를 반환 (실제 배포 시에는 제거)
    }), 200


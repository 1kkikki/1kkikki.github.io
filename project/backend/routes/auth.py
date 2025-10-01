from flask import Blueprint, request, jsonify
from extensions import db
from models import User
import bcrypt
from flask_jwt_extended import create_access_token

auth_bp = Blueprint("auth", __name__)

# 회원가입
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    student_id = data.get("student_id")
    name = data.get("name")
    password = data.get("password")
    role = data.get("role", "student")

    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    new_user = User(student_id=student_id, name=name, password=hashed_pw, role=role)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"msg": "회원가입 성공"})

# 로그인
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    student_id = data.get("student_id")
    password = data.get("password")

    user = User.query.filter_by(student_id=student_id).first()
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password):
        return jsonify({"msg": "아이디 또는 비밀번호가 틀렸습니다."}), 401

    token = create_access_token(identity=user.id)
    return jsonify({"access_token": token})
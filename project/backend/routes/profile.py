from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, bcrypt
from models import User

profile_bp = Blueprint("profile", __name__, url_prefix="/profile")

# -------------------------------
# 프로필 조회
# -------------------------------
@profile_bp.route("/", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404

    return jsonify({"profile": user.to_dict()})


# -------------------------------
# 프로필 수정
# -------------------------------
@profile_bp.route("/", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404

    data = request.get_json()

    if "name" in data:
        user.name = data["name"]
    if "email" in data:
        user.email = data["email"]
    if "profileImage" in data: 
        user.profile_image = data["profileImage"]

    db.session.commit()

    return jsonify({"message": "프로필이 수정되었습니다.", "profile": user.to_dict()})

# -----------------------------------------
# 비밀번호 변경
# -----------------------------------------
@profile_bp.route("/password", methods=["PUT"])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404

    data = request.get_json()
    current_pw = data.get("currentPassword")
    new_pw = data.get("newPassword")

    # 입력값 검증
    if not current_pw or not new_pw:
        return jsonify({"error": "비밀번호를 모두 입력해주세요."}), 400

    # 현재 비밀번호 검증(bcrypt)
    if not bcrypt.check_password_hash(user.password_hash, current_pw):
        return jsonify({"error": "현재 비밀번호가 올바르지 않습니다."}), 400

    # 새 비밀번호 해시 후 저장(bcrypt)
    user.password_hash = bcrypt.generate_password_hash(new_pw).decode("utf-8")
    db.session.commit()

    return jsonify({"message": "비밀번호가 성공적으로 변경되었습니다."})
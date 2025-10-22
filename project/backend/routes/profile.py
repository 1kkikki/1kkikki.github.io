from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User

profile_bp = Blueprint("profile", __name__)

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

    db.session.commit()

    return jsonify({"message": "프로필이 수정되었습니다.", "profile": user.to_dict()})
from flask import Blueprint, request, jsonify
from extensions import db
from models import User
from flask_jwt_extended import jwt_required, get_jwt_identity

profile_bp = Blueprint("profile", __name__)

@profile_bp.route("/", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    return jsonify({"student_id": user.student_id, "name": user.name, "role": user.role})

@profile_bp.route("/", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.get_json()
    user = User.query.get(user_id)

    if "name" in data:
        user.name = data["name"]
    if "role" in data:
        user.role = data["role"]

    db.session.commit()
    return jsonify({"msg": "프로필 수정 완료"})
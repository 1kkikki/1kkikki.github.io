from flask import Blueprint, request, jsonify
from extensions import db
from models import Schedule
from flask_jwt_extended import jwt_required, get_jwt_identity

schedule_bp = Blueprint("schedule", __name__)

@schedule_bp.route("/", methods=["POST"])
@jwt_required()
def create_schedule():
    user_id = get_jwt_identity()
    data = request.get_json()
    new_schedule = Schedule(
        title=data["title"],
        date=data["date"],
        start_time=data["start_time"],
        end_time=data["end_time"],
        user_id=user_id,
        team_id=data["team_id"]
    )
    db.session.add(new_schedule)
    db.session.commit()
    return jsonify({"msg": "일정 생성 완료"})
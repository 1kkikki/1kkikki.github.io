from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import AvailableTime, User
from datetime import datetime

available_bp = Blueprint("available", __name__, url_prefix="/available")

# 공통 시간 파싱 함수
def parse_time_str(time_str):
    return datetime.strptime(time_str, "%H:%M").time()

# 가능한 시간 추가
@available_bp.route("/", methods=["POST"])
@jwt_required()
def add_available_time():
    user_id = get_jwt_identity()
    data = request.get_json()

    existing = AvailableTime.query.filter_by(
        user_id=user_id,
        day_of_week=data["day_of_week"],
        start_time=parse_time_str(data["start_time"]),
        end_time=parse_time_str(data["end_time"])
    ).first()

    if existing:
        return jsonify({"msg": "이미 같은 시간이 존재합니다."}), 200

    new_time = AvailableTime(
        user_id=user_id,
        day_of_week=data["day_of_week"],
        start_time=parse_time_str(data["start_time"]),
        end_time=parse_time_str(data["end_time"]),
    )

    db.session.add(new_time)
    db.session.commit()
    return jsonify({"msg": "시간 저장 완료"}), 201

# 내 가능한 시간 목록 조회
@available_bp.route("/", methods=["GET"])
@jwt_required()
def get_my_available_times():
    user_id = get_jwt_identity()
    times = (
        AvailableTime.query
        .filter_by(user_id=user_id)
        .order_by(AvailableTime.day_of_week, AvailableTime.start_time)
        .all()
    )
    return jsonify([t.to_dict() for t in times])

# 가능한 시간 삭제
@available_bp.route("/<int:time_id>", methods=["DELETE"])
@jwt_required()
def delete_available_time(time_id):
    user_id = get_jwt_identity()
    time = AvailableTime.query.filter_by(id=time_id, user_id=user_id).first()

    if not time:
        return jsonify({"msg": "해당 시간이 존재하지 않거나 권한이 없습니다."}), 404

    db.session.delete(time)
    db.session.commit()
    return jsonify({"msg": "시간이 삭제되었습니다."}), 200

# 팀 전체의 공통 가능한 시간대 계산 (기본 교집합 버전)
@available_bp.route("/team/<int:team_id>", methods=["GET"])
@jwt_required()
def get_team_common_times(team_id):
    from models import TeamMember  # 팀 테이블 있다면 import

    team_members = TeamMember.query.filter_by(team_id=team_id).all()
    member_ids = [m.user_id for m in team_members]

    all_times = AvailableTime.query.filter(AvailableTime.user_id.in_(member_ids)).all()

    day_groups = {}
    for t in all_times:
        day_groups.setdefault(t.day_of_week, []).append((t.start_time, t.end_time))

    common_times = {}
    for day, times in day_groups.items():
        times.sort()
        start = max(t[0] for t in times)
        end = min(t[1] for t in times)
        if start < end:
            common_times[day] = {"start": start.strftime("%H:%M"), "end": end.strftime("%H:%M")}

    return jsonify(common_times)

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import AvailableTime, User, TeamRecruitmentMember, TeamRecruitment
from datetime import datetime
from collections import defaultdict

available_bp = Blueprint("available", __name__, url_prefix="/available")

# 공통 시간 파싱 함수
def parse_time_str(time_str):
    return datetime.strptime(time_str, "%H:%M").time()

DAY_ORDER = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]

def _day_index(day_name):
    try:
        return DAY_ORDER.index(day_name)
    except ValueError:
        return None

def _time_to_minutes(time_obj):
    return time_obj.hour * 60 + time_obj.minute

def _slot_key(day_index, minutes):
    hour = minutes // 60
    minute = minutes % 60
    return f"{day_index}-{hour}-{minute}"

def _format_time(minutes):
    hour = minutes // 60
    minute = minutes % 60
    return f"{hour:02d}:{minute:02d}"

def build_time_slots(times):
    slots = set()

    for time in times:
        day_index = _day_index(time.day_of_week)
        if day_index is None:
            continue

        start = _time_to_minutes(time.start_time)
        end = _time_to_minutes(time.end_time)
        for minute in range(start, end, 30):
            if minute >= 24 * 60:
                continue
            slots.add(_slot_key(day_index, minute))

    return slots

def build_daily_blocks_from_slots(slots):
    per_day = defaultdict(list)

    for slot in slots:
        day_index_str, hour_str, minute_str = slot.split("-")
        day_index = int(day_index_str)
        minutes = int(hour_str) * 60 + int(minute_str)
        per_day[day_index].append(minutes)

    blocks = {}
    for day_index in sorted(per_day.keys()):
        minutes_list = sorted(set(per_day[day_index]))
        if not minutes_list:
            continue

        day_name = DAY_ORDER[day_index]
        current_start = minutes_list[0]
        previous = current_start

        for minute in minutes_list[1:]:
            if minute == previous + 30:
                previous = minute
                continue
            blocks.setdefault(day_name, []).append(
                {
                    "start_time": _format_time(current_start),
                    "end_time": _format_time(previous + 30),
                }
            )
            current_start = minute
            previous = minute

        blocks.setdefault(day_name, []).append(
            {
                "start_time": _format_time(current_start),
                "end_time": _format_time(previous + 30),
            }
        )

    return blocks

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

# 팀 전체의 공통 가능한 시간대 계산
@available_bp.route("/team/<int:team_id>", methods=["GET"])
@jwt_required()
def get_team_common_times(team_id):
    team_recruitment = TeamRecruitment.query.get(team_id)
    if not team_recruitment:
        return jsonify({"msg": "해당 팀을 찾을 수 없습니다."}), 404

    team_members = TeamRecruitmentMember.query.filter_by(recruitment_id=team_id).all()
    if not team_members:
        return jsonify({
            "team_id": team_id,
            "team_board_name": team_recruitment.team_board_name,
            "course_id": team_recruitment.course_id,
            "team_size": 0,
            "members": [],
            "optimal_slots": [],
            "daily_blocks": {},
        })

    member_ids = [m.user_id for m in team_members]
    all_times = AvailableTime.query.filter(AvailableTime.user_id.in_(member_ids)).all()

    user_times = defaultdict(list)
    for time_slot in all_times:
        user_times[time_slot.user_id].append(time_slot)

    members_payload = []
    member_slot_sets = []
    slot_counts = {}
    total_members = len(member_ids)

    for member in team_members:
        user = member.user
        if not user:
            continue

        times_for_user = user_times.get(user.id, [])
        payload = {
            "user_id": user.id,
            "name": user.name,
            "student_id": user.student_id if user.user_type == "student" else None,
            "user_type": user.user_type,
            "times": [t.to_dict() for t in times_for_user]
        }
        members_payload.append(payload)

        slot_set = build_time_slots(times_for_user)
        member_slot_sets.append(slot_set)

        for slot in slot_set:
            slot_counts[slot] = slot_counts.get(slot, 0) + 1

    if len(member_slot_sets) == 0:
        optimal_slots = set()
    else:
        # 빈 슬롯이 하나라도 있으면 공통 시간은 없음
        if any(len(s) == 0 for s in member_slot_sets):
            optimal_slots = set()
        else:
            # 기준은 가장 작은 슬롯 집합
            member_slot_sets.sort(key=len)
            base_slots = member_slot_sets[0]
            optimal_slots = {slot for slot in base_slots if all(slot in slots for slots in member_slot_sets)}

    daily_blocks = build_daily_blocks_from_slots(optimal_slots)

    return jsonify({
        "team_id": team_id,
        "team_board_name": team_recruitment.team_board_name,
        "course_id": team_recruitment.course_id,
        "team_size": total_members,
        "members": members_payload,
        "optimal_slots": sorted(optimal_slots),
        "slot_counts": slot_counts,
        "daily_blocks": daily_blocks,
    })

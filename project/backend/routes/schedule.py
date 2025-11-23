from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Schedule

schedule_bp = Blueprint("schedule", __name__, url_prefix="/schedule")


# 사용자의 모든 일정 조회 (년/월 필터링)
@schedule_bp.route("/", methods=["GET"])
@jwt_required()
def get_schedules():
    user_id = get_jwt_identity()
    
    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)
    
    query = Schedule.query.filter_by(user_id=user_id)
    
    if year and month:
        query = query.filter_by(year=year, month=month)
    
    schedules = query.all()
    return jsonify([s.to_dict() for s in schedules]), 200


# 일정 생성
@schedule_bp.route("/", methods=["POST"])
@jwt_required()
def create_schedule():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get("title") or not data.get("date") or not data.get("month") or not data.get("year"):
        return jsonify({"message": "제목, 날짜, 월, 년도는 필수입니다."}), 400
    
    try:
        new_schedule = Schedule(
            user_id=int(user_id),
            title=data["title"],
            date=data["date"],
            month=data["month"],
            year=data["year"],
            color=data.get("color", "#a8d5e2"),
            category=data.get("category", "")
        )
        
        db.session.add(new_schedule)
        db.session.commit()
        
        return jsonify(new_schedule.to_dict()), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"일정 생성 실패: {str(e)}"}), 500


# 일정 수정
@schedule_bp.route("/<int:schedule_id>", methods=["PUT"])
@jwt_required()
def update_schedule(schedule_id):
    user_id = get_jwt_identity()
    schedule = Schedule.query.get(schedule_id)
    
    if not schedule:
        return jsonify({"message": "일정을 찾을 수 없습니다."}), 404
    
    if schedule.user_id != int(user_id):
        return jsonify({"message": "권한이 없습니다."}), 403
    
    data = request.get_json()
    
    try:
        if "title" in data:
            schedule.title = data["title"]
        if "date" in data:
            schedule.date = data["date"]
        if "month" in data:
            schedule.month = data["month"]
        if "year" in data:
            schedule.year = data["year"]
        if "color" in data:
            schedule.color = data["color"]
        if "category" in data:
            schedule.category = data["category"]
        
        db.session.commit()
        
        return jsonify(schedule.to_dict()), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"일정 수정 실패: {str(e)}"}), 500


# 일정 삭제
@schedule_bp.route("/<int:schedule_id>", methods=["DELETE"])
@jwt_required()
def delete_schedule(schedule_id):
    user_id = get_jwt_identity()
    schedule = Schedule.query.get(schedule_id)
    
    if not schedule:
        return jsonify({"message": "일정을 찾을 수 없습니다."}), 404
    
    if schedule.user_id != int(user_id):
        return jsonify({"message": "권한이 없습니다."}), 403
    
    try:
        db.session.delete(schedule)
        db.session.commit()
        return jsonify({"message": "일정이 삭제되었습니다."}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"일정 삭제 실패: {str(e)}"}), 500


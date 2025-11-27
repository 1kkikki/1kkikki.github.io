from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Course, User, Enrollment, Notification

course_bp = Blueprint("course", __name__, url_prefix="/course")

# 강의 목록 조회 (교수 본인의 강의)
@course_bp.route("/my", methods=["GET"])
@jwt_required()
def get_my_courses():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.user_type != 'professor':
        return jsonify({"message": "교수만 접근 가능합니다."}), 403
    
    courses = Course.query.filter_by(professor_id=user_id).order_by(Course.created_at.desc()).all()
    return jsonify([c.to_dict() for c in courses]), 200


# 강의 생성 (교수만 가능)
@course_bp.route("/", methods=["POST"])
@jwt_required()
def create_course():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.user_type != 'professor':
        return jsonify({"message": "교수만 강의를 생성할 수 있습니다."}), 403
    
    data = request.get_json()
    
    title = data.get("title", "").strip()
    code = data.get("code", "").strip()
    
    if not title or not code:
        return jsonify({"message": "강의명과 강의코드를 입력해주세요."}), 400
    
    # 강의 코드 중복 확인
    existing = Course.query.filter_by(code=code).first()
    if existing:
        return jsonify({"message": "이미 존재하는 강의 코드입니다."}), 400
    
    new_course = Course(
        title=title,
        code=code,
        professor_id=user_id
    )
    
    db.session.add(new_course)
    db.session.commit()
    
    return jsonify({
        "message": "강의가 생성되었습니다.",
        "course": new_course.to_dict()
    }), 201


# 강의 삭제 (교수 본인만 가능)
@course_bp.route("/<int:course_id>", methods=["DELETE"])
@jwt_required()
def delete_course(course_id):
    user_id = get_jwt_identity()
    course = Course.query.get(course_id)
    
    if not course:
        return jsonify({"message": "존재하지 않는 강의입니다."}), 404
    
    if course.professor_id != int(user_id):
        return jsonify({"message": "본인의 강의만 삭제할 수 있습니다."}), 403
    
    # 강의에 연결된 수강 신청 데이터를 먼저 삭제
    Enrollment.query.filter_by(course_id=course_id).delete()
    
    db.session.delete(course)
    db.session.commit()
    
    return jsonify({"message": "강의가 삭제되었습니다."}), 200


# 모든 강의 조회 (학생이 강의 참여할 때 사용)
@course_bp.route("/all", methods=["GET"])
@jwt_required()
def get_all_courses():
    courses = Course.query.order_by(Course.created_at.desc()).all()
    return jsonify([c.to_dict() for c in courses]), 200


# 강의 참여 (학생)
@course_bp.route("/enroll/<int:course_id>", methods=["POST"])
@jwt_required()
def enroll_course(course_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.user_type != 'student':
        return jsonify({"message": "학생만 강의에 참여할 수 있습니다."}), 403
    
    # 강의 존재 확인
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"message": "존재하지 않는 강의입니다."}), 404
    
    # 이미 수강 중인지 확인
    existing = Enrollment.query.filter_by(student_id=user_id, course_id=course_id).first()
    if existing:
        return jsonify({"message": "이미 수강 중인 강의입니다."}), 400
    
    # 수강 신청
    enrollment = Enrollment(student_id=user_id, course_id=course_id)
    db.session.add(enrollment)
    db.session.commit()
    
    # 🔔 교수에게 알림 전송
    notification = Notification(
        user_id=course.professor_id,
        type="enrollment",
        content=f"[{course.title}] {user.name}({user.student_id})님이 강의에 참여했습니다.",
        related_id=course_id,
        course_id=course.code
    )
    db.session.add(notification)
    db.session.commit()
    
    return jsonify({
        "message": "강의 참여 완료!",
        "enrollment": enrollment.to_dict()
    }), 201


# 학생의 수강 강의 목록 조회
@course_bp.route("/enrolled", methods=["GET"])
@jwt_required()
def get_enrolled_courses():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.user_type != 'student':
        return jsonify({"message": "학생만 접근 가능합니다."}), 403
    
    enrollments = Enrollment.query.filter_by(student_id=user_id).order_by(Enrollment.enrolled_at.desc()).all()
    courses = [e.course.to_dict() for e in enrollments if e.course]
    
    return jsonify(courses), 200


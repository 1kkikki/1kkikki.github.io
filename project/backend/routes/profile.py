from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, bcrypt
from models import (
    User,
    AvailableTime,
    Enrollment,
    Course,
    CourseBoardPost,
    CourseBoardComment,
    CourseBoardLike,
    CourseBoardCommentLike,
    TeamRecruitment,
    TeamRecruitmentMember,
    Schedule,
    Notification,
)

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


# -----------------------------------------
# 회원탈퇴
# -----------------------------------------
@profile_bp.route("/delete", methods=["DELETE"])
@jwt_required()
def delete_account():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404

    data = request.get_json() or {}
    identifier = data.get("identifier", "").strip()
    password = data.get("password", "").strip()

    if not identifier or not password:
        return jsonify({"error": "아이디(또는 이메일)와 비밀번호를 모두 입력해주세요."}), 400

    # identifier 는 username / email / student_id 중 하나와 일치해야 함
    if identifier not in {user.username, user.email, user.student_id}:
        return jsonify({"error": "아이디 또는 이메일이 현재 계정 정보와 일치하지 않습니다."}), 400

    # 비밀번호 검증
    if not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "비밀번호가 올바르지 않습니다."}), 400

    # 교수 계정인 경우: 담당 강의가 남아 있으면 탈퇴 불가 처리
    if user.user_type == "professor":
        owned_courses = Course.query.filter_by(professor_id=user_id).count()
        if owned_courses > 0:
            return jsonify({
                "error": "담당 중인 강의가 있어 탈퇴할 수 없습니다. 강의를 먼저 삭제한 후 다시 시도해주세요."
            }), 400

    # ------------------------------
    # 연관 데이터 정리
    # ------------------------------
    # 알림
    Notification.query.filter_by(user_id=user_id).delete()

    # 가능한 시간
    AvailableTime.query.filter_by(user_id=user_id).delete()

    # 개인 일정
    Schedule.query.filter_by(user_id=user_id).delete()

    # 수강 정보(학생)
    Enrollment.query.filter_by(student_id=user_id).delete()

    # 팀 모집 참여자
    TeamRecruitmentMember.query.filter_by(user_id=user_id).delete()

    # 내가 작성한 팀 모집 글과 그 참여자
    my_recruits = TeamRecruitment.query.filter_by(author_id=user_id).all()
    for recruit in my_recruits:
        TeamRecruitmentMember.query.filter_by(recruitment_id=recruit.id).delete()
        db.session.delete(recruit)

    # 내가 누른 댓글 좋아요
    CourseBoardCommentLike.query.filter_by(user_id=user_id).delete()

    # 내가 누른 게시글 좋아요
    CourseBoardLike.query.filter_by(user_id=user_id).delete()

    # 내가 작성한 댓글
    CourseBoardComment.query.filter_by(author_id=user_id).delete()

    # 내가 작성한 게시글(관련 댓글/좋아요 포함)
    my_posts = CourseBoardPost.query.filter_by(author_id=user_id).all()
    for post in my_posts:
        CourseBoardComment.query.filter_by(post_id=post.id).delete()
        CourseBoardLike.query.filter_by(post_id=post.id).delete()
        db.session.delete(post)

    # 마지막으로 사용자 삭제
    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "회원탈퇴가 완료되었습니다."}), 200
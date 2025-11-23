from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import TeamRecruitment, TeamRecruitmentMember

recruit_bp = Blueprint("recruit", __name__)


# 모집 글 목록 조회
@recruit_bp.route("/<string:course_id>", methods=["GET"])
@jwt_required()
def list_recruitments(course_id):
    user_id = int(get_jwt_identity())
    recruitments = (
        TeamRecruitment.query.filter_by(course_id=course_id)
        .order_by(TeamRecruitment.id.desc())
        .all()
    )
    return jsonify([r.to_dict(user_id=user_id) for r in recruitments]), 200


# 모집 글 작성
@recruit_bp.route("/", methods=["POST"])
@jwt_required()
def create_recruitment():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    course_id = data.get("course_id")
    title = data.get("title")
    description = data.get("description")
    max_members = data.get("max_members")

    if not course_id or not title or not description:
        return jsonify({"message": "필수 값이 누락되었습니다."}), 400

    try:
        max_members = int(max_members)
    except (TypeError, ValueError):
        return jsonify({"message": "max_members는 숫자여야 합니다."}), 400

    if max_members < 2:
        return jsonify({"message": "인원수는 최소 2명 이상이어야 합니다."}), 400

    recruitment = TeamRecruitment(
        course_id=course_id,
        author_id=user_id,
        title=title,
        description=description,
        max_members=max_members,
    )
    db.session.add(recruitment)
    db.session.commit()

    # 작성자는 자동으로 멤버로 추가
    member = TeamRecruitmentMember(recruitment_id=recruitment.id, user_id=user_id)
    db.session.add(member)
    db.session.commit()

    return (
        jsonify(
            {
                "message": "모집글 작성 완료",
                "recruitment": recruitment.to_dict(user_id=user_id),
            }
        ),
        201,
    )


# 모집 글 삭제 (작성자만)
@recruit_bp.route("/<int:recruitment_id>", methods=["DELETE"])
@jwt_required()
def delete_recruitment(recruitment_id):
    user_id = int(get_jwt_identity())
    recruitment = TeamRecruitment.query.get(recruitment_id)

    if not recruitment:
        return jsonify({"message": "존재하지 않는 모집글입니다."}), 404

    if recruitment.author_id != user_id:
        return jsonify({"message": "본인의 모집글만 삭제할 수 있습니다."}), 403

    # 참여자 먼저 삭제
    TeamRecruitmentMember.query.filter_by(recruitment_id=recruitment_id).delete()

    db.session.delete(recruitment)
    db.session.commit()

    return jsonify({"message": "모집글 삭제 완료"}), 200


# 모집 참여 / 취소 토글
@recruit_bp.route("/<int:recruitment_id>/join", methods=["POST"])
@jwt_required()
def toggle_join(recruitment_id):
    user_id = int(get_jwt_identity())

    recruitment = TeamRecruitment.query.get(recruitment_id)
    if not recruitment:
        return jsonify({"message": "존재하지 않는 모집글입니다."}), 404

    # 이미 참여 중인지 확인
    existing = TeamRecruitmentMember.query.filter_by(
        recruitment_id=recruitment_id, user_id=user_id
    ).first()

    if existing:
        # 참여 취소
        db.session.delete(existing)
        db.session.commit()
    else:
        # 정원 체크
        current_count = TeamRecruitmentMember.query.filter_by(
            recruitment_id=recruitment_id
        ).count()
        if current_count >= recruitment.max_members:
            return jsonify({"message": "이미 인원이 가득 찼습니다."}), 400

        new_member = TeamRecruitmentMember(
            recruitment_id=recruitment_id, user_id=user_id
        )
        db.session.add(new_member)
        db.session.commit()

    # 최신 상태 다시 계산해서 내려주기
    updated = TeamRecruitment.query.get(recruitment_id)
    return (
        jsonify(
            {
                "message": "참여 상태 변경",
                "recruitment": updated.to_dict(user_id=user_id),
            }
        ),
        200,
    )



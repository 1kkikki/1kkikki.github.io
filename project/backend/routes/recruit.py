from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import TeamRecruitment, TeamRecruitmentMember, User, Notification, Course, CourseBoardPost

recruit_bp = Blueprint("recruit", __name__, url_prefix="/recruit")


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

    # 교수는 모집글 작성 불가
    user = User.query.get(user_id)
    if user and user.user_type == "professor":
        return jsonify({"message": "교수는 모집글을 작성할 수 없습니다."}), 403

    course_id = data.get("course_id")
    title = data.get("title")
    description = data.get("description")
    team_board_name = data.get("team_board_name")
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
        team_board_name=team_board_name,
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
        # 참여 취소 - 팀 게시판이 활성화된 경우 취소 불가
        if recruitment.is_board_activated:
            return jsonify({"message": "팀 게시판이 활성화되어 참여 취소할 수 없습니다."}), 400
        
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
        
        # 🔔 모집 작성자에게 알림 (본인이 아닌 경우에만)
        if recruitment.author_id != int(user_id):
            joiner = User.query.get(user_id)
            course = Course.query.filter_by(code=recruitment.course_id).first()
            course_title = course.title if course else recruitment.course_id
            
            notification = Notification(
                user_id=recruitment.author_id,
                type="recruitment_join",
                content=f"[{course_title}] 모집 \"{recruitment.title[:20]}{'...' if len(recruitment.title) > 20 else ''}\" 에 {joiner.name}님이 참여했습니다.",
                related_id=recruitment_id,
                course_id=recruitment.course_id
            )
            db.session.add(notification)
            db.session.commit()
        
        # ✨ 인원이 다 차면 자동으로 팀 게시판 활성화
        current_count = TeamRecruitmentMember.query.filter_by(
            recruitment_id=recruitment_id
        ).count()
        
        if current_count >= recruitment.max_members and not recruitment.is_board_activated:
            # 팀 게시판 자동 활성화
            recruitment.is_board_activated = True
            db.session.commit()
            
            # 🔔 팀원 전체에게 활성화 알림 전송
            course = Course.query.filter_by(code=recruitment.course_id).first()
            course_title = course.title if course else recruitment.course_id
            
            # 모든 팀원에게 알림 전송
            all_members = TeamRecruitmentMember.query.filter_by(
                recruitment_id=recruitment_id
            ).all()
            
            for member in all_members:
                notification = Notification(
                    user_id=member.user_id,
                    type="team_board_activated",
                    content=f"[{course_title}] 모집 \"{recruitment.title[:20]}{'...' if len(recruitment.title) > 20 else ''}\"의 인원이 마감되어 팀 게시판이 활성화되었습니다!",
                    related_id=recruitment_id,
                    course_id=recruitment.course_id
                )
                db.session.add(notification)
            
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


# 활성화된 팀 게시판 목록 조회 (참여한 팀만)
@recruit_bp.route("/<string:course_id>/team-boards", methods=["GET"])
@jwt_required()
def list_team_boards(course_id):
    """현재 사용자가 참여한 활성화된 팀 게시판 목록 반환"""
    user_id = int(get_jwt_identity())
    
    # 사용자가 참여한 모집글의 ID들 가져오기
    member_recruitments = (
        TeamRecruitmentMember.query.filter_by(user_id=user_id)
        .with_entities(TeamRecruitmentMember.recruitment_id)
        .all()
    )
    recruitment_ids = [m.recruitment_id for m in member_recruitments]
    
    # 활성화되고 사용자가 참여한 팀 게시판만 조회
    team_boards = (
        TeamRecruitment.query.filter(
            TeamRecruitment.course_id == course_id,
            TeamRecruitment.is_board_activated == True,
            TeamRecruitment.id.in_(recruitment_ids)
        )
        .order_by(TeamRecruitment.id.desc())
        .all()
    )
    
    return jsonify([tb.to_dict(user_id=user_id) for tb in team_boards]), 200


# 팀 게시판 활성화
@recruit_bp.route("/<int:recruitment_id>/activate-team-board", methods=["POST"])
@jwt_required()
def activate_team_board(recruitment_id):
    user_id = int(get_jwt_identity())
    recruitment = TeamRecruitment.query.get(recruitment_id)

    if not recruitment:
        return jsonify({"message": "존재하지 않는 모집글입니다."}), 404

    if recruitment.author_id != user_id:
        return jsonify({"message": "본인의 모집글만 활성화할 수 있습니다."}), 403

    if not recruitment.team_board_name:
        return jsonify({"message": "팀게시판 이름이 설정되지 않았습니다."}), 400

    # 이미 활성화된 팀 게시판인지 확인
    if recruitment.is_board_activated:
        return jsonify({"message": "이미 활성화된 팀 게시판입니다."}), 400

    # 현재 참여 인원수 계산
    current_members_count = TeamRecruitmentMember.query.filter_by(
        recruitment_id=recruitment_id
    ).count()
    
    # 팀 게시판 활성화 시 자동으로 마감 처리 (max_members를 현재 인원수로 설정)
    recruitment.max_members = current_members_count
    recruitment.is_board_activated = True
    
    db.session.commit()
    
    # 🔔 팀원 전체에게 활성화 알림 전송 (수동 활성화)
    course = Course.query.filter_by(code=recruitment.course_id).first()
    course_title = course.title if course else recruitment.course_id
    
    # 모든 팀원에게 알림 전송 (리더 포함)
    all_members = TeamRecruitmentMember.query.filter_by(
        recruitment_id=recruitment_id
    ).all()
    
    for member in all_members:
        notification = Notification(
            user_id=member.user_id,
            type="team_board_activated",
            content=f"[{course_title}] 모집 \"{recruitment.title[:20]}{'...' if len(recruitment.title) > 20 else ''}\"의 팀 게시판이 활성화되었습니다!",
            related_id=recruitment_id,
            course_id=recruitment.course_id
        )
        db.session.add(notification)
    
    db.session.commit()

    return (
        jsonify(
            {
                "message": "팀 게시판이 활성화되었습니다.",
                "recruitment": recruitment.to_dict(user_id=user_id),
            }
        ),
        201,
    )



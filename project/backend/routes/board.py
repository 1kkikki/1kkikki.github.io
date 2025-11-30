import os
import json
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import CourseBoardPost, CourseBoardComment, CourseBoardLike, CourseBoardCommentLike, User, Course, Enrollment, Notification, TeamRecruitment, TeamRecruitmentMember, Poll, PollOption, PollVote

board_bp = Blueprint("board", __name__, url_prefix="/board")

# =====================================================
# 게시물 존재 확인 (알림용)
# =====================================================
@board_bp.route("/posts/<int:post_id>/exists", methods=["GET"])
@jwt_required()
def check_post_exists(post_id):
    """게시물 존재 여부 확인"""
    post = CourseBoardPost.query.get(post_id)
    return jsonify({"exists": post is not None}), 200

# =====================================================
# 댓글 존재 확인 (알림용)
# =====================================================
@board_bp.route("/comments/<int:comment_id>/exists", methods=["GET"])
@jwt_required()
def check_comment_exists(comment_id):
    """댓글 존재 여부 확인"""
    comment = CourseBoardComment.query.get(comment_id)
    return jsonify({"exists": comment is not None}), 200

# 파일 업로드 설정
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
ALLOWED_EXTENSIONS = {
    'image': {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'},
    'video': {'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'},
    'file': {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', 'hwp'}
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# 업로드 폴더 생성
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename, file_type='file'):
    """파일 확장자 확인"""
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    # 모든 허용된 확장자 확인
    all_allowed = set()
    for extensions in ALLOWED_EXTENSIONS.values():
        all_allowed.update(extensions)
    return ext in all_allowed

def get_file_type(filename):
    """파일 타입 확인 (image, video, file)"""
    if '.' not in filename:
        return 'file'
    ext = filename.rsplit('.', 1)[1].lower()
    if ext in ALLOWED_EXTENSIONS['image']:
        return 'image'
    elif ext in ALLOWED_EXTENSIONS['video']:
        return 'video'
    else:
        return 'file'

# 파일 업로드
@board_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_file():
    """파일 업로드 엔드포인트"""
    if 'file' not in request.files:
        return jsonify({"message": "파일이 없습니다."}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "파일이 선택되지 않았습니다."}), 400
    
    # 파일 크기 확인
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        return jsonify({"message": "파일 크기는 50MB를 초과할 수 없습니다."}), 400
    
    # 파일 타입 확인
    file_type = get_file_type(file.filename)
    if not allowed_file(file.filename):
        return jsonify({"message": "허용되지 않는 파일 형식입니다."}), 400
    
    # 안전한 파일명 생성
    filename = secure_filename(file.filename)
    # 중복 방지를 위해 타임스탬프 추가
    import time
    timestamp = int(time.time() * 1000)
    name, ext = os.path.splitext(filename)
    filename = f"{name}_{timestamp}{ext}"
    
    # 파일 저장
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)
    
    return jsonify({
        "message": "파일 업로드 완료",
        "file": {
            "filename": filename,
            "original_name": file.filename,
            "type": file_type,
            "size": file_size,
            "url": f"/board/files/{filename}"
        }
    }), 201

# 파일 다운로드
@board_bp.route("/files/<filename>", methods=["GET"])
def download_file(filename):
    """파일 다운로드 엔드포인트"""
    # 원본 파일명 찾기
    original_name = None
    
    # 모든 게시글에서 해당 파일명을 가진 파일 찾기
    posts = CourseBoardPost.query.all()
    for post in posts:
        if post.files:
            try:
                files_data = json.loads(post.files)
                for file_info in files_data:
                    if file_info.get('filename') == filename:
                        original_name = file_info.get('original_name')
                        break
                if original_name:
                    break
            except:
                continue
    
    # 원본 파일명이 있으면 그걸로, 없으면 서버 파일명으로 다운로드
    download_name = original_name if original_name else filename
    
    # 브라우저에서 바로 열 수 있는 타입(PDF, 이미지 등)이라도
    # 항상 다운로드가 되도록 as_attachment 옵션을 사용
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True, download_name=download_name)

# 글 작성
@board_bp.route("/", methods=["POST"])
@jwt_required()
def create_post():
    user_id = get_jwt_identity()
    data = request.get_json()

    # 파일 정보 처리
    files_data = data.get("files", [])
    files_json = json.dumps(files_data) if files_data else None

    post = CourseBoardPost(
        course_id=data["course_id"],
        author_id=user_id,
        title=data["title"],
        content=data["content"],
        category=data["category"],
        team_board_name=data.get("team_board_name"),  # 팀 게시판 이름 (team 카테고리인 경우)
        files=files_json
    )
    db.session.add(post)
    db.session.flush()  # post.id를 얻기 위해 flush

    # Poll 데이터 처리
    poll_data = data.get("poll")
    if poll_data and poll_data.get("question") and poll_data.get("options"):
        from datetime import datetime as dt
        expires_at = None
        if poll_data.get("expires_at"):
            try:
                expires_at = dt.fromisoformat(poll_data["expires_at"].replace('Z', '+00:00'))
            except:
                pass
        
        poll = Poll(
            post_id=post.id,
            question=poll_data["question"],
            expires_at=expires_at
        )
        db.session.add(poll)
        db.session.flush()  # poll.id를 얻기 위해 flush
        
        # Poll 옵션 추가
        for opt in poll_data["options"]:
            if opt.get("text") and opt["text"].strip():
                poll_option = PollOption(
                    poll_id=poll.id,
                    text=opt["text"].strip()
                )
                db.session.add(poll_option)
    
    db.session.commit()

    # 🔔 공지사항인 경우 수강생 전원에게 알림
    if data["category"] == "notice":
        # 해당 강의를 수강하는 모든 학생 찾기
        course = Course.query.filter_by(code=data["course_id"]).first()
        if course:
            enrollments = Enrollment.query.filter_by(course_id=course.id).all()
            
            # 각 학생에게 알림 전송
            for enrollment in enrollments:
                notification = Notification(
                    user_id=enrollment.student_id,
                    type="notice",
                    content=f"[{course.title}] 새로운 공지사항이 등록되었습니다: {data['title']}",
                    related_id=post.id,
                    course_id=data["course_id"]
                )
                db.session.add(notification)
            
            db.session.commit()

    # 🔔 팀 게시판인 경우 팀 멤버들에게만 알림
    if data["category"] == "team" and data.get("team_board_name"):
        # team_board_name으로 해당 팀 모집글 찾기
        team_recruitment = TeamRecruitment.query.filter_by(
            course_id=data["course_id"],
            team_board_name=data["team_board_name"]
        ).first()
        
        if team_recruitment:
            # 해당 팀의 멤버들 찾기
            team_members = TeamRecruitmentMember.query.filter_by(
                recruitment_id=team_recruitment.id
            ).all()
            
            # 강의 정보 가져오기
            course = Course.query.filter_by(code=data["course_id"]).first()
            course_title = course.title if course else data["course_id"]
            
            # 각 팀 멤버에게 알림 전송 (작성자 본인 제외)
            for member in team_members:
                if member.user_id != int(user_id):  # 작성자 본인은 제외
                    notification = Notification(
                        user_id=member.user_id,
                        type="team_post",
                        content=f"[{course_title}] {data['team_board_name']} 새 글이 작성되었습니다: {data['title']}",
                        related_id=post.id,
                        course_id=data["course_id"]
                    )
                    db.session.add(notification)
            
            db.session.commit()

    return jsonify({"msg": "글 작성 완료", "post": post.to_dict(user_id=int(user_id))}), 201


# 글 목록 조회
@board_bp.route("/course/<string:course_id>", methods=["GET"])
@jwt_required()
def get_posts(course_id):
    user_id = get_jwt_identity()
    # 고정된 게시물을 먼저, 그 다음 최신순으로 정렬
    posts = CourseBoardPost.query.filter_by(course_id=course_id).order_by(
        CourseBoardPost.is_pinned.desc(),  # 고정된 게시물이 먼저
        CourseBoardPost.id.desc()  # 그 다음 최신순
    ).all()
    return jsonify([p.to_dict(user_id=int(user_id)) for p in posts])


# 글 수정 및 삭제 (같은 경로, 다른 메서드)
@board_bp.route("/post/<int:post_id>", methods=["PUT", "DELETE"])
@jwt_required()
def update_or_delete_post(post_id):
    user_id = get_jwt_identity()
    post = CourseBoardPost.query.get(post_id)
    
    if not post:
        return jsonify({"message": "존재하지 않는 글"}), 404
    
    # 본인이 작성한 글만 수정/삭제 가능
    if post.author_id != int(user_id):
        return jsonify({"message": "본인의 글만 수정/삭제할 수 있습니다."}), 403
    
    # DELETE 메서드인 경우
    if request.method == "DELETE":
        # 첨부파일 삭제
        if post.files:
            try:
                files_data = json.loads(post.files)
                for file_info in files_data:
                    filename = file_info.get('filename')
                    if filename:
                        file_path = os.path.join(UPLOAD_FOLDER, filename)
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            print(f"파일 삭제됨: {filename}")
            except Exception as e:
                print(f"파일 삭제 중 오류: {e}")
                # 파일 삭제 실패해도 게시글은 삭제 진행

        # 관련된 댓글과 좋아요 먼저 삭제
        CourseBoardComment.query.filter_by(post_id=post_id).delete()
        CourseBoardLike.query.filter_by(post_id=post_id).delete()
        
        # Poll 관련 데이터 삭제
        poll = Poll.query.filter_by(post_id=post_id).first()
        if poll:
            PollVote.query.filter_by(poll_id=poll.id).delete()
            PollOption.query.filter_by(poll_id=poll.id).delete()
            db.session.delete(poll)
        
        # 게시글 삭제
        db.session.delete(post)
        db.session.commit()
        return jsonify({"msg": "삭제 완료"})
    
    # PUT 메서드인 경우 (수정)
    data = request.get_json()
    
    # 제목과 내용 업데이트
    if "title" in data:
        post.title = data["title"]
    if "content" in data:
        post.content = data["content"]
    
    # 파일 정보 업데이트
    if "files" in data:
        files_data = data.get("files", [])
        files_json = json.dumps(files_data) if files_data else None
        post.files = files_json
    
    # Poll 데이터 업데이트
    if "poll" in data:
        poll_data = data.get("poll")
        existing_poll = Poll.query.filter_by(post_id=post_id).first()
        
        if poll_data and poll_data.get("question") and poll_data.get("options"):
            # Poll 업데이트 또는 생성
            from datetime import datetime as dt
            expires_at = None
            if poll_data.get("expires_at"):
                try:
                    expires_at = dt.fromisoformat(poll_data["expires_at"].replace('Z', '+00:00'))
                except:
                    pass
            
            if existing_poll:
                # 기존 Poll 업데이트
                existing_poll.question = poll_data["question"]
                existing_poll.expires_at = expires_at
                # 기존 옵션 삭제 후 새로 추가
                PollVote.query.filter_by(poll_id=existing_poll.id).delete()
                PollOption.query.filter_by(poll_id=existing_poll.id).delete()
            else:
                # 새 Poll 생성
                existing_poll = Poll(
                    post_id=post_id,
                    question=poll_data["question"],
                    expires_at=expires_at
                )
                db.session.add(existing_poll)
            
            db.session.flush()
            
            # Poll 옵션 추가
            for opt in poll_data["options"]:
                if opt.get("text") and opt["text"].strip():
                    poll_option = PollOption(
                        poll_id=existing_poll.id,
                        text=opt["text"].strip()
                    )
                    db.session.add(poll_option)
        elif existing_poll:
            # Poll 제거
            PollVote.query.filter_by(poll_id=existing_poll.id).delete()
            PollOption.query.filter_by(poll_id=existing_poll.id).delete()
            db.session.delete(existing_poll)
    
    db.session.commit()
    
    return jsonify({"message": "글 수정 완료", "post": post.to_dict(user_id=int(user_id))}), 200


# 댓글 목록 조회
@board_bp.route("/post/<int:post_id>/comments", methods=["GET"])
@jwt_required()
def get_comments(post_id):
    user_id = int(get_jwt_identity())
    comments = CourseBoardComment.query.filter_by(post_id=post_id).order_by(CourseBoardComment.created_at.asc()).all()
    return jsonify([c.to_dict(user_id=user_id) for c in comments]), 200


# 댓글 작성
@board_bp.route("/post/<int:post_id>/comments", methods=["POST"])
@jwt_required()
def create_comment(post_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get("content"):
        return jsonify({"message": "댓글 내용을 입력해주세요."}), 400
    
    parent_comment_id = data.get("parent_comment_id")
    
    post = CourseBoardPost.query.get(post_id)
    if not post:
        return jsonify({"error": "게시글을 찾을 수 없습니다"}), 404
    
    comment = CourseBoardComment(
        post_id=post_id,
        author_id=user_id,
        content=data["content"],
        parent_comment_id=parent_comment_id
    )
    
    db.session.add(comment)
    db.session.commit()
    
    # 🔔 알림 생성
    current_user = User.query.get(user_id)
    course = Course.query.filter_by(code=post.course_id).first()
    course_title = course.title if course else post.course_id
    
    # 카테고리 한글 변환
    base_category_names = {
        "notice": "공지사항",
        "question": "질문게시판",
        "free": "자유게시판",
        "community": "커뮤니티",
    }

    # 팀 게시판은 팀게시판-[팀게시판 이름] 형식으로 표시
    if post.category == "team":
        if post.team_board_name:
            category_korean = f"팀게시판-{post.team_board_name}"
        else:
            category_korean = "팀게시판"
    else:
        # 매핑에 없으면 원래 값을 그대로 사용
        category_korean = base_category_names.get(post.category, post.category)
    
    # 댓글 내용 미리보기 (30자 제한)
    comment_preview = data["content"][:30] + "..." if len(data["content"]) > 30 else data["content"]
    
    if parent_comment_id:
        # 답글인 경우
        parent_comment = CourseBoardComment.query.get(parent_comment_id)

        # 1) 원 댓글 작성자에게 알림 (본인 제외)
        if parent_comment and parent_comment.author_id != int(user_id):
            notification = Notification(
                user_id=parent_comment.author_id,
                type="reply",
                content=f"[{course_title}] {category_korean} \"{post.title[:20]}{'...' if len(post.title) > 20 else ''}\" 게시글의 댓글에 답글이 달렸어요: {comment_preview}",
                related_id=post_id,
                comment_id=comment.id,
                course_id=post.course_id
            )
            db.session.add(notification)

        # 2) 게시글 작성자에게도 알림 (작성자가 답글 작성자가 아니고,
        #    이미 위에서 알림을 받은 댓글 작성자와도 다를 때)
        post_author_id = int(post.author_id)
        if post_author_id != int(user_id) and (not parent_comment or post_author_id != parent_comment.author_id):
            notification_for_post_author = Notification(
                user_id=post_author_id,
                type="reply",
                content=f"[{course_title}] {category_korean} \"{post.title[:20]}{'...' if len(post.title) > 20 else ''}\" 게시글의 댓글에 새로운 답글이 달렸어요: {comment_preview}",
                related_id=post_id,
                comment_id=comment.id,
                course_id=post.course_id
            )
            db.session.add(notification_for_post_author)

        db.session.commit()
    else:
        # 일반 댓글인 경우 - 게시글 작성자에게 알림 (본인 제외)
        if post.author_id != int(user_id):
            notification = Notification(
                user_id=post.author_id,
                type="comment",
                content=f"[{course_title}] {category_korean} \"{post.title[:20]}{'...' if len(post.title) > 20 else ''}\" 게시글에 댓글이 달렸어요: {comment_preview}",
                related_id=post_id,
                comment_id=comment.id,
                course_id=post.course_id
            )
            db.session.add(notification)
            db.session.commit()
    
    return jsonify({
        "message": "댓글 작성 완료",
        "comment": comment.to_dict(user_id=int(user_id))
    }), 201


# 댓글 삭제
@board_bp.route("/comments/<int:comment_id>", methods=["DELETE"])
@jwt_required()
def delete_comment(comment_id):
    user_id = get_jwt_identity()
    comment = CourseBoardComment.query.get(comment_id)
    
    if not comment:
        return jsonify({"message": "존재하지 않는 댓글입니다."}), 404
    
    if comment.author_id != int(user_id):
        return jsonify({"message": "본인의 댓글만 삭제할 수 있습니다."}), 403
    
    # 관련된 좋아요 먼저 삭제
    CourseBoardCommentLike.query.filter_by(comment_id=comment_id).delete()
    
    # 답글도 함께 삭제
    CourseBoardComment.query.filter_by(parent_comment_id=comment_id).delete()
    
    # 알림은 삭제하지 않음 (사용자가 "삭제된 댓글" 메시지를 볼 수 있도록)
    
    db.session.delete(comment)
    db.session.commit()
    
    return jsonify({"message": "댓글 삭제 완료"}), 200


# 좋아요 토글
@board_bp.route("/post/<int:post_id>/like", methods=["POST"])
@jwt_required()
def toggle_like(post_id):
    user_id = get_jwt_identity()
    
    # 게시글 존재 확인
    post = CourseBoardPost.query.get(post_id)
    if not post:
        return jsonify({"message": "존재하지 않는 게시글입니다."}), 404
    
    # 이미 좋아요 했는지 확인
    existing_like = CourseBoardLike.query.filter_by(post_id=post_id, user_id=user_id).first()
    
    if existing_like:
        # 좋아요 취소
        db.session.delete(existing_like)
        db.session.commit()
        likes_count = CourseBoardLike.query.filter_by(post_id=post_id).count()
        return jsonify({
            "message": "좋아요 취소",
            "is_liked": False,
            "likes": likes_count
        }), 200
    else:
        # 좋아요 추가
        new_like = CourseBoardLike(post_id=post_id, user_id=user_id)
        db.session.add(new_like)
        db.session.commit()
        
        likes_count = CourseBoardLike.query.filter_by(post_id=post_id).count()
        return jsonify({
            "message": "좋아요",
            "is_liked": True,
            "likes": likes_count
        }), 200


# 댓글 좋아요 토글
@board_bp.route("/comment/<int:comment_id>/like", methods=["POST"])
@jwt_required()
def toggle_comment_like(comment_id):
    user_id = int(get_jwt_identity())
    comment = CourseBoardComment.query.get(comment_id)
    
    if not comment:
        return jsonify({"message": "존재하지 않는 댓글"}), 404
    
    # 이미 좋아요를 눌렀는지 확인
    existing_like = CourseBoardCommentLike.query.filter_by(
        comment_id=comment_id,
        user_id=user_id
    ).first()
    
    if existing_like:
        # 좋아요 취소
        db.session.delete(existing_like)
        db.session.commit()
        likes_count = CourseBoardCommentLike.query.filter_by(comment_id=comment_id).count()
        return jsonify({
            "message": "좋아요 취소",
            "is_liked": False,
            "likes": likes_count
        }), 200
    else:
        # 좋아요 추가
        new_like = CourseBoardCommentLike(comment_id=comment_id, user_id=user_id)
        db.session.add(new_like)
        db.session.commit()
        likes_count = CourseBoardCommentLike.query.filter_by(comment_id=comment_id).count()
        return jsonify({
            "message": "좋아요",
            "is_liked": True,
            "likes": likes_count
        }), 200

# 투표하기
@board_bp.route("/post/<int:post_id>/poll/vote", methods=["POST"])
@jwt_required()
def vote_poll(post_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    option_id = data.get("option_id")
    
    if not option_id:
        return jsonify({"message": "옵션 ID가 필요합니다."}), 400
    
    # 게시글 존재 확인
    post = CourseBoardPost.query.get(post_id)
    if not post:
        return jsonify({"message": "존재하지 않는 게시글입니다."}), 404
    
    # Poll 존재 확인
    poll = Poll.query.filter_by(post_id=post_id).first()
    if not poll:
        return jsonify({"message": "투표가 존재하지 않습니다."}), 404
    
    # Poll 옵션 존재 확인
    option = PollOption.query.filter_by(id=option_id, poll_id=poll.id).first()
    if not option:
        return jsonify({"message": "유효하지 않은 투표 옵션입니다."}), 400
    
    # 마감 시간 확인
    from datetime import datetime
    if poll.expires_at and poll.expires_at < datetime.now():
        return jsonify({"message": "마감된 투표입니다."}), 400
    
    # 이미 투표했는지 확인
    existing_vote = PollVote.query.filter_by(poll_id=poll.id, user_id=user_id).first()
    if existing_vote:
        # 기존 투표 수정
        existing_vote.option_id = option_id
        db.session.commit()
    else:
        # 새 투표 추가
        new_vote = PollVote(
            poll_id=poll.id,
            option_id=option_id,
            user_id=user_id
        )
        db.session.add(new_vote)
        db.session.commit()
    
    # 업데이트된 투표 결과 반환
    options_data = []
    total_votes = 0
    for opt in poll.options_relation:
        votes = PollVote.query.filter_by(option_id=opt.id).all()
        votes_count = len(votes)
        total_votes += votes_count
        
        # 투표한 사용자 정보
        voters = []
        for vote in votes:
            user = User.query.get(vote.user_id)
            if user:
                # 교수 아이디(학번)는 숨기고, 학생인 경우에만 student_id 노출
                author_student_id = None
                if getattr(user, "user_type", None) == "student":
                    author_student_id = user.student_id
                
                is_professor = getattr(user, "user_type", None) == "professor"
                
                voters.append({
                    "id": user.id,
                    "name": user.name,
                    "student_id": author_student_id,
                    "is_professor": is_professor,
                    "profile_image": user.profile_image
                })
        
        options_data.append({
            "id": opt.id,
            "text": opt.text,
            "votes": votes_count,
            "voters": voters
        })
    
    vote = PollVote.query.filter_by(poll_id=poll.id, user_id=user_id).first()
    user_vote = vote.option_id if vote else None
    
    poll_result = {
        "id": poll.id,
        "question": poll.question,
        "options": options_data,
        "total_votes": total_votes,
        "user_vote": user_vote,
        "expires_at": poll.expires_at.isoformat() if poll.expires_at else None
    }
    
    return jsonify({
        "message": "투표 완료",
        "poll": poll_result
    }), 200

# 게시물 고정/고정 해제
@board_bp.route("/post/<int:post_id>/pin", methods=["POST"])
@jwt_required()
def toggle_pin_post(post_id):
    try:
        user_id = int(get_jwt_identity())
        post = CourseBoardPost.query.get(post_id)
        
        if not post:
            return jsonify({"message": "존재하지 않는 게시글입니다."}), 404
        
        # 강의 정보 가져오기 (선택적 - 권한 체크에 필요 없을 수도 있음)
        # course = Course.query.filter_by(code=post.course_id).first()
        # if not course:
        #     return jsonify({"message": "강의를 찾을 수 없습니다."}), 404
        
        # 사용자 정보 가져오기
        current_user = User.query.get(user_id)
        if not current_user:
            return jsonify({"message": "사용자를 찾을 수 없습니다."}), 404
        
        user_type = getattr(current_user, "user_type", None)
        
        # 카테고리별 권한 체크
        # 교수: notice(공지), community(커뮤니티)만 고정 가능
        # 학생: team(팀 게시판)만 고정 가능
        if user_type == "professor":
            if post.category not in ["notice", "community"]:
                return jsonify({"message": "교수는 공지사항과 커뮤니티 게시글만 고정할 수 있습니다."}), 403
        elif user_type == "student":
            if post.category != "team":
                return jsonify({"message": "학생은 팀 게시판 게시글만 고정할 수 있습니다."}), 403
        else:
            return jsonify({"message": "고정 권한이 없습니다."}), 403
        
        # 고정 상태 토글
        # 새로 고정하는 경우, 같은 카테고리와 강의의 다른 고정된 게시물들을 먼저 고정 해제
        # 계정 상관 없이 같은 카테고리 내에서 하나만 고정 가능
        if not post.is_pinned:
            # 같은 카테고리, 같은 강의의 다른 고정된 게시물들 찾기 (계정 상관 없이)
            # 팀 게시판인 경우에도 team_board_name 상관 없이 같은 카테고리 내에서 하나만 고정
            other_pinned_posts = CourseBoardPost.query.filter(
                CourseBoardPost.course_id == post.course_id,
                CourseBoardPost.category == post.category,
                CourseBoardPost.id != post_id,
                CourseBoardPost.is_pinned == True
            ).all()
            
            # 다른 고정된 게시물들 모두 고정 해제 (계정 상관 없이)
            for other_post in other_pinned_posts:
                other_post.is_pinned = False
                print(f"게시물 {other_post.id} 고정 해제됨 (새 게시물 {post_id} 고정으로 인해)")
        
        # 현재 게시물 고정 상태 토글
        post.is_pinned = not post.is_pinned
        db.session.commit()
        
        return jsonify({
            "message": "고정 완료" if post.is_pinned else "고정 해제 완료",
            "is_pinned": post.is_pinned,
            "post": post.to_dict(user_id=user_id)
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"게시물 고정 오류: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"message": f"게시물 고정 중 오류가 발생했습니다: {str(e)}"}), 500
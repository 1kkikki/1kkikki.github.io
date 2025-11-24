from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import CourseBoardPost, CourseBoardComment, CourseBoardLike, CourseBoardCommentLike, User, Course, Enrollment, Notification

board_bp = Blueprint("board", __name__)

# 글 작성
@board_bp.route("/", methods=["POST"])
@jwt_required()
def create_post():
    user_id = get_jwt_identity()
    data = request.get_json()

    post = CourseBoardPost(
        course_id=data["course_id"],
        author_id=user_id,
        title=data["title"],
        content=data["content"],
        category=data["category"]
    )
    db.session.add(post)
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

    return jsonify({"msg": "글 작성 완료", "post": post.to_dict()}), 201


# 글 목록 조회
@board_bp.route("/course/<string:course_id>", methods=["GET"])
@jwt_required()
def get_posts(course_id):
    user_id = get_jwt_identity()
    posts = CourseBoardPost.query.filter_by(course_id=course_id).order_by(CourseBoardPost.id.desc()).all()
    return jsonify([p.to_dict(user_id=int(user_id)) for p in posts])


# 글 삭제
@board_bp.route("/post/<int:post_id>", methods=["DELETE"])
@jwt_required()
def delete_post(post_id):
    user_id = get_jwt_identity()
    post = CourseBoardPost.query.get(post_id)
    if not post:
        return jsonify({"msg": "존재하지 않는 글"}), 404
    
    # 본인이 작성한 글만 삭제 가능
    if post.author_id != int(user_id):
        return jsonify({"msg": "본인의 글만 삭제할 수 있습니다."}), 403

    # 관련된 댓글과 좋아요 먼저 삭제
    CourseBoardComment.query.filter_by(post_id=post_id).delete()
    CourseBoardLike.query.filter_by(post_id=post_id).delete()
    
    # 게시글 삭제
    db.session.delete(post)
    db.session.commit()
    return jsonify({"msg": "삭제 완료"})


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
    category_names = {
        "notice": "공지사항",
        "question": "질문게시판",
        "free": "자유게시판",
        "team": "팀모집"
    }
    category_korean = category_names.get(post.category, post.category)
    
    # 댓글 내용 미리보기 (30자 제한)
    comment_preview = data["content"][:30] + "..." if len(data["content"]) > 30 else data["content"]
    
    if parent_comment_id:
        # 답글인 경우 - 원 댓글 작성자에게 알림 (본인 제외)
        parent_comment = CourseBoardComment.query.get(parent_comment_id)
        if parent_comment and parent_comment.author_id != int(user_id):
            notification = Notification(
                user_id=parent_comment.author_id,
                type="reply",
                content=f"[{course_title}] {category_korean} \"{post.title[:20]}{'...' if len(post.title) > 20 else ''}\" 게시글의 댓글에 답글이 달렸어요: {comment_preview}",
                related_id=post_id,
                course_id=post.course_id
            )
            db.session.add(notification)
            db.session.commit()
    else:
        # 일반 댓글인 경우 - 게시글 작성자에게 알림 (본인 제외)
        if post.author_id != int(user_id):
            notification = Notification(
                user_id=post.author_id,
                type="comment",
                content=f"[{course_title}] {category_korean} \"{post.title[:20]}{'...' if len(post.title) > 20 else ''}\" 게시글에 댓글이 달렸어요: {comment_preview}",
                related_id=post_id,
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

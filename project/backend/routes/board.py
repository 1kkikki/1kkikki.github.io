from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import CourseBoardPost, CourseBoardComment, CourseBoardLike, CourseBoardCommentLike, User

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
    
    comment = CourseBoardComment(
        post_id=post_id,
        author_id=user_id,
        content=data["content"],
        parent_comment_id=parent_comment_id
    )
    
    db.session.add(comment)
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

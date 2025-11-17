from flask import Blueprint, request, jsonify
from extensions import db
from models import Comment
from flask_jwt_extended import jwt_required, get_jwt_identity

comment_bp = Blueprint("comment", __name__)

# 댓글 불러오기
@comment_bp.get("/<int:post_id>")
def get_comments(post_id):
    comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.asc()).all()
    return jsonify([c.to_dict() for c in comments])


# 댓글 작성
@comment_bp.post("/")
@jwt_required()
def create_comment():
    data = request.json
    user_id = get_jwt_identity()

    comment = Comment(
        post_id=data["post_id"],
        author_id=user_id,
        content=data["content"]
    )

    db.session.add(comment)
    db.session.commit()

    return jsonify({"message": "Comment created", "comment": comment.to_dict()}), 201

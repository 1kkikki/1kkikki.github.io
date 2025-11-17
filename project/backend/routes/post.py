from flask import Blueprint, request, jsonify
from extensions import db
from models import Post
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User

post_bp = Blueprint("post", __name__)

# 전체 글 불러오기 (강의 + 타입별)
@post_bp.get("/")
def get_posts():
    course_id = request.args.get("course_id")
    type = request.args.get("type")

    query = Post.query
    if course_id:
        query = query.filter_by(course_id=course_id)
    if type:
        query = query.filter_by(type=type)

    posts = query.order_by(Post.is_pinned.desc(), Post.created_at.desc()).all()
    return jsonify([p.to_dict() for p in posts])


# 글 작성
@post_bp.post("/")
@jwt_required()
def create_post():
    data = request.json
    user_id = get_jwt_identity()

    post = Post(
        course_id=data["course_id"],
        author_id=user_id,
        type=data["type"],
        title=data["title"],
        content=data["content"]
    )

    db.session.add(post)
    db.session.commit()

    return jsonify({"message": "Post created", "post": post.to_dict()}), 201


# 글 삭제
@post_bp.delete("/<int:post_id>")
@jwt_required()
def delete_post(post_id):
    post = Post.query.get_or_404(post_id)
    user_id = get_jwt_identity()

    if post.author_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(post)
    db.session.commit()

    return jsonify({"message": "Post deleted"})

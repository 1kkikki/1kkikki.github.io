from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import CourseBoardPost, User

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
@board_bp.route("/<string:course_id>", methods=["GET"])
@jwt_required()
def get_posts(course_id):
    posts = CourseBoardPost.query.filter_by(course_id=course_id).order_by(CourseBoardPost.id.desc()).all()
    return jsonify([p.to_dict() for p in posts])


# 글 삭제
@board_bp.route("/<int:post_id>", methods=["DELETE"])
@jwt_required()
def delete_post(post_id):
    post = CourseBoardPost.query.get(post_id)
    if not post:
        return jsonify({"msg": "존재하지 않는 글"}), 404

    db.session.delete(post)
    db.session.commit()
    return jsonify({"msg": "삭제 완료"})

import os
import json
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import CourseBoardPost, CourseBoardComment, CourseBoardLike, CourseBoardCommentLike, User

board_bp = Blueprint("board", __name__)

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
    return send_from_directory(UPLOAD_FOLDER, filename)

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
        files=files_json
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

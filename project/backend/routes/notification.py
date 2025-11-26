from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Notification

notification_bp = Blueprint("notification", __name__, url_prefix="/notification")

# 내 알림 목록 조회
@notification_bp.route("/", methods=["GET"])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    
    # 읽지 않은 알림만 또는 최근 30개
    limit = request.args.get("limit", 30, type=int)
    notifications = Notification.query.filter_by(user_id=user_id)\
        .order_by(Notification.created_at.desc())\
        .limit(limit)\
        .all()
    
    return jsonify([n.to_dict() for n in notifications]), 200

# 알림 읽음 처리
@notification_bp.route("/<int:notification_id>/read", methods=["PUT"])
@jwt_required()
def mark_as_read(notification_id):
    user_id = get_jwt_identity()
    
    notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if not notification:
        return jsonify({"error": "알림을 찾을 수 없습니다"}), 404
    
    notification.is_read = True
    db.session.commit()
    
    return jsonify({"message": "알림을 읽음 처리했습니다"}), 200

# 모든 알림 읽음 처리
@notification_bp.route("/read-all", methods=["PUT"])
@jwt_required()
def mark_all_as_read():
    user_id = get_jwt_identity()
    
    Notification.query.filter_by(user_id=user_id, is_read=False)\
        .update({"is_read": True})
    db.session.commit()
    
    return jsonify({"message": "모든 알림을 읽음 처리했습니다"}), 200

# 알림 삭제
@notification_bp.route("/<int:notification_id>", methods=["DELETE"])
@jwt_required()
def delete_notification(notification_id):
    user_id = get_jwt_identity()
    
    notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if not notification:
        return jsonify({"error": "알림을 찾을 수 없습니다"}), 404
    
    db.session.delete(notification)
    db.session.commit()
    
    return jsonify({"message": "알림이 삭제되었습니다"}), 200


from extensions import db
from datetime import datetime


class TeamAvailabilitySubmission(db.Model):
    """
    팀 게시판별로 '이 팀에 대한 가능한 시간을 제출했다'는 사실만 기록하는 테이블.
    실제 시간 데이터는 기존 AvailableTime 테이블을 그대로 사용하고,
    이 테이블은 각 팀/사용자 조합이 한 번이라도 제출 버튼을 눌렀는지만 추적한다.
    """

    __tablename__ = "team_availability_submissions"

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey("team_recruitments.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.now)

    __table_args__ = (db.UniqueConstraint("team_id", "user_id", name="uq_team_user_submission"),)



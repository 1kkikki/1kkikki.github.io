from extensions import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    user_type = db.Column(db.String(20), nullable=False, default='student')  # 'student' or 'professor'
    profile_image = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "name": self.name,
            "email": self.email,
            "username": self.username,
            "user_type": self.user_type,
            "profile_image": self.profile_image,
            "user_type": self.user_type
        }

# 가능한 시간
class AvailableTime(db.Model):
    __tablename__ = "available_times"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey("team_recruitments.id"), nullable=True)  # null이면 대시보드용, 값이 있으면 해당 팀용
    day_of_week = db.Column(db.String(10), nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)

    user = db.relationship("User", backref=db.backref("available_times", lazy=True))
    team = db.relationship("TeamRecruitment", backref=db.backref("team_available_times", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "team_id": self.team_id,
            "day_of_week": self.day_of_week,
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
        }

# 강의
class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), nullable=False, unique=True)
    professor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    professor = db.relationship("User", backref=db.backref("courses", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "code": self.code,
            "professor_id": self.professor_id,
            "professor_name": self.professor.name if self.professor else None,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M")
        }

# 수강 신청 (학생-강의 관계)
class Enrollment(db.Model):
    __tablename__ = "enrollments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship("User", backref=db.backref("enrollments", lazy=True))
    course = db.relationship("Course", backref=db.backref("enrollments", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "course_id": self.course_id,
            "course": self.course.to_dict() if self.course else None,
            "enrolled_at": self.enrolled_at.strftime("%Y-%m-%d %H:%M")
        }

# 게시판
class CourseBoardPost(db.Model):
    __tablename__ = "course_board_posts"

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.String(20), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    team_board_name = db.Column(db.String(100), nullable=True)  # 팀 게시판 이름 (team 카테고리인 경우)
    files = db.Column(db.Text, nullable=True)  # JSON 문자열로 파일 정보 저장
    is_pinned = db.Column(db.Boolean, default=False, nullable=False)  # 게시물 고정 여부
    created_at = db.Column(db.DateTime, default=datetime.now)

    author = db.relationship("User")

    def to_dict(self, user_id=None):
        # 좋아요 개수 계산
        likes_count = CourseBoardLike.query.filter_by(post_id=self.id).count()
        # 현재 사용자가 좋아요 했는지 확인
        is_liked = False
        if user_id:
            is_liked = CourseBoardLike.query.filter_by(post_id=self.id, user_id=user_id).first() is not None
        
        # 댓글 개수 계산
        comments_count = CourseBoardComment.query.filter_by(post_id=self.id).count()
        
        # 교수/봇 아이디(학번)는 숨기고, 학생인 경우에만 student_id 노출
        author_student_id = None
        if self.author:
            user_type = getattr(self.author, "user_type", None)
            if user_type == "student":
                author_student_id = self.author.student_id
            # 봇 계정의 경우 student_id 숨김
            elif user_type == "bot":
                author_student_id = None

        # 교수 여부 확인
        is_professor = False
        if self.author and getattr(self.author, "user_type", None) == "professor":
            is_professor = True

        import json
        files_data = []
        if self.files:
            try:
                files_data = json.loads(self.files)
            except:
                files_data = []
        
        # Poll 데이터 조회 (Poll 모델이 파일 끝에 정의되어 있어서 동적으로 가져오기)
        poll_data = None
        try:
            # Poll 모델이 정의되어 있는지 확인
            import sys
            current_module = sys.modules[__name__]
            Poll = getattr(current_module, 'Poll', None)
            PollOption = getattr(current_module, 'PollOption', None)
            PollVote = getattr(current_module, 'PollVote', None)
            
            if Poll:
                poll = Poll.query.filter_by(post_id=self.id).first()
                if poll:
                    # 현재 사용자의 투표 여부 확인
                    user_vote = None
                    if user_id and PollVote:
                        vote = PollVote.query.filter_by(poll_id=poll.id, user_id=user_id).first()
                        if vote:
                            user_vote = vote.option_id
                    
                    # 투표 옵션과 득표 수, 투표한 사용자 정보
                    options_data = []
                    total_votes = 0
                    if hasattr(poll, 'options_relation') and PollVote:
                        for option in poll.options_relation:
                            votes = PollVote.query.filter_by(option_id=option.id).all()
                            votes_count = len(votes)
                            total_votes += votes_count
                            
                            # 투표한 사용자 정보
                            voters = []
                            for vote in votes:
                                user = User.query.get(vote.user_id)
                                if user:
                                    # 교수/봇 아이디(학번)는 숨기고, 학생인 경우에만 student_id 노출
                                    author_student_id = None
                                    user_type = getattr(user, "user_type", None)
                                    if user_type == "student":
                                        author_student_id = user.student_id
                                    # 봇 계정의 경우 student_id 숨김
                                    elif user_type == "bot":
                                        author_student_id = None
                                    
                                    is_professor = user_type == "professor"
                                    
                                    voters.append({
                                        "id": user.id,
                                        "name": user.name,
                                        "student_id": author_student_id,
                                        "is_professor": is_professor,
                                        "profile_image": user.profile_image
                                    })
                            
                            options_data.append({
                                "id": option.id,
                                "text": option.text,
                                "votes": votes_count,
                                "voters": voters
                            })
                    
                    poll_data = {
                        "id": poll.id,
                        "question": poll.question,
                        "options": options_data,
                        "total_votes": total_votes,
                        "user_vote": user_vote,
                        "expires_at": poll.expires_at.isoformat() if poll.expires_at else None
                    }
        except Exception as e:
            # Poll 모델이 없거나 오류 발생 시 None 반환
            import traceback
            print(f"Poll 데이터 조회 오류 (게시글 ID: {self.id}): {str(e)}")
            poll_data = None
        
        return {
            "id": self.id,
            "course_id": self.course_id,
            "author_id": self.author_id,
            "author": self.author.name,
            "author_student_id": author_student_id,
            "is_professor": is_professor,
            "author_profile_image": self.author.profile_image if self.author else None,
            "title": self.title,
            "content": self.content,
            "category": self.category,
            "team_board_name": self.team_board_name,
            "files": files_data,
            "poll": poll_data,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
            "likes": likes_count,
            "is_liked": is_liked,
            "comments_count": comments_count,
            "is_pinned": self.is_pinned
        }

# 게시판 댓글
class CourseBoardComment(db.Model):
    __tablename__ = "course_board_comments"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("course_board_posts.id"), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    parent_comment_id = db.Column(db.Integer, db.ForeignKey("course_board_comments.id"), nullable=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    author = db.relationship("User")
    post = db.relationship("CourseBoardPost", backref=db.backref("board_comments", lazy=True))

    def to_dict(self, user_id=None):
        # 교수/봇 아이디(학번)는 숨기고, 학생인 경우에만 student_id 노출
        author_student_id = None
        if self.author:
            user_type = getattr(self.author, "user_type", None)
            if user_type == "student":
                author_student_id = self.author.student_id
            # 봇 계정의 경우 student_id 숨김
            elif user_type == "bot":
                author_student_id = None
        
        # 교수 여부 확인
        is_professor = False
        if self.author and getattr(self.author, "user_type", None) == "professor":
            is_professor = True

        # 좋아요 수 계산
        likes_count = len(self.comment_likes) if self.comment_likes else 0
        
        # 현재 사용자가 좋아요 눌렀는지 확인
        is_liked = False
        if user_id and self.comment_likes:
            is_liked = any(like.user_id == user_id for like in self.comment_likes)

        return {
            "id": self.id,
            "post_id": self.post_id,
            "author_id": self.author_id,
            "author": self.author.name if self.author else "익명",
            "author_student_id": author_student_id,
            "is_professor": is_professor,
            "author_profile_image": self.author.profile_image if self.author else None,
            "parent_comment_id": self.parent_comment_id,
            "content": self.content,
            "likes": likes_count,
            "is_liked": is_liked,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M")
        }

# 게시판 좋아요
class CourseBoardLike(db.Model):
    __tablename__ = "course_board_likes"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("course_board_posts.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    user = db.relationship("User")
    post = db.relationship("CourseBoardPost", backref=db.backref("board_likes", lazy=True))


# 댓글 좋아요
class CourseBoardCommentLike(db.Model):
    __tablename__ = "course_board_comment_likes"

    id = db.Column(db.Integer, primary_key=True)
    comment_id = db.Column(db.Integer, db.ForeignKey("course_board_comments.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    user = db.relationship("User")
    comment = db.relationship("CourseBoardComment", backref=db.backref("comment_likes", lazy=True))


# 팀 모집
class TeamRecruitment(db.Model):
    __tablename__ = "team_recruitments"

    id = db.Column(db.Integer, primary_key=True)
    # 강의 코드 사용 (CourseBoardPost.course_id 와 동일한 형태)
    course_id = db.Column(db.String(20), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    team_board_name = db.Column(db.String(100), nullable=True)
    max_members = db.Column(db.Integer, nullable=False, default=3)
    is_board_activated = db.Column(db.Boolean, default=False)  # 팀 게시판 활성화 여부
    created_at = db.Column(db.DateTime, default=datetime.now)

    author = db.relationship("User")

    def to_dict(self, user_id=None):
        # 현재 모집에 참여한 멤버들
        members = TeamRecruitmentMember.query.filter_by(recruitment_id=self.id).all()
        members_list = [m.user.name for m in members if m.user]
        members_data = []
        for m in members:
            if m.user:
                # 교수인 경우에는 학번(student_id) 숨기기
                student_id = None
                if getattr(m.user, "user_type", None) == "student":
                    student_id = m.user.student_id
                
                # 교수 여부 확인
                is_professor_member = False
                if getattr(m.user, "user_type", None) == "professor":
                    is_professor_member = True

                members_data.append(
                    {
                        "user_id": m.user.id,
                        "name": m.user.name,
                        "student_id": student_id,
                        "is_professor": is_professor_member,
                        "profile_image": m.user.profile_image,
                    }
                )
            else:
                members_data.append(
                    {
                        "user_id": None,
                        "name": "익명",
                        "student_id": None,
                        "is_professor": False,
                        "profile_image": None,
                    }
                )

        # 현재 유저가 참여 중인지 확인
        is_joined = False
        if user_id is not None:
            is_joined = TeamRecruitmentMember.query.filter_by(
                recruitment_id=self.id, user_id=user_id
            ).first() is not None

        # 교수/봇 아이디(학번)는 숨기고, 학생인 경우에만 student_id 노출
        author_student_id = None
        if self.author:
            user_type = getattr(self.author, "user_type", None)
            if user_type == "student":
                author_student_id = self.author.student_id
            # 봇 계정의 경우 student_id 숨김
            elif user_type == "bot":
                author_student_id = None
        
        # 교수 여부 확인
        is_professor = False
        if self.author and getattr(self.author, "user_type", None) == "professor":
            is_professor = True

        return {
            "id": self.id,
            "course_id": self.course_id,
            "author_id": self.author_id,
            "author": self.author.name if self.author else "익명",
            "author_student_id": author_student_id,
            "is_professor": is_professor,
            "author_profile_image": self.author.profile_image if self.author else None,
            "title": self.title,
            "description": self.description,
            "team_board_name": self.team_board_name,
            "max_members": self.max_members,
            "current_members": len(members_list),
            "members_list": members_list,
            "members": members_data,
            "is_joined": is_joined,
            "is_board_activated": self.is_board_activated,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
        }


# 팀 모집 참여자
class TeamRecruitmentMember(db.Model):
    __tablename__ = "team_recruitment_members"

    id = db.Column(db.Integer, primary_key=True)
    recruitment_id = db.Column(db.Integer, db.ForeignKey("team_recruitments.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User")
    recruitment = db.relationship(
        "TeamRecruitment", backref=db.backref("members", lazy=True)
    )


# 개인 일정
class Schedule(db.Model):
    __tablename__ = "schedules"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    date = db.Column(db.Integer, nullable=False)  # 1-31
    month = db.Column(db.Integer, nullable=False)  # 1-12
    year = db.Column(db.Integer, nullable=False)
    color = db.Column(db.String(20), nullable=False, default='#a8d5e2')
    category = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    user = db.relationship("User", backref=db.backref("schedules", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "date": self.date,
            "month": self.month,
            "year": self.year,
            "color": self.color,
            "category": self.category,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M")
        }


# 알림
class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)  # 알림 받는 사람
    type = db.Column(db.String(50), nullable=False)  # 'comment', 'reply', 'like', 'notice', 'enrollment', 'recruitment_join', 'team_post'
    content = db.Column(db.String(500), nullable=False)  # 알림 내용
    related_id = db.Column(db.Integer, nullable=True)  # 관련 게시글 ID
    comment_id = db.Column(db.Integer, nullable=True)  # 관련 댓글 ID (댓글/답글 알림인 경우)
    course_id = db.Column(db.String(20), nullable=True)  # 관련 강의 코드
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    user = db.relationship("User", backref=db.backref("notifications", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "content": self.content,
            "related_id": self.related_id,
            "comment_id": self.comment_id,
            "course_id": self.course_id,
            "is_read": self.is_read,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
        }

# 투표
class Poll(db.Model):
    __tablename__ = "polls"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("course_board_posts.id"), nullable=False)
    question = db.Column(db.String(500), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    post = db.relationship("CourseBoardPost", backref=db.backref("poll_relation", lazy=True))

# 투표 옵션
class PollOption(db.Model):
    __tablename__ = "poll_options"

    id = db.Column(db.Integer, primary_key=True)
    poll_id = db.Column(db.Integer, db.ForeignKey("polls.id"), nullable=False)
    text = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    poll = db.relationship("Poll", backref=db.backref("options_relation", lazy=True, cascade="all, delete-orphan"))

# 투표 기록
class PollVote(db.Model):
    __tablename__ = "poll_votes"

    id = db.Column(db.Integer, primary_key=True)
    poll_id = db.Column(db.Integer, db.ForeignKey("polls.id"), nullable=False)
    option_id = db.Column(db.Integer, db.ForeignKey("poll_options.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    poll = db.relationship("Poll", backref=db.backref("votes_relation", lazy=True))
    option = db.relationship("PollOption", backref=db.backref("votes_relation", lazy=True))
    user = db.relationship("User", backref=db.backref("poll_votes", lazy=True))

    __table_args__ = (db.UniqueConstraint('poll_id', 'user_id', name='unique_poll_user_vote'),)

# 팀 가능 시간 제출 이력
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
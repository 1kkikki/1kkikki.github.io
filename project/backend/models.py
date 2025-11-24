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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    day_of_week = db.Column(db.String(10), nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)

    user = db.relationship("User", backref=db.backref("available_times", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
        
        # 교수 아이디(학번)는 숨기고, 학생인 경우에만 student_id 노출
        author_student_id = None
        if self.author and getattr(self.author, "user_type", None) == "student":
            author_student_id = self.author.student_id

        return {
            "id": self.id,
            "course_id": self.course_id,
            "author_id": self.author_id,
            "author": self.author.name,
            "author_student_id": author_student_id,
            "author_profile_image": self.author.profile_image if self.author else None,
            "title": self.title,
            "content": self.content,
            "category": self.category,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
            "likes": likes_count,
            "is_liked": is_liked,
            "comments_count": comments_count
        }

# 게시판 댓글
class CourseBoardComment(db.Model):
    __tablename__ = "course_board_comments"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("course_board_posts.id"), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    parent_comment_id = db.Column(db.Integer, db.ForeignKey("course_board_comments.id"), nullable=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    author = db.relationship("User")
    post = db.relationship("CourseBoardPost", backref=db.backref("board_comments", lazy=True))

    def to_dict(self, user_id=None):
        # 교수 아이디(학번)는 숨기고, 학생인 경우에만 student_id 노출
        author_student_id = None
        if self.author and getattr(self.author, "user_type", None) == "student":
            author_student_id = self.author.student_id

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User")
    post = db.relationship("CourseBoardPost", backref=db.backref("board_likes", lazy=True))


# 댓글 좋아요
class CourseBoardCommentLike(db.Model):
    __tablename__ = "course_board_comment_likes"

    id = db.Column(db.Integer, primary_key=True)
    comment_id = db.Column(db.Integer, db.ForeignKey("course_board_comments.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    max_members = db.Column(db.Integer, nullable=False, default=3)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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

                members_data.append(
                    {
                        "user_id": m.user.id,
                        "name": m.user.name,
                        "student_id": student_id,
                        "profile_image": m.user.profile_image,
                    }
                )
            else:
                members_data.append(
                    {
                        "user_id": None,
                        "name": "익명",
                        "student_id": None,
                        "profile_image": None,
                    }
                )

        # 현재 유저가 참여 중인지 확인
        is_joined = False
        if user_id is not None:
            is_joined = TeamRecruitmentMember.query.filter_by(
                recruitment_id=self.id, user_id=user_id
            ).first() is not None

        # 교수 아이디(학번)는 숨기고, 학생인 경우에만 student_id 노출
        author_student_id = None
        if self.author and getattr(self.author, "user_type", None) == "student":
            author_student_id = self.author.student_id

        return {
            "id": self.id,
            "course_id": self.course_id,
            "author_id": self.author_id,
            "author": self.author.name if self.author else "익명",
            "author_student_id": author_student_id,
            "author_profile_image": self.author.profile_image if self.author else None,
            "title": self.title,
            "description": self.description,
            "max_members": self.max_members,
            "current_members": len(members_list),
            "members_list": members_list,
            "members": members_data,
            "is_joined": is_joined,
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    type = db.Column(db.String(50), nullable=False)  # 'comment', 'reply', 'like', 'notice', 'enrollment', 'recruitment_join'
    content = db.Column(db.String(500), nullable=False)  # 알림 내용
    related_id = db.Column(db.Integer, nullable=True)  # 관련 게시글/댓글/모집 ID
    course_id = db.Column(db.String(20), nullable=True)  # 관련 강의 코드
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("notifications", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "content": self.content,
            "related_id": self.related_id,
            "course_id": self.course_id,
            "is_read": self.is_read,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
        }
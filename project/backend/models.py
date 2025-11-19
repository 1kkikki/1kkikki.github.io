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
        
        return {
            "id": self.id,
            "course_id": self.course_id,
            "author": self.author.name,
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
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    author = db.relationship("User")
    post = db.relationship("CourseBoardPost", backref=db.backref("board_comments", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "post_id": self.post_id,
            "author": self.author.name if self.author else "익명",
            "author_profile_image": self.author.profile_image if self.author else None,
            "content": self.content,
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

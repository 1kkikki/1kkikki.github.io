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

# 글
class Post(db.Model):
    __tablename__ = "posts"

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.String(20), nullable=False)   # 예: CSE301
    author_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    type = db.Column(db.String(20), nullable=False)        # notice, recruit, community, team
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    likes = db.Column(db.Integer, default=0)
    is_pinned = db.Column(db.Boolean, default=False)

    author = db.relationship("User", backref=db.backref("posts", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "author_id": self.author_id,
            "type": self.type,
            "title": self.title,
            "content": self.content,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
            "likes": self.likes,
            "is_pinned": self.is_pinned,
            "author": self.author.name if self.author else None
        }

# 댓글
class Comment(db.Model):
    __tablename__ = "comments"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    author = db.relationship("User", backref=db.backref("comments", lazy=True))
    post = db.relationship("Post", backref=db.backref("comments", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "post_id": self.post_id,
            "author_id": self.author_id,
            "content": self.content,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
            "author": self.author.name if self.author else None
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

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "author": self.author.name,
            "title": self.title,
            "content": self.content,
            "category": self.category,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M")
        }

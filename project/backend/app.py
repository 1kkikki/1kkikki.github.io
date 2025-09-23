from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# SQLite DB 연결
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///db.sqlite3"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# User 테이블
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)

@app.route("/")
def home():
    return "Flask + SQLite 서버 동작 중!"

@app.route("/api/hello")
def hello():
    return jsonify({"message": "Hello from Flask!"})

@app.route("/users")
def users():
    return jsonify([{"id": u.id, "name": u.name} for u in User.query.all()])

if __name__ == "__main__":
    # 🚀 앱 실행 전에 DB 자동 초기화
    with app.app_context():
        db.create_all()
        if not User.query.first():  # 데이터가 없을 때만 샘플 추가
            db.session.add_all([User(name="Alice"), User(name="Bob")])
            db.session.commit()
    app.run(debug=True)
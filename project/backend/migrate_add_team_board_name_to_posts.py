"""
게시판(CourseBoardPost) 테이블에 team_board_name 필드를 추가하는 마이그레이션 스크립트
"""
from app import app
from extensions import db
from sqlalchemy import text

with app.app_context():
    # team_board_name 컬럼이 이미 존재하는지 확인
    result = db.session.execute(text("PRAGMA table_info(course_board_posts)"))
    columns = [row[1] for row in result]
    
    if 'team_board_name' not in columns:
        print("team_board_name 컬럼 추가 중...")
        db.session.execute(text(
            "ALTER TABLE course_board_posts ADD COLUMN team_board_name VARCHAR(100)"
        ))
        db.session.commit()
        print("✅ team_board_name 컬럼이 추가되었습니다.")
    else:
        print("⚠️ team_board_name 컬럼이 이미 존재합니다.")


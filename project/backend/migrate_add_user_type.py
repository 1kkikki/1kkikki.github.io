"""
데이터베이스 마이그레이션: user_type 컬럼 추가
실행 방법: python migrate_add_user_type.py
"""
from app import app
from extensions import db
from sqlalchemy import text

def migrate():
    with app.app_context():
        try:
            # user_type 컬럼이 이미 존재하는지 확인
            result = db.session.execute(text("PRAGMA table_info(user)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'user_type' in columns:
                print("✓ user_type 컬럼이 이미 존재합니다.")
                return
            
            # user_type 컬럼 추가
            db.session.execute(text(
                "ALTER TABLE user ADD COLUMN user_type VARCHAR(20) NOT NULL DEFAULT 'student'"
            ))
            db.session.commit()
            print("✓ user_type 컬럼이 성공적으로 추가되었습니다.")
            
        except Exception as e:
            db.session.rollback()
            print(f"✗ 마이그레이션 중 오류 발생: {e}")

if __name__ == "__main__":
    migrate()


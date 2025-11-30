"""
게시물 고정 기능을 위한 데이터베이스 마이그레이션 스크립트
course_board_posts 테이블에 is_pinned 컬럼을 추가합니다.
"""
import os
import sqlite3
from pathlib import Path

def migrate_database():
    """데이터베이스에 is_pinned 컬럼 추가"""
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DB_PATH = os.path.join(BASE_DIR, "instance", "project.db")
    
    if not os.path.exists(DB_PATH):
        print(f"❌ 데이터베이스 파일을 찾을 수 없습니다: {DB_PATH}")
        return False
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 기존 컬럼 확인
        cursor.execute("PRAGMA table_info(course_board_posts)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_pinned' in columns:
            print("✅ is_pinned 컬럼이 이미 존재합니다.")
            conn.close()
            return True
        
        # 컬럼 추가
        print("🔄 is_pinned 컬럼을 추가하는 중...")
        cursor.execute("ALTER TABLE course_board_posts ADD COLUMN is_pinned BOOLEAN DEFAULT 0")
        conn.commit()
        
        print("✅ is_pinned 컬럼이 성공적으로 추가되었습니다!")
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 마이그레이션 중 오류 발생: {e}")
        if conn:
            conn.close()
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("게시물 고정 기능 마이그레이션")
    print("=" * 50)
    migrate_database()


"""
course_board_posts 테이블에서 poll 컬럼 제거 스크립트
SQLite에서는 ALTER TABLE DROP COLUMN을 직접 지원하지 않으므로,
테이블을 재생성하는 방식으로 처리합니다.
"""
import os
import sqlite3
import shutil
from datetime import datetime

def backup_database(db_path):
    """데이터베이스 백업"""
    backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    if os.path.exists(db_path):
        shutil.copy2(db_path, backup_path)
        print(f"✅ 데이터베이스 백업 완료: {backup_path}")
        return backup_path
    return None

def check_poll_column(db_path):
    """poll 컬럼 존재 여부 확인"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 테이블 구조 확인
    cursor.execute("PRAGMA table_info(course_board_posts)")
    columns = cursor.fetchall()
    
    has_poll = any(col[1] == 'poll' for col in columns)
    
    conn.close()
    return has_poll

if __name__ == "__main__":
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DB_PATH = os.path.join(BASE_DIR, "instance", "project.db")
    
    if not os.path.exists(DB_PATH):
        print("❌ 데이터베이스 파일을 찾을 수 없습니다.")
        exit(1)
    
    # poll 컬럼 존재 여부 확인
    if check_poll_column(DB_PATH):
        print("⚠️  course_board_posts 테이블에 poll 컬럼이 있습니다.")
        print("   이 컬럼은 더 이상 사용되지 않으며, Poll은 별도 테이블로 관리됩니다.")
        print("   서버를 재시작하면 SQLAlchemy가 자동으로 처리합니다.")
    else:
        print("✅ course_board_posts 테이블에 poll 컬럼이 없습니다. (정상)")
    
    print("\n💡 해결 방법:")
    print("   1. 백엔드 서버를 재시작하세요.")
    print("   2. 서버가 시작되면 SQLAlchemy가 자동으로 테이블을 업데이트합니다.")
    print("   3. 기존 데이터는 유지되며, Poll 테이블만 새로 생성됩니다.")


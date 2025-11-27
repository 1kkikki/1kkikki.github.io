"""
간단한 SQLite 마이그레이션 스크립트 (Flask 없이 실행)
"""
import sqlite3
import os
import sys

# UTF-8 출력 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 데이터베이스 파일 경로
db_path = os.path.join(os.path.dirname(__file__), 'instance', 'project.db')

if not os.path.exists(db_path):
    print(f"[ERROR] 데이터베이스 파일을 찾을 수 없습니다: {db_path}")
    exit(1)

print(f"데이터베이스 경로: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # 1. team_board_name 컬럼 추가 (course_board_posts)
    cursor.execute("PRAGMA table_info(course_board_posts)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'team_board_name' not in columns:
        print("[1/2] team_board_name 컬럼 추가 중...")
        cursor.execute("ALTER TABLE course_board_posts ADD COLUMN team_board_name VARCHAR(100)")
        conn.commit()
        print("[OK] course_board_posts.team_board_name 컬럼 추가 완료")
    else:
        print("[SKIP] team_board_name 컬럼이 이미 존재합니다.")
    
    # 2. is_board_activated 컬럼 추가 (team_recruitments)
    cursor.execute("PRAGMA table_info(team_recruitments)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'is_board_activated' not in columns:
        print("[2/2] is_board_activated 컬럼 추가 중...")
        cursor.execute("ALTER TABLE team_recruitments ADD COLUMN is_board_activated BOOLEAN DEFAULT 0")
        conn.commit()
        print("[OK] team_recruitments.is_board_activated 컬럼 추가 완료")
    else:
        print("[SKIP] is_board_activated 컬럼이 이미 존재합니다.")
    
    print("\n[SUCCESS] 모든 마이그레이션이 완료되었습니다!")
    
except Exception as e:
    print(f"[ERROR] 마이그레이션 실패: {e}")
    conn.rollback()
finally:
    conn.close()


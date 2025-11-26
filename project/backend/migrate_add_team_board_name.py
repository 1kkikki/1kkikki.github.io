import sqlite3

def migrate():
    conn = sqlite3.connect('instance/project.db')
    cursor = conn.cursor()
    
    try:
        # team_board_name 컬럼이 있는지 확인
        cursor.execute("PRAGMA table_info(team_recruitments)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'team_board_name' not in columns:
            print("team_board_name 컬럼 추가 중...")
            cursor.execute("""
                ALTER TABLE team_recruitments 
                ADD COLUMN team_board_name VARCHAR(100)
            """)
            conn.commit()
            print("✅ team_board_name 컬럼이 추가되었습니다.")
        else:
            print("✅ team_board_name 컬럼이 이미 존재합니다.")
            
    except Exception as e:
        print(f"❌ 마이그레이션 실패: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()


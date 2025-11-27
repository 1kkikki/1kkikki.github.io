"""
팀 모집(TeamRecruitment) 테이블에 is_board_activated 필드를 추가하는 마이그레이션 스크립트
"""
from app import app
from extensions import db
from sqlalchemy import text

with app.app_context():
    # is_board_activated 컬럼이 이미 존재하는지 확인
    result = db.session.execute(text("PRAGMA table_info(team_recruitments)"))
    columns = [row[1] for row in result]
    
    if 'is_board_activated' not in columns:
        print("is_board_activated 컬럼 추가 중...")
        db.session.execute(text(
            "ALTER TABLE team_recruitments ADD COLUMN is_board_activated BOOLEAN DEFAULT 0"
        ))
        db.session.commit()
        print("✅ is_board_activated 컬럼이 추가되었습니다.")
        
        # 기존 데이터에서 팀 게시판이 활성화된 경우 업데이트
        print("기존 활성화된 팀 게시판 확인 중...")
        result = db.session.execute(text("""
            UPDATE team_recruitments 
            SET is_board_activated = 1 
            WHERE team_board_name IS NOT NULL 
            AND team_board_name != ''
            AND id IN (
                SELECT DISTINCT t.id 
                FROM team_recruitments t
                JOIN course_board_posts p ON p.course_id = t.course_id 
                    AND p.category = 'team' 
                    AND p.title = t.team_board_name
            )
        """))
        db.session.commit()
        print(f"✅ {result.rowcount}개의 기존 팀 게시판이 활성화 상태로 업데이트되었습니다.")
    else:
        print("⚠️ is_board_activated 컬럼이 이미 존재합니다.")


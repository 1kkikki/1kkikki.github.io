"""
Poll 테이블 초기화 스크립트
기존 데이터를 보존하면서 Poll, PollOption, PollVote 테이블을 생성합니다.
"""
import os
import sys

# 프로젝트 루트 경로 추가
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, BASE_DIR)

from app import create_app
from extensions import db

def init_poll_tables():
    """Poll 관련 테이블 생성"""
    app = create_app()
    
    with app.app_context():
        # Poll 모델들을 import하여 테이블 생성
        from models import Poll, PollOption, PollVote
        
        # 테이블 생성 (기존 테이블은 유지)
        db.create_all()
        
        print("✅ Poll 테이블 초기화 완료!")
        print("   - polls 테이블")
        print("   - poll_options 테이블")
        print("   - poll_votes 테이블")

if __name__ == "__main__":
    init_poll_tables()


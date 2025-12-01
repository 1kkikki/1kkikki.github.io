from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, bcrypt
from models import (
    AvailableTime,
    User,
    TeamRecruitmentMember,
    TeamRecruitment,
    CourseBoardPost,
    Poll,
    PollOption,
    Notification,
    Course,
)
from models import TeamAvailabilitySubmission
from datetime import datetime
from collections import defaultdict

available_bp = Blueprint("available", __name__, url_prefix="/available")

# 봇 계정 가져오기 또는 생성
def get_or_create_bot_user():
    """시스템 봇 계정을 가져오거나 생성"""
    BOT_USERNAME = "allmeet_bot"
    BOT_EMAIL = "bot@allmeet.system"
    BOT_NAME = "All Meet 🤖"
    BOT_STUDENT_ID = "BOT000"
    
    # 기존 봇 계정 찾기
    bot_user = User.query.filter_by(username=BOT_USERNAME).first()
    
    if not bot_user:
        # 봇 계정이 없으면 생성
        # 봇은 로그인하지 않으므로 임의의 해시된 비밀번호 사용
        bot_password_hash = bcrypt.generate_password_hash("bot_password_never_used").decode("utf-8")
        
        bot_user = User(
            student_id=BOT_STUDENT_ID,
            name=BOT_NAME,
            email=BOT_EMAIL,
            username=BOT_USERNAME,
            password_hash=bot_password_hash,
            user_type="bot"  # 봇 타입으로 설정
        )
        
        db.session.add(bot_user)
        db.session.commit()
        db.session.refresh(bot_user)
    
    return bot_user

# 공통 시간 파싱 함수
def parse_time_str(time_str):
    return datetime.strptime(time_str, "%H:%M").time()

DAY_ORDER = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]

def _day_index(day_name):
    try:
        return DAY_ORDER.index(day_name)
    except ValueError:
        return None

def _time_to_minutes(time_obj):
    return time_obj.hour * 60 + time_obj.minute

def _slot_key(day_index, minutes):
    hour = minutes // 60
    minute = minutes % 60
    return f"{day_index}-{hour}-{minute}"

def _format_time(minutes):
    hour = minutes // 60
    minute = minutes % 60
    return f"{hour:02d}:{minute:02d}"

def build_time_slots(times):
    slots = set()

    for time in times:
        day_index = _day_index(time.day_of_week)
        if day_index is None:
            continue

        start = _time_to_minutes(time.start_time)
        end = _time_to_minutes(time.end_time)
        for minute in range(start, end, 30):
            if minute >= 24 * 60:
                continue
            slots.add(_slot_key(day_index, minute))

    return slots

def build_daily_blocks_from_slots(slots):
    per_day = defaultdict(list)

    for slot in slots:
        day_index_str, hour_str, minute_str = slot.split("-")
        day_index = int(day_index_str)
        minutes = int(hour_str) * 60 + int(minute_str)
        per_day[day_index].append(minutes)

    blocks = {}
    for day_index in sorted(per_day.keys()):
        minutes_list = sorted(set(per_day[day_index]))
        if not minutes_list:
            continue

        day_name = DAY_ORDER[day_index]
        current_start = minutes_list[0]
        previous = current_start

        for minute in minutes_list[1:]:
            if minute == previous + 30:
                previous = minute
                continue
            blocks.setdefault(day_name, []).append(
                {
                    "start_time": _format_time(current_start),
                    "end_time": _format_time(previous + 30),
                }
            )
            current_start = minute
            previous = minute

        blocks.setdefault(day_name, []).append(
            {
                "start_time": _format_time(current_start),
                "end_time": _format_time(previous + 30),
            }
        )

    return blocks

def find_2hour_continuous_slots(daily_blocks):
    """1시간(60분) 이상 연속 가능한 시간대를 찾는 함수"""
    two_hour_slots = []
    
    for day_name, blocks in daily_blocks.items():
        for block in blocks:
            start_time = parse_time_str(block["start_time"])
            end_time = parse_time_str(block["end_time"])
            
            start_minutes = _time_to_minutes(start_time)
            end_minutes = _time_to_minutes(end_time)
            duration = end_minutes - start_minutes
            
            # 1시간(60분) 이상인 경우
            if duration >= 60:
                two_hour_slots.append({
                    "day_of_week": day_name,
                    "start_time": block["start_time"],
                    "end_time": block["end_time"],
                    "duration_minutes": duration
                })
    
    return two_hour_slots

def check_all_members_submitted(team_id):
    """
    팀 게시판 모달 기준으로,
    해당 팀의 모든 멤버가 '팀 게시판에서 가능한 시간을 제출'했는지 확인.

    실제 가능한 시간 데이터는 AvailableTime 에 쌓이고,
    제출 여부는 TeamAvailabilitySubmission 에서 team_id / user_id 조합으로만 판단한다.
    """
    team_members = TeamRecruitmentMember.query.filter_by(recruitment_id=team_id).all()
    if not team_members:
        print(f"[DEBUG] 팀 {team_id} 멤버가 없음")
        return False

    member_ids = [m.user_id for m in team_members]
    print(f"[DEBUG] 팀 {team_id} 멤버 수: {len(member_ids)}, 멤버 IDs: {member_ids}")

    # 이 팀에 대해 제출을 완료한 멤버 목록
    submissions = TeamAvailabilitySubmission.query.filter(
        TeamAvailabilitySubmission.team_id == team_id,
        TeamAvailabilitySubmission.user_id.in_(member_ids),
    ).all()
    submitted_user_ids = {s.user_id for s in submissions}

    # 각 멤버가 최소 1번이라도 제출 버튼을 눌렀는지 확인
    all_submitted = True
    for member_id in member_ids:
        user = User.query.get(member_id)
        user_name = user.name if user else f"User{member_id}"
        is_submitted = member_id in submitted_user_ids
        print(f"[DEBUG]   - 멤버 {user_name} (ID: {member_id}): 팀 제출 여부 = {is_submitted}")
        if not is_submitted:
            all_submitted = False

    print(f"[DEBUG] 팀 {team_id} 모든 멤버 제출 완료 여부: {all_submitted}")
    return all_submitted

def create_auto_recommend_post(team_id):
    """자동 추천 게시글 생성 (내부 함수)"""
    team_recruitment = TeamRecruitment.query.get(team_id)
    if not team_recruitment:
        print(f"[DEBUG] 팀을 찾을 수 없음: team_id={team_id}")
        return None
    
    # 이미 같은 제목의 게시글이 있는지 확인 (중복 방지)
    title_pattern = f"🤖 자동 추천: {team_recruitment.team_board_name} 팀 만남 시간 추천"
    existing_post = CourseBoardPost.query.filter_by(
        course_id=team_recruitment.course_id,
        category="team",
        team_board_name=team_recruitment.team_board_name,
        title=title_pattern
    ).first()
    
    if existing_post:
        # 이미 게시글이 있으면 생성하지 않음
        print(f"[DEBUG] 이미 게시글이 존재함: team_id={team_id}, post_id={existing_post.id}")
        return None
    
    # 팀 공통 시간 계산
    team_members = TeamRecruitmentMember.query.filter_by(recruitment_id=team_id).all()
    if not team_members:
        print(f"[DEBUG] 팀 멤버가 없음: team_id={team_id}")
        return None
    
    member_ids = [m.user_id for m in team_members]
    
    # 각 멤버가 이 팀에 제출했는지 확인
    submissions = TeamAvailabilitySubmission.query.filter(
        TeamAvailabilitySubmission.team_id == team_id,
        TeamAvailabilitySubmission.user_id.in_(member_ids),
    ).all()
    submitted_user_ids = {s.user_id for s in submissions}
    
    # 해당 팀에 제출한 시간 가져오기
    team_submitted_times = AvailableTime.query.filter(
        AvailableTime.user_id.in_(member_ids),
        AvailableTime.team_id == team_id
    ).all()
    
    # 대시보드 시간 가져오기
    dashboard_times = AvailableTime.query.filter(
        AvailableTime.user_id.in_(member_ids),
        AvailableTime.team_id.is_(None)  # team_id가 None인 것 (대시보드용)
    ).all()
    
    # 각 멤버별로 팀 제출 시간 또는 대시보드 시간 매핑
    team_user_times = defaultdict(list)
    dashboard_user_times = defaultdict(list)
    
    for time_slot in team_submitted_times:
        team_user_times[time_slot.user_id].append(time_slot)
    
    for time_slot in dashboard_times:
        dashboard_user_times[time_slot.user_id].append(time_slot)
    
    print(f"[DEBUG] 팀 멤버 수: {len(team_members)}, 팀 제출 시간 수: {len(team_submitted_times)}, 대시보드 시간 수: {len(dashboard_times)}")
    
    member_slot_sets = []
    for member in team_members:
        user = member.user
        if not user:
            continue
        
        # 해당 팀에 제출했으면: 대시보드 연동 시간 + 팀에서 추가한 시간 모두 사용
        # 제출하지 않았으면: 대시보드 시간만 사용
        if member.user_id in submitted_user_ids:
            # 제출한 경우: 대시보드 시간 + 팀 제출 시간 모두 합치기
            dashboard_times_for_user = dashboard_user_times.get(user.id, [])
            team_times_for_user = team_user_times.get(user.id, [])
            times_for_user = dashboard_times_for_user + team_times_for_user
        else:
            # 제출하지 않은 경우: 대시보드 시간만 사용
            times_for_user = dashboard_user_times.get(user.id, [])
        
        slot_set = build_time_slots(times_for_user)
        member_slot_sets.append(slot_set)
        print(f"[DEBUG] 멤버 {user.name} (ID: {user.id})의 시간 슬롯 수: {len(slot_set)} (제출 여부: {member.user_id in submitted_user_ids})")
    
    if len(member_slot_sets) == 0:
        print(f"[DEBUG] 멤버 슬롯 세트가 없음: team_id={team_id}")
        return None
    
    # 시간이 있는 멤버만 필터링 (시간이 없는 멤버는 제외하고 공통 시간 계산)
    member_slot_sets_with_time = [s for s in member_slot_sets if len(s) > 0]
    
    if len(member_slot_sets_with_time) == 0:
        print(f"[DEBUG] 시간이 있는 멤버가 없음: team_id={team_id}")
        return None
    
    # 공통 시간 계산 (시간이 있는 멤버들 간의 공통 시간)
    member_slot_sets_with_time.sort(key=len)
    base_slots = member_slot_sets_with_time[0]
    optimal_slots = {slot for slot in base_slots if all(slot in slots for slots in member_slot_sets_with_time)}
    
    print(f"[DEBUG] 공통 시간 슬롯 수: {len(optimal_slots)}")
    
    if len(optimal_slots) == 0:
        print(f"[DEBUG] 공통 시간이 없음: team_id={team_id}")
        return None
    
    daily_blocks = build_daily_blocks_from_slots(optimal_slots)
    
    # 1시간 연속 가능한 시간 찾기
    two_hour_slots = find_2hour_continuous_slots(daily_blocks)
    
    print(f"[DEBUG] 1시간 연속 가능한 시간 수: {len(two_hour_slots)}")
    
    if not two_hour_slots:
        print(f"[DEBUG] 1시간 연속 가능한 시간이 없음: team_id={team_id}")
        return None
    
    # 게시글 작성자: 봇 계정 사용
    bot_user = get_or_create_bot_user()
    post_author_id = bot_user.id
    
    # 게시글 제목 및 내용 생성
    course = Course.query.filter_by(code=team_recruitment.course_id).first()
    course_title = course.title if course else team_recruitment.course_id
    
    title = title_pattern
    
    content = f"팀원들의 가능한 시간을 분석한 결과, 1시간 이상 연속으로 만날 수 있는 시간을 찾았습니다.\n\n"
    content += f"추천 시간:\n"
    
    for slot in two_hour_slots:
        hours = slot["duration_minutes"] // 60
        minutes = slot["duration_minutes"] % 60
        duration_str = f"{hours}시간"
        if minutes > 0:
            duration_str += f" {minutes}분"
        
        content += f"• {slot['day_of_week']} {slot['start_time']} ~ {slot['end_time']} ({duration_str})\n"
    
    content += f"\n아래 투표를 통해 만날 시간을 선택해주세요!  🗳️"
    
    # 게시글 생성
    import json as json_module
    post = CourseBoardPost(
        course_id=team_recruitment.course_id,
        author_id=post_author_id,
        title=title,
        content=content,
        category="team",
        team_board_name=team_recruitment.team_board_name,
        files=None
    )
    db.session.add(post)
    db.session.flush()
    
    # 투표 생성 (각 추천 시간을 옵션으로)
    poll_question = "원하는 만남 시간을 선택해주세요"
    poll = Poll(
        post_id=post.id,
        question=poll_question,
        expires_at=None
    )
    db.session.add(poll)
    db.session.flush()
    
    # 투표 옵션 추가
    for slot in two_hour_slots:
        hours = slot["duration_minutes"] // 60
        minutes = slot["duration_minutes"] % 60
        duration_str = f"{hours}시간"
        if minutes > 0:
            duration_str += f" {minutes}분"
        
        option_text = f"{slot['day_of_week']} {slot['start_time']} ~ {slot['end_time']} ({duration_str})"
        poll_option = PollOption(
            poll_id=poll.id,
            text=option_text
        )
        db.session.add(poll_option)
    
    # 팀 멤버들에게 알림 전송 (모든 멤버에게)
    for member in team_members:
        notification = Notification(
            user_id=member.user_id,
            type="team_post",
            content=f"[{course_title}] 팀게시판-{team_recruitment.team_board_name} 자동 추천 게시글이 작성되었습니다: {title}",
            related_id=post.id,
            course_id=team_recruitment.course_id
        )
        db.session.add(notification)
    
    db.session.commit()
    
    return post

# 가능한 시간 추가
@available_bp.route("/", methods=["POST"])
@jwt_required()
def add_available_time():
    user_id = get_jwt_identity()
    data = request.get_json()

    # 팀 게시판에서의 제출인지 여부 (대시보드에서는 team_id 를 보내지 않음)
    team_id_from_request = data.get("team_id")
    
    # team_id를 정수로 변환 (없으면 None)
    team_id_int = None
    if team_id_from_request is not None:
        try:
            team_id_int = int(team_id_from_request)
        except (TypeError, ValueError):
            team_id_int = None

    # 중복 체크: 같은 user_id, team_id, day_of_week, start_time, end_time 조합이 있는지 확인
    existing = AvailableTime.query.filter_by(
        user_id=user_id,
        team_id=team_id_int,  # team_id도 포함하여 중복 체크
        day_of_week=data["day_of_week"],
        start_time=parse_time_str(data["start_time"]),
        end_time=parse_time_str(data["end_time"])
    ).first()

    is_new_time = False
    if existing:
        print(f"[DEBUG] 이미 같은 시간이 존재함 (ID: {existing.id}, team_id: {team_id_int})")
        response_msg = "이미 같은 시간이 존재합니다."
    else:
        new_time = AvailableTime(
            user_id=user_id,
            team_id=team_id_int,  # team_id 저장 (None이면 대시보드용)
            day_of_week=data["day_of_week"],
            start_time=parse_time_str(data["start_time"]),
            end_time=parse_time_str(data["end_time"]),
        )
        db.session.add(new_time)
        db.session.commit()  # 먼저 커밋하여 시간이 저장되도록 함
        is_new_time = True
        response_msg = "시간 저장 완료"

    created_posts = []

    # team_id 가 있는 경우에만 "팀 게시판용 제출"로 간주하고,
    # 이 팀에 대한 제출 여부를 기록한 후 자동 추천 여부를 판단한다.
    if team_id_int is not None:
        # 사용자가 이 팀의 멤버인지 확인
        is_member = (
            TeamRecruitmentMember.query.filter_by(
                recruitment_id=team_id_int, user_id=user_id
            ).first()
            is not None
        )
        print(f"[DEBUG] team_id={team_id_int} 에 대한 제출, 팀 멤버 여부: {is_member}")

        if is_member:
            # 시간 추가 시에는 제출 이력을 기록하지 않음
            # 제출 이력은 "제출" 버튼을 눌렀을 때만 기록됨
            print(f"[DEBUG] team_id={team_id_int} 시간 추가 완료 (제출 이력은 제출 버튼 클릭 시 기록됨)")
        else:
            print(
                f"[DEBUG] team_id={team_id_int} 에 대해 제출 요청이 왔지만, 사용자 {user_id} 는 이 팀의 멤버가 아님"
            )

    if created_posts:
        response_msg += f" (자동 추천 게시글 {len(created_posts)}개 생성됨)"

    status_code = 201 if is_new_time else 200
    return jsonify({
        "msg": response_msg,
        "created_posts": created_posts
    }), status_code

# 내 가능한 시간 목록 조회
@available_bp.route("/", methods=["GET"])
@jwt_required()
def get_my_available_times():
    user_id = get_jwt_identity()
    # team_id 파라미터가 있으면 해당 팀의 시간만, 없으면 대시보드용(team_id=None) 시간만
    team_id_param = request.args.get("team_id", type=int)
    
    query = AvailableTime.query.filter_by(user_id=user_id)
    
    if team_id_param is not None:
        # 특정 팀의 시간만 조회
        query = query.filter_by(team_id=team_id_param)
    else:
        # 대시보드용 시간만 조회 (team_id가 None인 것만)
        query = query.filter_by(team_id=None)
    
    times = query.order_by(AvailableTime.day_of_week, AvailableTime.start_time).all()
    return jsonify([t.to_dict() for t in times])

# 가능한 시간 삭제
@available_bp.route("/<int:time_id>", methods=["DELETE"])
@jwt_required()
def delete_available_time(time_id):
    user_id = get_jwt_identity()
    time = AvailableTime.query.filter_by(id=time_id, user_id=user_id).first()

    if not time:
        return jsonify({"msg": "해당 시간이 존재하지 않거나 권한이 없습니다."}), 404

    db.session.delete(time)
    db.session.commit()
    return jsonify({"msg": "시간이 삭제되었습니다."}), 200

# 팀 전체의 공통 가능한 시간대 계산
@available_bp.route("/team/<int:team_id>", methods=["GET"])
@jwt_required()
def get_team_common_times(team_id):
    team_recruitment = TeamRecruitment.query.get(team_id)
    if not team_recruitment:
        return jsonify({"msg": "해당 팀을 찾을 수 없습니다."}), 404

    team_members = TeamRecruitmentMember.query.filter_by(recruitment_id=team_id).all()
    if not team_members:
        return jsonify({
            "team_id": team_id,
            "team_board_name": team_recruitment.team_board_name,
            "course_id": team_recruitment.course_id,
            "team_size": 0,
            "members": [],
            "optimal_slots": [],
            "daily_blocks": {},
        })

    member_ids = [m.user_id for m in team_members]
    
    # 각 멤버가 이 팀에 제출했는지 확인
    submissions = TeamAvailabilitySubmission.query.filter(
        TeamAvailabilitySubmission.team_id == team_id,
        TeamAvailabilitySubmission.user_id.in_(member_ids),
    ).all()
    submitted_user_ids = {s.user_id for s in submissions}
    
    # 해당 팀에 제출한 시간 가져오기
    team_submitted_times = AvailableTime.query.filter(
        AvailableTime.user_id.in_(member_ids),
        AvailableTime.team_id == team_id
    ).all()
    
    # 대시보드 시간 가져오기 (제출하지 않은 멤버용)
    dashboard_times = AvailableTime.query.filter(
        AvailableTime.user_id.in_(member_ids),
        AvailableTime.team_id.is_(None)  # team_id가 None인 것 (대시보드용)
    ).all()

    # 각 멤버별로 팀 제출 시간 또는 대시보드 시간 매핑
    team_user_times = defaultdict(list)
    dashboard_user_times = defaultdict(list)
    
    for time_slot in team_submitted_times:
        team_user_times[time_slot.user_id].append(time_slot)
    
    for time_slot in dashboard_times:
        dashboard_user_times[time_slot.user_id].append(time_slot)

    members_payload = []
    member_slot_sets = []
    slot_counts = {}
    total_members = len(member_ids)

    for member in team_members:
        user = member.user
        if not user:
            continue

        # 해당 팀에 제출했으면: 대시보드 연동 시간 + 팀에서 추가한 시간 모두 사용
        # 제출하지 않았으면: 대시보드 시간만 사용
        if member.user_id in submitted_user_ids:
            # 제출한 경우: 대시보드 시간 + 팀 제출 시간 모두 합치기
            dashboard_times_for_user = dashboard_user_times.get(user.id, [])
            team_times_for_user = team_user_times.get(user.id, [])
            times_for_user = dashboard_times_for_user + team_times_for_user
            time_source = "dashboard+team"
        else:
            # 제출하지 않은 경우: 대시보드 시간만 사용
            times_for_user = dashboard_user_times.get(user.id, [])
            time_source = "dashboard"
        
        payload = {
            "user_id": user.id,
            "name": user.name,
            "student_id": user.student_id if user.user_type == "student" else None,
            "user_type": user.user_type,
            "times": [t.to_dict() for t in times_for_user],
            "time_source": time_source  # 어디서 온 시간인지 표시 (선택사항)
        }
        members_payload.append(payload)

        slot_set = build_time_slots(times_for_user)
        member_slot_sets.append(slot_set)

        for slot in slot_set:
            slot_counts[slot] = slot_counts.get(slot, 0) + 1

    if len(member_slot_sets) == 0:
        optimal_slots = set()
    else:
        # 빈 슬롯이 하나라도 있으면 공통 시간은 없음
        if any(len(s) == 0 for s in member_slot_sets):
            optimal_slots = set()
        else:
            # 기준은 가장 작은 슬롯 집합
            member_slot_sets.sort(key=len)
            base_slots = member_slot_sets[0]
            optimal_slots = {slot for slot in base_slots if all(slot in slots for slots in member_slot_sets)}

    daily_blocks = build_daily_blocks_from_slots(optimal_slots)

    return jsonify({
        "team_id": team_id,
        "team_board_name": team_recruitment.team_board_name,
        "course_id": team_recruitment.course_id,
        "team_size": total_members,
        "members": members_payload,
        "optimal_slots": sorted(optimal_slots),
        "slot_counts": slot_counts,
        "daily_blocks": daily_blocks,
    })

# 1시간 연속 가능한 시간을 자동 추천하고 봇이 게시글 올리기
@available_bp.route("/team/<int:team_id>/auto-recommend", methods=["POST"])
@jwt_required()
def auto_recommend_and_post(team_id):
    user_id = get_jwt_identity()
    team_recruitment = TeamRecruitment.query.get(team_id)
    
    if not team_recruitment:
        return jsonify({"msg": "해당 팀을 찾을 수 없습니다."}), 404
    
    # 팀 멤버인지 확인
    is_member = TeamRecruitmentMember.query.filter_by(
        recruitment_id=team_id, user_id=user_id
    ).first() is not None
    
    if not is_member:
        return jsonify({"msg": "팀 멤버만 사용할 수 있는 기능입니다."}), 403
    
    # 팀 공통 시간 계산
    team_members = TeamRecruitmentMember.query.filter_by(recruitment_id=team_id).all()
    if not team_members:
        return jsonify({"msg": "팀 멤버가 없습니다."}), 400
    
    member_ids = [m.user_id for m in team_members]
    all_times = AvailableTime.query.filter(AvailableTime.user_id.in_(member_ids)).all()
    
    user_times = defaultdict(list)
    for time_slot in all_times:
        user_times[time_slot.user_id].append(time_slot)
    
    member_slot_sets = []
    for member in team_members:
        user = member.user
        if not user:
            continue
        times_for_user = user_times.get(user.id, [])
        slot_set = build_time_slots(times_for_user)
        member_slot_sets.append(slot_set)
    
    if len(member_slot_sets) == 0:
        return jsonify({"msg": "팀원들의 가능한 시간 정보가 없습니다."}), 400
    
    # 공통 시간 계산
    if any(len(s) == 0 for s in member_slot_sets):
        return jsonify({"msg": "팀원 모두가 가능한 공통 시간이 없습니다."}), 400
    
    member_slot_sets.sort(key=len)
    base_slots = member_slot_sets[0]
    optimal_slots = {slot for slot in base_slots if all(slot in slots for slots in member_slot_sets)}
    
    daily_blocks = build_daily_blocks_from_slots(optimal_slots)
    
    # 1시간 연속 가능한 시간 찾기
    two_hour_slots = find_2hour_continuous_slots(daily_blocks)
    
    if not two_hour_slots:
        return jsonify({"msg": "1시간 연속으로 만날 수 있는 시간이 없습니다."}), 400
    
    # 게시글 작성자: 봇 계정 사용
    bot_user = get_or_create_bot_user()
    post_author_id = bot_user.id
    
    # 게시글 제목 및 내용 생성
    course = Course.query.filter_by(code=team_recruitment.course_id).first()
    course_title = course.title if course else team_recruitment.course_id
    
    title = f"🤖 자동 추천: {team_recruitment.team_board_name} 팀 만남 시간 추천"
    
    content = f"팀원들의 가능한 시간을 분석한 결과, 1시간 이상 연속으로 만날 수 있는 시간을 찾았습니다.\n\n"
    content += f"**추천 시간:**\n\n"
    
    for slot in two_hour_slots:
        hours = slot["duration_minutes"] // 60
        minutes = slot["duration_minutes"] % 60
        duration_str = f"{hours}시간"
        if minutes > 0:
            duration_str += f" {minutes}분"
        
        content += f"• **{slot['day_of_week']}** {slot['start_time']} ~ {slot['end_time']} ({duration_str})\n"
    
    content += f"\n가장 적합한 시간을 투표로 선택해주세요. 🗳️"
    
    # 게시글 생성
    import json as json_module
    post = CourseBoardPost(
        course_id=team_recruitment.course_id,
        author_id=post_author_id,
        title=title,
        content=content,
        category="team",
        team_board_name=team_recruitment.team_board_name,
        files=None
    )
    db.session.add(post)
    db.session.flush()
    
    # 투표 생성 (각 추천 시간을 옵션으로)
    poll_question = "가장 적합한 시간을 선택해주세요"
    poll = Poll(
        post_id=post.id,
        question=poll_question,
        expires_at=None
    )
    db.session.add(poll)
    db.session.flush()
    
    # 투표 옵션 추가
    for slot in two_hour_slots:
        hours = slot["duration_minutes"] // 60
        minutes = slot["duration_minutes"] % 60
        duration_str = f"{hours}시간"
        if minutes > 0:
            duration_str += f" {minutes}분"
        
        option_text = f"{slot['day_of_week']} {slot['start_time']} ~ {slot['end_time']} ({duration_str})"
        poll_option = PollOption(
            poll_id=poll.id,
            text=option_text
        )
        db.session.add(poll_option)
    
    # 팀 멤버들에게 알림 전송 (모든 멤버에게)
    for member in team_members:
        notification = Notification(
            user_id=member.user_id,
            type="team_post",
            content=f"[{course_title}] 팀게시판-{team_recruitment.team_board_name} 자동 추천 게시글이 작성되었습니다: {title}",
            related_id=post.id,
            course_id=team_recruitment.course_id
        )
        db.session.add(notification)
    
    db.session.commit()
    
    return jsonify({
        "msg": "자동 추천 게시글이 작성되었습니다.",
        "post_id": post.id,
        "recommended_slots": two_hour_slots,
        "post": post.to_dict()
    }), 201

# 팀 게시판 시간 제출 (제출 버튼 클릭 시 호출)
@available_bp.route("/team/<int:team_id>/submit", methods=["POST"])
@jwt_required()
def submit_team_availability(team_id):
    """팀 게시판에서 시간 제출 버튼을 눌렀을 때 호출되는 엔드포인트"""
    user_id = get_jwt_identity()
    
    # 사용자가 이 팀의 멤버인지 확인
    is_member = (
        TeamRecruitmentMember.query.filter_by(
            recruitment_id=team_id, user_id=user_id
        ).first()
        is not None
    )
    
    if not is_member:
        return jsonify({"error": "이 팀의 멤버가 아닙니다."}), 403
    
    # 제출 이력 기록 (이미 있으면 무시)
    existing_submission = TeamAvailabilitySubmission.query.filter_by(
        team_id=team_id, user_id=user_id
    ).first()
    
    if not existing_submission:
        submission = TeamAvailabilitySubmission(
            team_id=team_id, user_id=user_id
        )
        db.session.add(submission)
        db.session.commit()
        print(f"[DEBUG] 팀 {team_id} 에 대한 제출 이력 생성 (user_id={user_id})")
    else:
        print(f"[DEBUG] 팀 {team_id} 에 대한 제출 이력 이미 존재 (user_id={user_id})")
    
    # 이 팀에 대해 모든 멤버가 제출을 완료했는지 확인
    team_recruitment = TeamRecruitment.query.get(team_id)
    team_name = (
        team_recruitment.team_board_name if team_recruitment else None
    )
    
    all_submitted = check_all_members_submitted(team_id)
    print(f"[DEBUG] 팀 {team_id} ({team_name}) 모든 멤버 제출 여부: {all_submitted}")
    
    created_posts = []
    
    # 모든 멤버가 제출했으면 게시글 생성 시도
    if all_submitted:
        print(f"[DEBUG] 팀 {team_id} 자동 추천 게시글 생성 시도...")
        post = create_auto_recommend_post(team_id)
        if post:
            print(f"[DEBUG] ✅ 팀 {team_id} 자동 추천 게시글 생성 성공! post_id={post.id}")
            created_posts.append({
                "team_id": team_id,
                "post_id": post.id,
                "team_name": team_name,
            })
        else:
            print(f"[DEBUG] ❌ 팀 {team_id} 자동 추천 게시글 생성 실패 (create_auto_recommend_post가 None 반환)")
    else:
        print(f"[DEBUG] ⏳ 팀 {team_id} 아직 모든 멤버가 시간을 제출하지 않음")
    
    return jsonify({
        "msg": "시간이 제출되었습니다.",
        "all_submitted": all_submitted,
        "created_posts": created_posts
    }), 200

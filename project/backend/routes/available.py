from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, bcrypt
from models import AvailableTime, User, TeamRecruitmentMember, TeamRecruitment, CourseBoardPost, Poll, PollOption, Notification, Course
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
    """2시간(120분) 이상 연속 가능한 시간대를 찾는 함수"""
    two_hour_slots = []
    
    for day_name, blocks in daily_blocks.items():
        for block in blocks:
            start_time = parse_time_str(block["start_time"])
            end_time = parse_time_str(block["end_time"])
            
            start_minutes = _time_to_minutes(start_time)
            end_minutes = _time_to_minutes(end_time)
            duration = end_minutes - start_minutes
            
            # 2시간(120분) 이상인 경우
            if duration >= 120:
                two_hour_slots.append({
                    "day_of_week": day_name,
                    "start_time": block["start_time"],
                    "end_time": block["end_time"],
                    "duration_minutes": duration
                })
    
    return two_hour_slots

def check_all_members_submitted(team_id):
    """팀의 모든 멤버가 가능한 시간을 제출했는지 확인"""
    team_recruitment = TeamRecruitment.query.get(team_id)
    if not team_recruitment:
        print(f"[DEBUG] 팀 {team_id}를 찾을 수 없음")
        return False
    
    team_members = TeamRecruitmentMember.query.filter_by(recruitment_id=team_id).all()
    if not team_members:
        print(f"[DEBUG] 팀 {team_id} 멤버가 없음")
        return False
    
    member_ids = [m.user_id for m in team_members]
    print(f"[DEBUG] 팀 {team_id} ({team_recruitment.team_board_name}) 멤버 수: {len(member_ids)}, 멤버 IDs: {member_ids}")
    
    # 각 멤버가 최소 1개 이상의 시간을 제출했는지 확인
    all_submitted = True
    for member_id in member_ids:
        times_count = AvailableTime.query.filter_by(user_id=member_id).count()
        user = User.query.get(member_id)
        user_name = user.name if user else f"User{member_id}"
        print(f"[DEBUG]   - 멤버 {user_name} (ID: {member_id}): 제출한 시간 수 = {times_count}")
        if times_count == 0:
            all_submitted = False
            print(f"[DEBUG]   - 멤버 {user_name} (ID: {member_id})가 시간을 제출하지 않음")
    
    print(f"[DEBUG] 팀 {team_id} ({team_recruitment.team_board_name}) 모든 멤버 제출 완료 여부: {all_submitted}")
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
    all_times = AvailableTime.query.filter(AvailableTime.user_id.in_(member_ids)).all()
    
    print(f"[DEBUG] 팀 멤버 수: {len(team_members)}, 제출된 시간 수: {len(all_times)}")
    
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
        print(f"[DEBUG] 멤버 {user.name} (ID: {user.id})의 시간 슬롯 수: {len(slot_set)}")
    
    if len(member_slot_sets) == 0:
        print(f"[DEBUG] 멤버 슬롯 세트가 없음: team_id={team_id}")
        return None
    
    # 공통 시간 계산
    if any(len(s) == 0 for s in member_slot_sets):
        print(f"[DEBUG] 일부 멤버가 시간을 제출하지 않음: team_id={team_id}")
        return None
    
    member_slot_sets.sort(key=len)
    base_slots = member_slot_sets[0]
    optimal_slots = {slot for slot in base_slots if all(slot in slots for slots in member_slot_sets)}
    
    print(f"[DEBUG] 공통 시간 슬롯 수: {len(optimal_slots)}")
    
    daily_blocks = build_daily_blocks_from_slots(optimal_slots)
    
    # 2시간 연속 가능한 시간 찾기
    two_hour_slots = find_2hour_continuous_slots(daily_blocks)
    
    print(f"[DEBUG] 2시간 연속 가능한 시간 수: {len(two_hour_slots)}")
    
    if not two_hour_slots:
        print(f"[DEBUG] 2시간 연속 가능한 시간이 없음: team_id={team_id}")
        return None
    
    # 게시글 작성자: 봇 계정 사용
    bot_user = get_or_create_bot_user()
    post_author_id = bot_user.id
    
    # 게시글 제목 및 내용 생성
    course = Course.query.filter_by(code=team_recruitment.course_id).first()
    course_title = course.title if course else team_recruitment.course_id
    
    title = title_pattern
    
    content = f"팀원들의 가능한 시간을 분석한 결과, 2시간 이상 연속으로 만날 수 있는 시간을 찾았습니다.\n\n"
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
    # team_board_name이 None이거나 빈 문자열이면 게시글 생성하지 않음
    if not team_recruitment.team_board_name or not team_recruitment.team_board_name.strip():
        print(f"[DEBUG] 팀 {team_id}의 team_board_name이 없거나 비어있음: '{team_recruitment.team_board_name}'")
        return None
    
    post = CourseBoardPost(
        course_id=team_recruitment.course_id,
        author_id=post_author_id,
        title=title,
        content=content,
        category="team",
        team_board_name=team_recruitment.team_board_name.strip(),  # 공백 제거하여 저장
        files=None
    )
    db.session.add(post)
    db.session.flush()
    print(f"[DEBUG] 게시글 생성됨: post_id={post.id}, team_board_name='{post.team_board_name}', course_id='{post.course_id}'")
    
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

    existing = AvailableTime.query.filter_by(
        user_id=user_id,
        day_of_week=data["day_of_week"],
        start_time=parse_time_str(data["start_time"]),
        end_time=parse_time_str(data["end_time"])
    ).first()

    is_new_time = False
    if existing:
        print(f"[DEBUG] 이미 같은 시간이 존재함 (ID: {existing.id})")
        response_msg = "이미 같은 시간이 존재합니다."
    else:
        new_time = AvailableTime(
            user_id=user_id,
            day_of_week=data["day_of_week"],
            start_time=parse_time_str(data["start_time"]),
            end_time=parse_time_str(data["end_time"]),
        )
        db.session.add(new_time)
        db.session.commit()  # 먼저 커밋하여 시간이 저장되도록 함
        is_new_time = True
        response_msg = "시간 저장 완료"
    
    # 사용자가 속한 모든 팀 찾기 (새로 추가했든 기존 것이든 체크)
    user_teams = TeamRecruitmentMember.query.filter_by(user_id=user_id).all()
    
    print(f"[DEBUG] 사용자 {user_id}가 속한 팀 수: {len(user_teams)}")
    
    created_posts = []
    for team_member in user_teams:
        team_id = team_member.recruitment_id
        team_name = team_member.recruitment.team_board_name if team_member.recruitment else None
        
        print(f"[DEBUG] 팀 {team_id} ({team_name}) 확인 중...")
        
        # 해당 팀의 모든 멤버가 시간을 제출했는지 확인
        all_submitted = check_all_members_submitted(team_id)
        print(f"[DEBUG] 팀 {team_id} 모든 멤버 제출 여부: {all_submitted}")
        
        if all_submitted:
            # 자동 추천 게시글 생성
            print(f"[DEBUG] 팀 {team_id} 자동 추천 게시글 생성 시도...")
            post = create_auto_recommend_post(team_id)
            if post:
                print(f"[DEBUG] ✅ 팀 {team_id} 자동 추천 게시글 생성 성공! post_id={post.id}")
                created_posts.append({
                    "team_id": team_id,
                    "post_id": post.id,
                    "team_name": team_name
                })
            else:
                print(f"[DEBUG] ❌ 팀 {team_id} 자동 추천 게시글 생성 실패 (create_auto_recommend_post가 None 반환)")
        else:
            print(f"[DEBUG] ⏳ 팀 {team_id} 아직 모든 멤버가 시간을 제출하지 않음")
    
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
    times = (
        AvailableTime.query
        .filter_by(user_id=user_id)
        .order_by(AvailableTime.day_of_week, AvailableTime.start_time)
        .all()
    )
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
    all_times = AvailableTime.query.filter(AvailableTime.user_id.in_(member_ids)).all()

    user_times = defaultdict(list)
    for time_slot in all_times:
        user_times[time_slot.user_id].append(time_slot)

    members_payload = []
    member_slot_sets = []
    slot_counts = {}
    total_members = len(member_ids)

    for member in team_members:
        user = member.user
        if not user:
            continue

        times_for_user = user_times.get(user.id, [])
        payload = {
            "user_id": user.id,
            "name": user.name,
            "student_id": user.student_id if user.user_type == "student" else None,
            "user_type": user.user_type,
            "times": [t.to_dict() for t in times_for_user]
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

# 2시간 연속 가능한 시간을 자동 추천하고 봇이 게시글 올리기
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
    
    # 2시간 연속 가능한 시간 찾기
    two_hour_slots = find_2hour_continuous_slots(daily_blocks)
    
    if not two_hour_slots:
        return jsonify({"msg": "2시간 연속으로 만날 수 있는 시간이 없습니다."}), 400
    
    # 게시글 작성자: 봇 계정 사용
    bot_user = get_or_create_bot_user()
    post_author_id = bot_user.id
    
    # 게시글 제목 및 내용 생성
    course = Course.query.filter_by(code=team_recruitment.course_id).first()
    course_title = course.title if course else team_recruitment.course_id
    
    title = f"🤖 자동 추천: {team_recruitment.team_board_name} 팀 만남 시간 추천"
    
    content = f"팀원들의 가능한 시간을 분석한 결과, 2시간 이상 연속으로 만날 수 있는 시간을 찾았습니다.\n\n"
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
    # team_board_name이 None이거나 빈 문자열이면 게시글 생성하지 않음
    if not team_recruitment.team_board_name or not team_recruitment.team_board_name.strip():
        print(f"[DEBUG] 팀 {team_id}의 team_board_name이 없거나 비어있음: '{team_recruitment.team_board_name}'")
        return jsonify({"msg": "팀 게시판 이름이 없습니다."}), 400
    
    post = CourseBoardPost(
        course_id=team_recruitment.course_id,
        author_id=post_author_id,
        title=title,
        content=content,
        category="team",
        team_board_name=team_recruitment.team_board_name.strip(),  # 공백 제거하여 저장
        files=None
    )
    db.session.add(post)
    db.session.flush()
    print(f"[DEBUG] 게시글 생성됨: post_id={post.id}, team_board_name='{post.team_board_name}', course_id='{post.course_id}'")
    
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

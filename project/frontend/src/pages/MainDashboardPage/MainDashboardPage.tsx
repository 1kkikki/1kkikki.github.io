import { useState } from "react";
import { Bell, ChevronLeft, ChevronRight, Plus, Calendar, Clock, AlertCircle, CheckCircle, X, User } from "lucide-react";
import "./main-dashboard.css";

interface MainDashboardPageProps {
  onNavigate: (page: string) => void;
}

// 캘린더 이벤트 타입
interface CalendarEvent {
  id: string;
  title: string;
  date: number; // 1-31
  color: string;
  category?: string;
}

// 가능한 시간 타입
interface AvailableTime {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

export default function MainDashboardPage({ onNavigate }: MainDashboardPageProps) {
  const [currentMonth, setCurrentMonth] = useState("2025년 1월");
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventDetailModalOpen, setIsEventDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([]);
  const [newTime, setNewTime] = useState({ 
    day: "월요일", 
    startHour: "09", 
    startMinute: "00", 
    endHour: "10", 
    endMinute: "00" 
  });
  const [timeOverlapWarning, setTimeOverlapWarning] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: "1", title: "운영체제 과제", date: 15, color: "#a8d5e2", category: "과제" },
    { id: "2", title: "웹프로그래밍 과제", date: 15, color: "#d4c5f9", category: "과제" },
    { id: "3", title: "중간고사", date: 20, color: "#ffb3b3", category: "시험" },
    { id: "4", title: "팀 프로젝트 발표", date: 22, color: "#c9a9e9", category: "발표" },
    { id: "5", title: "인공지능 리포트", date: 25, color: "#aedcc0", category: "제출" },
    { id: "6", title: "기말과제 제출", date: 28, color: "#ffd4a3", category: "제출" }
  ]);
  const [newEvent, setNewEvent] = useState({ title: "", month: 1, date: 1, color: "#a8d5e2", category: "" });
  
  // 왼쪽 사이드바 강의 목록
  const courses = [
    { id: 1, title: "운영체제", code: "CSE301" },
    { id: 2, title: "웹프로그래밍", code: "CSE303" },
    { id: 3, title: "인공지능기초", code: "CSE402" },
    { id: 4, title: "컴퓨터보안", code: "CSE302" }
  ];



  // 캘린더 날짜 생성 (2025년 1월 - 수요일 시작)
  const daysInMonth = 31;
  const firstDayOfWeek = 3; // 수요일 시작
  const totalCells = Math.ceil((daysInMonth + firstDayOfWeek) / 7) * 7;
  
  const calendarDays = Array.from({ length: totalCells }, (_, i) => {
    const dayNumber = i - firstDayOfWeek + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  // 게시판 알림 목록
  const notifications = [
    { 
      id: 1, 
      content: "[운영체제] 팀 프로젝트 회의 일정 투표가 시작되었습니다",
      course: "운영체제",
      time: "10분 전",
      type: "urgent",
      icon: AlertCircle
    },
    { 
      id: 2, 
      content: "[웹프로그래밍] 김민수님이 팀 과제 파일을 업로드했습니다",
      course: "웹프로그래밍",
      time: "1시간 전",
      type: "success",
      icon: CheckCircle
    },
    { 
      id: 3, 
      content: "[인공지능기초] 새로운 공지사항: 중간고사 범위 안내",
      course: "인공지능기초",
      time: "3시간 전",
      type: "info",
      icon: Bell
    },
    { 
      id: 4, 
      content: "[컴퓨터보안] 팀 활동 게시판에 새 댓글 5개",
      course: "컴퓨터보안",
      time: "5시간 전",
      type: "info",
      icon: Bell
    }
  ];

  const checkTimeOverlap = (day: string, startTime: string, endTime: string): boolean => {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    
    return availableTimes.some(time => {
      if (time.day !== day) return false;
      
      const existingStart = new Date(`2000-01-01 ${time.startTime}`);
      const existingEnd = new Date(`2000-01-01 ${time.endTime}`);
      
      return (start < existingEnd && end > existingStart);
    });
  };

  const handleAddTime = () => {
    setTimeOverlapWarning("");
    
    const startTime = `${newTime.startHour}:${newTime.startMinute}`;
    const endTime = `${newTime.endHour}:${newTime.endMinute}`;
    
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    
    if (start >= end) {
      setTimeOverlapWarning("종료 시간은 시작 시간보다 늦어야 합니다.");
      return;
    }

    // 겹치는 시간이 있는지 확인
    if (checkTimeOverlap(newTime.day, startTime, endTime)) {
      setTimeOverlapWarning("⚠️ 이미 해당 요일에 겹치는 시간이 있습니다.");
      return;
    }

    const time: AvailableTime = {
      id: Date.now().toString(),
      day: newTime.day,
      startTime: startTime,
      endTime: endTime
    };
    
    setAvailableTimes([...availableTimes, time]);
    setNewTime({ day: "월요일", startHour: "09", startMinute: "00", endHour: "10", endMinute: "00" });
  };

  const handleRemoveTime = (id: string) => {
    setAvailableTimes(availableTimes.filter(t => t.id !== id));
  };

  const handleAddEvent = () => {
    if (!newEvent.title.trim()) {
      alert("일정 제목을 입력해주세요.");
      return;
    }
    
    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newEvent.title,
      date: newEvent.date,
      color: newEvent.color,
      category: newEvent.category
    };
    setEvents([...events, event]);
    setNewEvent({ title: "", month: 1, date: 1, color: "#a8d5e2", category: "" });
    setIsEventModalOpen(false);
  };

  const handleRemoveEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const handleDateClick = (date: number) => {
    setNewEvent({ ...newEvent, date: date });
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setIsEventDetailModalOpen(true);
  };

  const handleUpdateEvent = () => {
    if (!selectedEvent) return;
    
    if (!selectedEvent.title.trim()) {
      alert("일정 제목을 입력해주세요.");
      return;
    }
    
    setEvents(events.map(e => e.id === selectedEvent.id ? selectedEvent : e));
    setIsEventDetailModalOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    
    if (confirm("이 일정을 삭제하시겠습니까?")) {
      setEvents(events.filter(e => e.id !== selectedEvent.id));
      setIsEventDetailModalOpen(false);
      setSelectedEvent(null);
    }
  };



  const predefinedColors = [
    "#ffb3b3", "#a8d5e2", "#d4c5f9", "#aedcc0", 
    "#ffd4a3", "#f4c2d7", "#fff5ba", "#e5e7eb"
  ];

  return (
    <div className="dashboard">
      {/* 헤더 - 마이페이지 및 로그아웃 버튼 */}
      <header className="dashboard__header">
        <div className="dashboard__header-buttons">
          <button 
            className="dashboard__mypage-button"
            onClick={() => onNavigate('mypage')}
          >
            <User size={18} />
            마이페이지
          </button>
          <button 
            className="dashboard__logout-button"
            onClick={() => onNavigate('home')}
          >
            로그아웃
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* 왼쪽 사이드바 */}
        <aside className="dashboard__sidebar">
        <div className="dashboard__sidebar-header">
          <Calendar size={20} className="dashboard__sidebar-icon" />
          <h2>강의 목록</h2>
        </div>
        <div className="dashboard__sidebar-content">
          {courses.map((course) => (
            <button
              key={course.id}
              className="dashboard__course-button"
            >
              <span className="dashboard__course-code">
                {course.code}
              </span>
              <span className="dashboard__course-title">
                {course.title}
              </span>
            </button>
          ))}
        </div>

        {/* 알림 섹션 */}
        <section className="dashboard__notifications-section">
          <div className="dashboard__notifications-header">
            <div className="dashboard__notifications-header-left">
              <Bell size={20} className="dashboard__notifications-icon" />
              <h3 className="dashboard__notifications-title">new!</h3>
            </div>
            <span className="dashboard__notifications-count">{notifications.length}</span>
          </div>
          <div className="dashboard__notifications-list">
            {notifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <div 
                  key={notification.id} 
                  className={`dashboard__notification-card dashboard__notification-card--${notification.type}`}
                >
                  <div className="dashboard__notification-icon-wrapper">
                    <Icon size={18} />
                  </div>
                  <div className="dashboard__notification-content">
                    <div className="dashboard__notification-header">
                      <span className="dashboard__notification-course">{notification.course}</span>
                      <span className="dashboard__notification-time">{notification.time}</span>
                    </div>
                    <p className="dashboard__notification-text">{notification.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="dashboard__main px-[20px] py-[24px]">
        <div className="dashboard__content-wrapper">
          {/* 캘린더 섹션 */}
          <section className="dashboard__calendar-section">
            {/* 월 네비게이션 */}
            <div className="dashboard__month-nav">
              <button
                className="dashboard__month-nav-button"
                onClick={() => setCurrentMonth("이전 달")}
              >
                <ChevronLeft size={18} />
              </button>
              <span className="dashboard__month-text">{currentMonth}</span>
              <button
                className="dashboard__month-nav-button"
                onClick={() => setCurrentMonth("다음 달")}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* 캘린더 그리드 */}
            <div className="dashboard__calendar">
              {/* 요일 헤더 */}
              <div className="dashboard__calendar-header">
                {weekDays.map((day, index) => (
                  <div
                    key={index}
                    className={`dashboard__calendar-weekday ${
                      index === 0 ? "dashboard__calendar-weekday--sunday" : ""
                    } ${
                      index === 6 ? "dashboard__calendar-weekday--saturday" : ""
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div className="dashboard__calendar-grid">
                {calendarDays.map((day, index) => {
                  const dayEvents = day ? events.filter(e => e.date === day) : [];
                  const isToday = day === 15;
                  
                  return (
                    <div
                      key={index}
                      className={`dashboard__calendar-cell ${
                        !day ? "dashboard__calendar-cell--empty" : ""
                      } ${
                        isToday ? "dashboard__calendar-cell--today" : ""
                      }`}
                      onClick={() => day && handleDateClick(day)}
                    >
                      {day && (
                        <>
                          <div className="dashboard__calendar-date">{day}</div>
                          <div className="dashboard__calendar-events">
                            {dayEvents.map((event) => (
                              <div
                                key={event.id}
                                className="dashboard__calendar-event"
                                style={{ backgroundColor: event.color }}
                                title={event.title}
                                onClick={(e) => handleEventClick(event, e)}
                              >
                                <div className="dashboard__calendar-event-dot"></div>
                                {event.category && `[${event.category}] `}{event.title}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="dashboard__calendar-actions">
              <button 
                className="dashboard__action-button dashboard__action-button--primary"
                onClick={() => setIsEventModalOpen(true)}
              >
                <Plus size={16} />
                일정 추가
              </button>
            </div>
          </section>

          {/* 가능한 시간 목록 섹션 */}
          <section className="dashboard__available-times-section">
              <div className="dashboard__available-times-header">
                <div className="dashboard__available-times-header-left">
                  <Clock size={20} className="dashboard__available-times-icon" />
                  <h3 className="dashboard__available-times-title">가능한 시간</h3>
                </div>
                <div className="dashboard__available-times-header-right">
                  <span className="dashboard__available-times-count">{availableTimes.length}</span>
                  <button 
                    className="dashboard__available-times-add"
                    onClick={() => setIsTimeModalOpen(true)}
                    title="시간 추가"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              {availableTimes.length > 0 ? (
                <div className="dashboard__available-times-list">
                  {availableTimes.map((time) => (
                    <div key={time.id} className="dashboard__available-time-card">
                      <div className="dashboard__available-time-content">
                        <div className="dashboard__available-time-day">{time.day}</div>
                        <div className="dashboard__available-time-time">
                          {time.startTime} - {time.endTime}
                        </div>
                      </div>
                      <button 
                        className="dashboard__available-time-remove"
                        onClick={() => handleRemoveTime(time.id)}
                        title="삭제"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard__available-times-empty">
                  <Clock size={40} className="dashboard__available-times-empty-icon" />
                  <p className="dashboard__available-times-empty-text">
                    아직 추가된 가능한 시간이 없습니다.
                  </p>
                  <p className="dashboard__available-times-empty-hint">
                    오른쪽 위 + 버튼을 눌러 시간을 추가해보세요.
                  </p>
                </div>
              )}
            </section>
        </div>
      </main>
      </div>

      {/* 가능한 시간 추가 모달 */}
      {isTimeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTimeModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <Clock size={24} />
                가능한 시간 추가
              </h2>
              <button 
                className="modal-close"
                onClick={() => setIsTimeModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {/* 시간 추가 폼 */}
              <div className="time-form">
                <div className="time-form-group">
                  <label className="time-form-label">요일</label>
                  <div className="time-form-days-grid">
                    {["월", "화", "수", "목", "금", "토", "일"].map((dayShort, index) => {
                      const dayFull = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"][index];
                      return (
                        <button
                          key={dayFull}
                          type="button"
                          className={`time-form-day-button ${newTime.day === dayFull ? 'time-form-day-button--active' : ''}`}
                          onClick={() => {
                            setNewTime({...newTime, day: dayFull});
                            setTimeOverlapWarning("");
                          }}
                        >
                          {dayShort}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="time-form-row">
                  <div className="time-form-group">
                    <label className="time-form-label">시작 시간</label>
                    <div className="time-form-time-row">
                      <div className="time-form-select-wrapper">
                        <select 
                          className="time-form-select-small"
                          value={newTime.startHour}
                          onChange={(e) => {
                            setNewTime({...newTime, startHour: e.target.value});
                            setTimeOverlapWarning("");
                          }}
                        >
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, '0');
                            return <option key={hour} value={hour}>{hour}</option>;
                          })}
                        </select>
                      </div>
                      <span className="time-form-separator">:</span>
                      <div className="time-form-select-wrapper">
                        <select 
                          className="time-form-select-small"
                          value={newTime.startMinute}
                          onChange={(e) => {
                            setNewTime({...newTime, startMinute: e.target.value});
                            setTimeOverlapWarning("");
                          }}
                        >
                          {["00", "10", "20", "30", "40", "50"].map(min => (
                            <option key={min} value={min}>{min}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="time-form-group">
                    <label className="time-form-label">종료 시간</label>
                    <div className="time-form-time-row">
                      <div className="time-form-select-wrapper">
                        <select 
                          className="time-form-select-small"
                          value={newTime.endHour}
                          onChange={(e) => {
                            setNewTime({...newTime, endHour: e.target.value});
                            setTimeOverlapWarning("");
                          }}
                        >
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, '0');
                            return <option key={hour} value={hour}>{hour}</option>;
                          })}
                        </select>
                      </div>
                      <span className="time-form-separator">:</span>
                      <div className="time-form-select-wrapper">
                        <select 
                          className="time-form-select-small"
                          value={newTime.endMinute}
                          onChange={(e) => {
                            setNewTime({...newTime, endMinute: e.target.value});
                            setTimeOverlapWarning("");
                          }}
                        >
                          {["00", "10", "20", "30", "40", "50"].map(min => (
                            <option key={min} value={min}>{min}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                
                {timeOverlapWarning && (
                  <div className="time-form-warning">
                    {timeOverlapWarning}
                  </div>
                )}

                <button 
                  className="time-form-add-button"
                  onClick={handleAddTime}
                >
                  <Plus size={18} />
                  시간 추가
                </button>
              </div>

              {/* 추가된 시간 목록 */}
              {availableTimes.length > 0 && (
                <div className="time-list">
                  <h3 className="time-list-title">추가된 가능한 시간</h3>
                  <div className="time-list-items">
                    {availableTimes.map((time) => (
                      <div key={time.id} className="time-list-item">
                        <div className="time-list-item-info">
                          <span className="time-list-item-day">{time.day}</span>
                          <span className="time-list-item-time">
                            {time.startTime} - {time.endTime}
                          </span>
                        </div>
                        <button 
                          className="time-list-item-remove"
                          onClick={() => handleRemoveTime(time.id)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="modal-button modal-button--secondary"
                onClick={() => setIsTimeModalOpen(false)}
              >
                취소
              </button>
              <button 
                className="modal-button modal-button--primary"
                onClick={() => {
                  setIsTimeModalOpen(false);
                  // 여기서 저장 로직 추가
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일정 추가 모달 */}
      {isEventModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEventModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <Plus size={24} />
                일정 추가
              </h2>
              <button 
                className="modal-close"
                onClick={() => setIsEventModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {/* 일정 추가 폼 */}
              <div className="event-form">
                <div className="event-form-group">
                  <label className="event-form-label">일정 제목</label>
                  <input 
                    type="text"
                    className="event-form-input"
                    placeholder="예: 중간고사, 과제 제출"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  />
                </div>
                
                <div className="event-form-row">
                  <div className="event-form-group">
                    <label className="event-form-label">월</label>
                    <select 
                      className="event-form-select"
                      value={newEvent.month}
                      onChange={(e) => setNewEvent({...newEvent, month: parseInt(e.target.value)})}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <option key={month} value={month}>
                          {month}월
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="event-form-group">
                    <label className="event-form-label">일</label>
                    <select 
                      className="event-form-select"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({...newEvent, date: parseInt(e.target.value)})}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          {day}일
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <p className="event-form-hint">
                  💡 캘린더에서 날짜를 클릭하여 해당 날짜에 일정을 추가할 수도 있습니다.
                </p>

                <div className="event-form-group">
                  <label className="event-form-label">일정 유형</label>
                  <input 
                    type="text"
                    className="event-form-input"
                    placeholder="예: 과제, 시험, 회의 등"
                    value={newEvent.category}
                    onChange={(e) => setNewEvent({...newEvent, category: e.target.value})}
                  />
                </div>

                <div className="event-form-group">
                  <label className="event-form-label">색상</label>
                  <div className="event-color-picker">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        className={`event-color-swatch ${newEvent.color === color ? 'event-color-swatch--active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewEvent({...newEvent, color: color})}
                      >
                        {newEvent.color === color && <span className="event-color-check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 미리보기 */}
              <div className="event-preview">
                <div className="event-preview-label">미리보기</div>
                <div 
                  className="event-preview-card"
                  style={{ backgroundColor: newEvent.color }}
                >
                  <div className="event-preview-header">
                    {newEvent.category && (
                      <span className="event-preview-category">{newEvent.category}</span>
                    )}
                    <span className="event-preview-date">{newEvent.month}월 {newEvent.date}일</span>
                  </div>
                  <div className="event-preview-title">
                    {newEvent.title || "일정 제목을 입력하세요"}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="modal-button modal-button--secondary"
                onClick={() => setIsEventModalOpen(false)}
              >
                취소
              </button>
              <button 
                className="modal-button modal-button--primary"
                onClick={handleAddEvent}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일정 상세/수정 모달 */}
      {isEventDetailModalOpen && selectedEvent && (
        <div className="modal-overlay" onClick={() => setIsEventDetailModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <Calendar size={24} />
                일정 수정
              </h2>
              <button 
                className="modal-close"
                onClick={() => setIsEventDetailModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="event-form">
                <div className="event-form-group">
                  <label className="event-form-label">일정 제목</label>
                  <input 
                    type="text"
                    className="event-form-input"
                    placeholder="예: 중간고사, 과제 제출"
                    value={selectedEvent.title}
                    onChange={(e) => setSelectedEvent({...selectedEvent, title: e.target.value})}
                  />
                </div>
                
                <div className="event-form-group">
                  <label className="event-form-label">날짜</label>
                  <select 
                    className="event-form-select"
                    value={selectedEvent.date}
                    onChange={(e) => setSelectedEvent({...selectedEvent, date: parseInt(e.target.value)})}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}일
                      </option>
                    ))}
                  </select>
                </div>

                <div className="event-form-group">
                  <label className="event-form-label">일정 유형</label>
                  <input 
                    type="text"
                    className="event-form-input"
                    placeholder="예: 과제, 시험, 회의 등"
                    value={selectedEvent.category || ""}
                    onChange={(e) => setSelectedEvent({...selectedEvent, category: e.target.value})}
                  />
                </div>

                <div className="event-form-group">
                  <label className="event-form-label">색상</label>
                  <div className="event-color-picker">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`event-color-swatch ${selectedEvent.color === color ? 'event-color-swatch--active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setSelectedEvent({...selectedEvent, color: color})}
                      >
                        {selectedEvent.color === color && <span className="event-color-check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 미리보기 */}
              <div className="event-preview">
                <div className="event-preview-label">미리보기</div>
                <div 
                  className="event-preview-card"
                  style={{ backgroundColor: selectedEvent.color }}
                >
                  <div className="event-preview-header">
                    {selectedEvent.category && (
                      <span className="event-preview-category">{selectedEvent.category}</span>
                    )}
                    <span className="event-preview-date">1월 {selectedEvent.date}일</span>
                  </div>
                  <div className="event-preview-title">
                    {selectedEvent.title || "일정 제목을 입력하세요"}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="modal-button modal-button--danger"
                onClick={handleDeleteEvent}
              >
                삭제
              </button>
              <div style={{ flex: 1 }}></div>
              <button 
                className="modal-button modal-button--secondary"
                onClick={() => setIsEventDetailModalOpen(false)}
              >
                취소
              </button>
              <button 
                className="modal-button modal-button--primary"
                onClick={handleUpdateEvent}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

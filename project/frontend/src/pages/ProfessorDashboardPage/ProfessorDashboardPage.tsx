import React, { useState, useEffect } from "react";
import { Bell, ChevronLeft, ChevronRight, Plus, Calendar, Clock, AlertCircle, CheckCircle, X, User, List } from "lucide-react";
import { Dialog } from "../../../components/ui/dialog";
import ProfessorCourseBoardPage from "../ProfessorCourseBoardPage/ProfessorCourseBoardPage";
import { getMyCourses, createCourse, deleteCourse } from "../../api/course";
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from "../../api/schedule";
import "./professor-dashboard.css";


interface MainDashboardPageProps {
  onNavigate: (page: string) => void;
}

// 캘린더 이벤트 타입
interface CalendarEvent {
  id: number;
  title: string;
  date: number; // 1-31
  month: number; // 1-12
  year: number;
  color: string;
  category?: string;
}

// 강의 타입
interface Course {
  id: number;
  title: string;
  code: string;
}

export default function MainDashboardPage({ onNavigate }: MainDashboardPageProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0~11

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventDetailModalOpen, setIsEventDetailModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    month: today.getMonth() + 1, 
    date: today.getDate(), 
    color: "#a8d5e2", 
    category: "" 
  });
  
  // 강의 목록 state로 변경
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourse, setNewCourse] = useState({ title: "", code: "" });

  // 강의 목록 로드
  async function loadCourses() {
    try {
      const data = await getMyCourses();
      setCourses(data);
    } catch (err) {
      console.error("강의 목록 로드 실패:", err);
    }
  }

  // 일정 불러오기
  const fetchSchedules = async () => {
    try {
      const data = await getSchedules(currentYear, currentMonth + 1);
      setEvents(data);
    } catch (error) {
      console.error("일정 불러오기 실패:", error);
    }
  }

  // 컴포넌트 마운트 시 강의 목록 및 일정 로드
  useEffect(() => {
    loadCourses();
    fetchSchedules();
  }, []);

  // 월이 변경되면 일정 다시 로드
  useEffect(() => {
    fetchSchedules();
  }, [currentYear, currentMonth]);

  // MyPage에서 돌아온 경우 courseboard 자동 선택
  useEffect(() => {
    const selectedCourseStr = localStorage.getItem('selectedCourse');
    if (selectedCourseStr) {
      const courseInfo = JSON.parse(selectedCourseStr);
      // courses 배열에서 해당 course 찾기
      const course = courses.find(c => c.id === courseInfo.courseId);
      if (course) {
        setSelectedCourse(course);
      }
      localStorage.removeItem('selectedCourse');
    }
  }, [courses]);

  // 게시판 페이지가 선택되었을 때
  if (selectedCourse) {
    return (
      <ProfessorCourseBoardPage 
        course={selectedCourse} 
        onBack={() => setSelectedCourse(null)}
        onNavigate={onNavigate}
      />
    );
  }

  // 캘린더 날짜 생성 (2025년 1월 - 수요일 시작)
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0=일요일
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); // 말일
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

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      alert("일정 제목을 입력해주세요.");
      return;
    }
    
    try {
      await createSchedule({
        title: newEvent.title,
        date: newEvent.date,
        month: newEvent.month,
        year: currentYear,
        color: newEvent.color,
        category: newEvent.category
      });

      await fetchSchedules(); // 일정 다시 로드
      setIsEventModalOpen(false);
      const now = new Date();
      setNewEvent({ 
        title: "", 
        month: now.getMonth() + 1, 
        date: now.getDate(), 
        color: "#a8d5e2", 
        category: "" 
      });
    } catch (error) {
      console.error("일정 추가 실패:", error);
      alert("일정 추가에 실패했습니다.");
    }
  };

  const handleRemoveEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const handleDateClick = (date: number) => {
    setNewEvent({ 
      title: "",
      date: date,
      month: currentMonth + 1,
      year: currentYear,
      color: "#a8d5e2",
      category: ""
    });
    setIsEventModalOpen(true);
  };

  const handleOpenEventModal = () => {
    const now = new Date();
    setNewEvent({ 
      title: "",
      date: now.getDate(),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      color: "#a8d5e2",
      category: ""
    });
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setIsEventDetailModalOpen(true);
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;
    
    if (!selectedEvent.title.trim()) {
      alert("일정 제목을 입력해주세요.");
      return;
    }
    
    try {
      await updateSchedule(selectedEvent.id, {
        title: selectedEvent.title,
        date: selectedEvent.date,
        month: selectedEvent.month,
        year: selectedEvent.year,
        color: selectedEvent.color,
        category: selectedEvent.category
      });

      await fetchSchedules(); // 일정 다시 로드
      setIsEventDetailModalOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error("일정 수정 실패:", error);
      alert("일정 수정에 실패했습니다.");
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    if (confirm("이 일정을 삭제하시겠습니까?")) {
      try {
        await deleteSchedule(selectedEvent.id);
        await fetchSchedules(); // 일정 다시 로드
        setIsEventDetailModalOpen(false);
        setSelectedEvent(null);
      } catch (error) {
        console.error("일정 삭제 실패:", error);
        alert("일정 삭제에 실패했습니다.");
      }
    }
  };

  const handleAddCourse = async () => {
    if (!newCourse.title.trim() || !newCourse.code.trim()) {
      alert("강의명과 강의 코드를 모두 입력해주세요.");
      return;
    }

    try {
      const res = await createCourse(newCourse.title.trim(), newCourse.code.trim());
      
      // 서버에서 생성된 강의를 목록에 추가
      setCourses((prev) => [...prev, res.course]);
      setNewCourse({ title: "", code: "" });
      setIsCourseModalOpen(false);
      alert("강의가 추가되었습니다!");
    } catch (err: any) {
      console.error("강의 추가 실패:", err);
      if (err.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert("강의 추가 중 오류가 발생했습니다.");
      }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <List size={20} className="dashboard__sidebar-icon" />
            <h2>강의 목록</h2>
          </div>
          <button 
            className="dashboard__course-add-button"
            onClick={() => setIsCourseModalOpen(true)}
            title="강의 추가"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="dashboard__sidebar-content">
          {courses.map((course) => (
            <button
              key={course.id}
              className="dashboard__course-button"
              onClick={() => setSelectedCourse(course)}
            >
              <span className="dashboard__course-code">{course.code}</span>
              <span className="dashboard__course-title">{course.title}</span>
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
                onClick={handlePrevMonth}
              >
                <ChevronLeft size={18} />
              </button>
              <span className="dashboard__month-text">{`${currentYear}년 ${currentMonth + 1}월`}</span>
              <button
                className="dashboard__month-nav-button"
                onClick={handleNextMonth}
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

                  const today = new Date();
                  const nowYear = today.getFullYear();
                  const nowMonth = today.getMonth();
                  const nowDate = today.getDate();

                  const isToday =
                    day &&
                    nowYear === currentYear &&
                    nowMonth === currentMonth &&
                    day === nowDate;

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
                onClick={handleOpenEventModal}
              >
                <Plus size={16} />
                일정 추가
              </button>
            </div>
          </section>
        </div>
      </main>
      </div>

      {/* 강의 추가 모달 */}
      {isCourseModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCourseModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <Plus size={24} />
                강의 추가
              </h2>
              <button 
                className="modal-close"
                onClick={() => setIsCourseModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="event-form">
                <div className="event-form-group">
                  <label className="event-form-label">강의명</label>
                  <input 
                    type="text"
                    className="event-form-input"
                    placeholder="예: 운영체제"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                  />
                </div>
                
                <div className="event-form-group">
                  <label className="event-form-label">강의 코드</label>
                  <input 
                    type="text"
                    className="event-form-input"
                    placeholder="예: CSE301"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="modal-button modal-button--secondary"
                onClick={() => setIsCourseModalOpen(false)}
              >
                취소
              </button>
              <button 
                className="modal-button modal-button--primary"
                onClick={handleAddCourse}
              >
                추가
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
                        type="button"
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

      {/* 일정 상세보기/수정 모달 */}
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
            </div>

            <div className="modal-footer">
              <button 
                className="modal-button modal-button--danger"
                onClick={handleDeleteEvent}
              >
                삭제
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
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
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, ChevronLeft, ChevronRight, Plus, Calendar, Clock, AlertCircle, CheckCircle, X, User, List, MessageCircle, FileText } from "lucide-react";
import CourseBoardPage from "../StudentCourseBoardPage/StudentCourseBoardPage";
import "./student-dashboard.css";
import { addAvailableTime, getMyAvailableTimes, deleteAvailableTime } from "../../api/available";
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from "../../api/schedule";
import { getNotifications, markAsRead, markAllAsRead } from "../../api/notification";
import { useAuth } from "../../contexts/AuthContext";
import { useCourses } from "../../contexts/CourseContext";
import { onNotificationUpdated, notifyNotificationUpdated } from "../../utils/notificationSync";
import AlertDialog from "../Alert/AlertDialog";
import ConfirmDialog from "../../components/ConfirmDialog";

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

// 가능한 시간 타입
interface AvailableTime {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  isSynced?: boolean;
}

// 강의 타입 (CourseContext와 일치하도록 수정)
interface Course {
  id: number;
  title: string;
  code: string;
  professor_name?: string;
  professor_id?: number;
  join_code?: string;
}

// 알림 타입
interface Notification {
  id: number;
  type: string;
  content: string;
  related_id?: number | null;
  comment_id?: number | null;
  course_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export default function MainDashboardPage({ onNavigate }: MainDashboardPageProps) {
  const { user, logout } = useAuth();
  const { courses: contextCourses, isLoading: coursesLoading } = useCourses(); // Context에서 강의 목록 가져오기
  const courses = contextCourses as Course[]; // 타입 단언
  const navigate = useNavigate();
  const location = useLocation();
  console.log("현재 로그인 유저:", user);

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

  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventDetailModalOpen, setIsEventDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([]);
  const [tempAvailableTimes, setTempAvailableTimes] = useState<AvailableTime[]>([]); // 모달 내부에서만 사용할 임시 상태
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const AVAILABLE_START_HOUR = 9;
  const AVAILABLE_END_HOUR = 20;
  const AVAILABLE_HOURS = Array.from(
    { length: AVAILABLE_END_HOUR - AVAILABLE_START_HOUR + 1 },
    (_, index) => (AVAILABLE_START_HOUR + index).toString().padStart(2, "0")
  );

  const [newTime, setNewTime] = useState({
    day: "월요일",
    startHour: AVAILABLE_START_HOUR.toString().padStart(2, "0"),
    startMinute: "00",
    endHour: (AVAILABLE_START_HOUR + 1).toString().padStart(2, "0"),
    endMinute: "00"
  });
  const [timeOverlapWarning, setTimeOverlapWarning] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    month: today.getMonth() + 1, 
    date: today.getDate(), 
    year: today.getFullYear(),
    color: "#a8d5e2", 
    category: "" 
  });


  const fetchAvailableTimes = async () => {
    try {
      const data = await getMyAvailableTimes();
      // 배열인지 확인하고, 에러 객체가 아닌지 확인
      if (Array.isArray(data)) {
        const formatted = data.map((t: any) => ({
          id: t.id.toString(),
          day: t.day_of_week,
          startTime: t.start_time,
          endTime: t.end_time,
          isSynced: true,
        }));
        setAvailableTimes(formatted);
      } else {
        // 에러 응답이거나 배열이 아닌 경우 빈 배열 설정
        setAvailableTimes([]);
      }
    } catch (error) {
      console.error("가능한 시간 불러오기 실패:", error);
      setAvailableTimes([]);
    }
  }

  // 일정 불러오기
  const fetchSchedules = async () => {
    try {
      const data = await getSchedules(currentYear as any, (currentMonth + 1) as any);
      // 배열인지 확인
      if (Array.isArray(data)) {
        setEvents(data);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("일정 불러오기 실패:", error);
      setEvents([]);
    }
  }

  // 강의 목록은 Context에서 관리 (중복 API 호출 방지)

  useEffect(() => {
    fetchAvailableTimes();
    fetchSchedules(); // 일정도 로드
    loadNotifications(); // 알림 로드
    
    // 30초마다 알림 자동 새로고침 (성능 최적화)
    const notificationInterval = setInterval(() => {
      loadNotifications();
    }, 30000);
    
    return () => clearInterval(notificationInterval);
  }, []); // loadEnrolledCourses 제거 (Context에서 자동 로드)

  // 알림 로드
  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      // 배열인지 확인
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error("알림 불러오기 실패:", err);
      setNotifications([]);
    }
  };

  // 월이 변경되면 일정 다시 로드
  useEffect(() => {
    fetchSchedules();
  }, [currentYear, currentMonth]);

  // 알림 동기화 리스너 (다른 페이지에서 알림을 읽으면 즉시 반영)
  useEffect(() => {
    const unsubscribe = onNotificationUpdated((detail) => {
      if (detail.type === 'read-all') {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      } else if (detail.type === 'read' && detail.notificationId) {
        setNotifications(prev => 
          prev.map(n => n.id === detail.notificationId ? { ...n, is_read: true } : n)
        );
      }
    });

    return unsubscribe;
  }, []);

  // URL에서 강의 ID 확인 및 복원 (초기 로드 및 MyPage에서 돌아온 경우)
  useEffect(() => {
    if (courses.length === 0) return;

    // URL 경로에서 강의 ID 추출 (예: /student-dashboard/course/123)
    const pathParts = location.pathname.split('/');
    const courseIndex = pathParts.indexOf('course');
    if (courseIndex !== -1 && pathParts[courseIndex + 1]) {
      const courseIdFromUrl = parseInt(pathParts[courseIndex + 1]);
      if (courseIdFromUrl) {
        const course = courses.find(c => c.id === courseIdFromUrl);
        if (course && course.id !== selectedCourse?.id) {
          setSelectedCourse(course);
          return;
        }
      }
    }

    // MyPage에서 돌아온 경우 courseboard 자동 선택 (기존 호환성)
    const selectedCourseStr = localStorage.getItem('selectedCourse');
    if (selectedCourseStr) {
      const courseInfo = JSON.parse(selectedCourseStr);
      // courses 배열에서 해당 course 찾기
      const course = courses.find(c => c.id === courseInfo.courseId);
      if (course) {
        setSelectedCourse(course);
        // URL도 업데이트
        navigate(`/student-dashboard/course/${course.id}`, { replace: true });
      }
      localStorage.removeItem('selectedCourse');
    }
  }, [courses, location.pathname, navigate]); // selectedCourse 제거로 무한 루프 방지

  // 다른 화면(교수/학생 게시판 등)에서 저장한 알림 타겟이 있는 경우 처리
  useEffect(() => {
    const stored = localStorage.getItem("notificationTarget");
    if (!stored) return;

    try {
      const target = JSON.parse(stored);
      if (!target.courseCode || typeof target.postId !== "number") return;

      const course = courses.find((c) => c.code === target.courseCode);
      if (course) {
        setSelectedCourse(course);
        navigate(`/student-dashboard/course/${course.id}`, { replace: false });
      }
    } catch (err) {
      console.error("알림 타겟 파싱 실패:", err);
    } finally {
      localStorage.removeItem("notificationTarget");
    }
  }, [courses]);

  // 캘린더 날짜 생성 (2025년 1월 - 수요일 시작)
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const totalCells = Math.ceil((daysInMonth + firstDayOfWeek) / 7) * 7;

  const calendarDays = Array.from({ length: totalCells }, (_, i) => {
    const dayNumber = i - firstDayOfWeek + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  // 알림 아이콘 매핑
  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'notice': return AlertCircle;
      case 'comment': return MessageCircle;
      case 'reply': return MessageCircle;
      case 'enrollment': return CheckCircle;
      case 'recruitment_join': return CheckCircle;
      case 'team_post': return FileText;
      default: return Bell;
    }
  };

  // 알림 타입에 따른 배경색 (읽지 않은 경우만)
  const getNotificationIconBg = (type: string) => {
    switch(type) {
      case 'notice': return '#ef4444'; // 빨간색
      case 'comment': return '#3b82f6'; // 파란색
      case 'reply': return '#3b82f6'; // 파란색
      case 'enrollment': return '#10b981'; // 초록색
      case 'recruitment_join': return '#10b981'; // 초록색
      case 'team_post': return '#a855f7'; // 보라색 (팀 게시판)
      default: return '#3b82f6'; // 파란색
    }
  };

  // 알림 클릭 핸들러
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      // 낙관적 업데이트: UI를 먼저 업데이트
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? {...n, is_read: true} : n)
      );
      
      // 다른 페이지에도 알림 (즉시 동기화)
      notifyNotificationUpdated({ type: 'read', notificationId: notification.id });
      
      try {
        await markAsRead(notification.id);
      } catch (err) {
        console.error("알림 읽음 처리 실패:", err);
      }
    }

    // 게시판 관련 알림이면 해당 강의의 게시판으로 이동
    if (
      (notification.type === 'notice' || notification.type === 'comment' || notification.type === 'reply' || notification.type === 'team_post') &&
      notification.course_id &&
      notification.related_id
    ) {
      const targetCourse = courses.find((c) => c.code === notification.course_id);
      if (targetCourse) {
        try {
          // 팀게시판 알림인 경우 팀게시판 이름 추출
          let teamBoardName = null;
          if (notification.type === 'team_post' || notification.type === 'comment' || notification.type === 'reply') {
            // 알림 내용에서 "팀게시판-{이름}" 패턴 추출
            const match = notification.content.match(/팀게시판-([^\s]+)/);
            if (match && match[1]) {
              teamBoardName = match[1];
            }
          }
          
          localStorage.setItem(
            "notificationTarget",
            JSON.stringify({
              courseCode: notification.course_id,
              postId: notification.related_id,
              commentId: notification.comment_id,
              teamBoardName: teamBoardName,
            })
          );
        } catch (e) {
          console.error("알림 타겟 저장 실패:", e);
        }
        setSelectedCourse(targetCourse);
      }
    }

    // 강의 참여 알림이면 해당 강의의 게시판으로 이동
    if (notification.type === 'enrollment' && notification.course_id) {
      const targetCourse = courses.find((c) => c.code === notification.course_id);
      if (targetCourse) {
        try {
          localStorage.setItem(
            "notificationTarget",
            JSON.stringify({
              courseCode: notification.course_id,
              type: 'enrollment',
            })
          );
        } catch (e) {
          console.error("알림 타겟 저장 실패:", e);
        }
        setSelectedCourse(targetCourse);
      }
    }

    // 팀 모집 참여 알림이면 해당 강의의 게시판으로 이동 (모집 탭)
    if (notification.type === 'recruitment_join' && notification.course_id) {
      const targetCourse = courses.find((c) => c.code === notification.course_id);
      if (targetCourse) {
        try {
          localStorage.setItem(
            "notificationTarget",
            JSON.stringify({
              courseCode: notification.course_id,
              type: 'recruitment_join',
              recruitmentId: notification.related_id,
            })
          );
        } catch (e) {
          console.error("알림 타겟 저장 실패:", e);
        }
        setSelectedCourse(targetCourse);
      }
    }
  };

  // 알림 내용에서 강의명 추출
  const extractCourseName = (content: string): string => {
    // [강의명] 형식에서 추출
    const match = content.match(/\[([^\]]+)\]/);
    if (match && match[1]) {
      return match[1];
    }
    
    // '강의명' 형식에서 추출 (공지사항 등)
    const quoteMatch = content.match(/'([^']+)'\s*강의/);
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1];
    }
    
    return '알림';
  };

  // 상대 시간 계산 (몇분 전, 몇시간 전, 날짜)
  const getRelativeTime = (dateString: string): string => {
    try {
      const now = new Date();
      let notifDate: Date;
      
      if (dateString.includes('T')) {
        // ISO 형식
        notifDate = new Date(dateString);
      } else {
        // "2025-11-24 12:27" 형식을 로컬 시간으로 정확히 파싱
        const [datePart, timePart] = dateString.split(' ');
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        notifDate = new Date(
          parseInt(year), 
          parseInt(month) - 1, 
          parseInt(day), 
          parseInt(hour), 
          parseInt(minute)
        );
      }
      
      const diffMs = now.getTime() - notifDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= 1) {
        return `${diffDays}일 전`;
      } else if (diffHours >= 1) {
        return `${diffHours}시간 전`;
      } else if (diffMinutes >= 1) {
        return `${diffMinutes}분 전`;
      } else {
        return '방금 전';
      }
    } catch (error) {
      console.error('날짜 파싱 오류:', error, dateString);
      return dateString;
    }
  };

  const checkTimeOverlap = (day: string, startTime: string, endTime: string, timesToCheck: AvailableTime[]): boolean => {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);

    return timesToCheck.some(time => {
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

    // 겹치는 시간이 있는지 확인 (모달 내부의 임시 상태 사용)
    if (checkTimeOverlap(newTime.day, startTime, endTime, tempAvailableTimes)) {
      setTimeOverlapWarning("⚠️ 이미 해당 요일에 겹치는 시간이 있습니다.");
      return;
    }

    const time: AvailableTime = {
      id: Date.now().toString(),
      day: newTime.day,
      startTime: startTime,
      endTime: endTime,
      isSynced: false,
    };

    setTempAvailableTimes([...tempAvailableTimes, time]);
    setNewTime({ day: "월요일", startHour: "09", startMinute: "00", endHour: "10", endMinute: "00" });
  };

  // 모달 외부에서 사용하는 삭제 함수 (즉시 서버에 반영)
  const handleRemoveTime = async (id: string) => {
    const target = availableTimes.find((time) => time.id === id);
    setAvailableTimes((prev) => prev.filter((time) => time.id !== id));

    if (!target?.isSynced) {
      return;
    }
    
    try {
      const parsedId = Number(id);
      await deleteAvailableTime(Number.isNaN(parsedId) ? id : parsedId);
      await fetchAvailableTimes();
    } catch (error) {
      console.error(error);
    }
  };

  // 모달 내부에서 사용하는 삭제 함수 (임시 상태만 수정)
  const handleRemoveTimeInModal = (id: string) => {
    setTempAvailableTimes((prev) => prev.filter((time) => time.id !== id));
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      setAlertMessage("일정 제목을 입력해주세요.");
      setShowAlert(true);
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
        year: now.getFullYear(),
        color: "#a8d5e2", 
        category: "" 
      });
    } catch (error) {
      console.error("일정 추가 실패:", error);
      setAlertMessage("일정 추가에 실패했습니다.");
      setShowAlert(true);
    }
  };

  // handleRemoveEvent 함수는 현재 사용되지 않음
  // const handleRemoveEvent = (id: number) => {
  //   setEvents(events.filter(e => e.id !== id));
  // };

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
      year: currentYear,
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
      setAlertMessage("일정 제목을 입력해주세요.");
      setShowAlert(true);
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
      setAlertMessage("일정 수정에 실패했습니다.");
      setShowAlert(true);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    setConfirmMessage("이 일정을 삭제하시겠습니까?");
    setConfirmCallback(() => async () => {
      try {
        await deleteSchedule(selectedEvent.id);
        await fetchSchedules(); // 일정 다시 로드
        setIsEventDetailModalOpen(false);
        setSelectedEvent(null);
      } catch (error) {
        console.error("일정 삭제 실패:", error);
        setAlertMessage("일정 삭제에 실패했습니다.");
        setShowAlert(true);
      }
    });
    setShowConfirm(true);
  };


  const predefinedColors = [
    "#ffb3b3", "#a8d5e2", "#d4c5f9", "#aedcc0",
    "#ffd4a3", "#f4c2d7", "#fff5ba", "#e5e7eb"
  ];

  // 강의 선택 시 URL 업데이트
  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    navigate(`/student-dashboard/course/${course.id}`, { replace: false });
  };

  // 뒤로가기 버튼 처리
  const handleBack = () => {
    setSelectedCourse(null);
    navigate('/student-dashboard', { replace: false });
  };

  // URL 변경 감지 (뒤로가기/앞으로가기) - courses가 로드된 후에만 작동
  useEffect(() => {
    if (courses.length === 0) return;

    const pathParts = location.pathname.split('/');
    const courseIndex = pathParts.indexOf('course');
    
    if (courseIndex === -1 || !pathParts[courseIndex + 1]) {
      // URL에 강의 ID가 없으면 선택 해제
      if (selectedCourse) {
        setSelectedCourse(null);
      }
    } else {
      // URL에 강의 ID가 있으면 해당 강의 선택
      const courseIdFromUrl = parseInt(pathParts[courseIndex + 1]);
      if (courseIdFromUrl) {
        const course = courses.find(c => c.id === courseIdFromUrl);
        if (course && course.id !== selectedCourse?.id) {
          setSelectedCourse(course);
        } else if (!course && selectedCourse) {
          // URL에 있는 강의 ID가 courses에 없으면 선택 해제
          setSelectedCourse(null);
        }
      }
    }
  }, [location.pathname, courses]); // selectedCourse 제거로 무한 루프 방지

  // 강의 목록 로딩 중이고 URL에 강의 ID가 있으면 로딩 표시 (깜빡임 방지)
  // 또는 URL에 강의 ID가 있지만 아직 selectedCourse가 설정되지 않은 경우에도 로딩 표시
  const pathParts = location.pathname.split('/');
  const courseIndex = pathParts.indexOf('course');
  const hasCourseInUrl = courseIndex !== -1 && pathParts[courseIndex + 1];
  
  if ((coursesLoading || !selectedCourse) && hasCourseInUrl) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f9fafb'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #a855f7',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  // 강의가 선택된 경우: 교수 페이지와 동일하게 강의 게시판만 전체 화면으로 표시
  if (selectedCourse) {
    return (
      <CourseBoardPage
        course={selectedCourse}
        onBack={handleBack}
        onNavigate={onNavigate}
        availableTimes={availableTimes}
      />
    );
  }

  return (
    <>
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
                onClick={() => { 
                  logout(); 
                  // 로그아웃 후 홈으로 이동
                  window.location.href = '/';
                }}
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
              </div>
              <div className="dashboard__sidebar-content">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    className="dashboard__course-button"
                    onClick={() => handleCourseSelect(course)}
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
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0px', alignItems: 'center' }}>
                      {Array.isArray(notifications) && notifications.some(n => !n.is_read) && (
                        <button 
                          onClick={async () => {
                            // 낙관적 업데이트: UI를 먼저 업데이트
                            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                            
                            // 다른 페이지에도 알림 (즉시 동기화)
                            notifyNotificationUpdated({ type: 'read-all' });
                            
                            try {
                              await markAllAsRead();
                            } catch (err) {
                              console.error("모두 읽음 처리 실패:", err);
                              // 실패 시 원래대로 복구
                              await loadNotifications();
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#a855f7',
                            fontSize: '12px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          모두 읽음
                        </button>
                      )}
                      <button 
                        onClick={() => setShowAllNotifications(!showAllNotifications)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#6b7280',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {showAllNotifications ? '읽지 않은 알림' : '모두 보기'}
                      </button>
                    </div>
                    <span className="dashboard__notifications-count">
                      {Array.isArray(notifications) ? (showAllNotifications ? notifications.length : notifications.filter(n => !n.is_read).length) : 0}
                    </span>
                  </div>
                </div>
                <div className="dashboard__notifications-list">
                  {(!Array.isArray(notifications) || (showAllNotifications ? notifications : notifications.filter(n => !n.is_read)).length === 0) ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                      알림이 없습니다
                    </div>
                  ) : (
                    (showAllNotifications ? notifications : notifications.filter(n => !n.is_read)).map((notification) => {
                      const Icon = getNotificationIcon(notification.type);
                      const notificationType = notification.is_read ? 'info' : 'urgent';
                      
                      return (
                        <div
                          key={notification.id}
                          className={`dashboard__notification-card dashboard__notification-card--${notificationType}`}
                          onClick={() => handleNotificationClick(notification)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="dashboard__notification-icon-wrapper">
                            <Icon 
                              size={18} 
                              style={{
                                color: notification.is_read ? '#9ca3af' : getNotificationIconBg(notification.type)
                              }}
                            />
                          </div>
                          <div className="dashboard__notification-content">
                            <div className="dashboard__notification-header">
                              <span className="dashboard__notification-course">{extractCourseName(notification.content)}</span>
                              <span className="dashboard__notification-time">{getRelativeTime(notification.created_at)}</span>
                            </div>
                            <p className="dashboard__notification-text">{notification.content}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
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
                          className={`dashboard__calendar-weekday ${index === 0 ? "dashboard__calendar-weekday--sunday" : ""
                            } ${index === 6 ? "dashboard__calendar-weekday--saturday" : ""
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
                            className={`dashboard__calendar-cell ${!day ? "dashboard__calendar-cell--empty" : ""
                              } ${isToday ? "dashboard__calendar-cell--today" : ""
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
                        onClick={() => {
                          // 모달 열 때 현재 availableTimes를 tempAvailableTimes로 복사
                          setTempAvailableTimes([...availableTimes]);
                          setIsTimeModalOpen(true);
                        }}
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
      </div>

      {/* 가능한 시간 추가 모달 */}
      {isTimeModalOpen && (
        <div className="modal-overlay">
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">
                    <Clock size={24} />
                    가능한 시간 추가
                  </h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      // 취소 시 임시 상태 버리고 모달 닫기
                      setTempAvailableTimes([]);
                      setIsTimeModalOpen(false);
                    }}
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
                                setNewTime({ ...newTime, day: dayFull });
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
                                setNewTime({ ...newTime, startHour: e.target.value });
                                setTimeOverlapWarning("");
                              }}
                            >
                              {AVAILABLE_HOURS.map((hour) => (
                                <option key={hour} value={hour}>
                                  {hour}
                                </option>
                              ))}
                            </select>
                          </div>
                          <span className="time-form-separator">:</span>
                          <div className="time-form-select-wrapper">
                            <select
                              className="time-form-select-small"
                              value={newTime.startMinute}
                              onChange={(e) => {
                                setNewTime({ ...newTime, startMinute: e.target.value });
                                setTimeOverlapWarning("");
                              }}
                            >
                              {["00", "30"].map(min => (
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
                                setNewTime({ ...newTime, endHour: e.target.value });
                                setTimeOverlapWarning("");
                              }}
                            >
                              {AVAILABLE_HOURS.map((hour) => (
                                <option key={hour} value={hour}>
                                  {hour}
                                </option>
                              ))}
                            </select>
                          </div>
                          <span className="time-form-separator">:</span>
                          <div className="time-form-select-wrapper">
                            <select
                              className="time-form-select-small"
                              value={newTime.endMinute}
                              onChange={(e) => {
                                setNewTime({ ...newTime, endMinute: e.target.value });
                                setTimeOverlapWarning("");
                              }}
                            >
                              {["00", "30"].map(min => (
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
                  {tempAvailableTimes.length > 0 && (
                    <div className="time-list">
                      <h3 className="time-list-title">추가된 가능한 시간</h3>
                      <div className="time-list-items">
                        {tempAvailableTimes.map((time) => (
                          <div key={time.id} className="time-list-item">
                            <div className="time-list-item-info">
                              <span className="time-list-item-day">{time.day}</span>
                              <span className="time-list-item-time">
                                {time.startTime} - {time.endTime}
                              </span>
                            </div>
                            <button
                              className="time-list-item-remove"
                              onClick={() => handleRemoveTimeInModal(time.id)}
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
                    onClick={() => {
                      // 취소 시 임시 상태 버리고 모달 닫기
                      setTempAvailableTimes([]);
                      setIsTimeModalOpen(false);
                    }}
                  >
                    취소
                  </button>
                  <button
                    className="modal-button modal-button--primary"
                    onClick={async () => {
                      // 저장 시 변경사항을 서버에 반영
                      
                      // 1. 삭제된 시간 처리 (원래 있던 시간 중 임시 상태에 없는 시간)
                      const originalSyncedTimes = availableTimes.filter(t => t.isSynced);
                      const currentSyncedTimes = tempAvailableTimes.filter(t => t.isSynced);
                      const deletedTimes = originalSyncedTimes.filter(
                        original => !currentSyncedTimes.some(current => current.id === original.id)
                      );
                      
                      for (const time of deletedTimes) {
                        try {
                          const parsedId = Number(time.id);
                          await deleteAvailableTime(Number.isNaN(parsedId) ? time.id : parsedId);
                        } catch (error) {
                          console.error("시간 삭제 실패:", error);
                        }
                      }
                      
                      // 2. 추가된 시간 처리 (임시 상태에 있지만 원래 상태에 없는 시간)
                      const newTimes = tempAvailableTimes.filter(
                        temp => !availableTimes.some(original => original.id === temp.id)
                      );
                      
                      for (const time of newTimes) {
                        const result = await addAvailableTime(
                          time.day,
                          time.startTime,
                          time.endTime
                        );
                        if (result.status !== 201) {
                          console.error(result.message || "저장 실패");
                        }
                      }
                      
                      // 서버에서 최신 데이터 다시 불러오기
                      await fetchAvailableTimes();
                      setAlertMessage("시간이 저장되었습니다.");
                      setShowAlert(true);
                      setTempAvailableTimes([]);
                      setIsTimeModalOpen(false);
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
        <div className="modal-overlay">
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
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      />
                    </div>

                    <div className="event-form-row">
                      <div className="event-form-group">
                        <label className="event-form-label">월</label>
                        <select
                          className="event-form-select"
                          value={newEvent.month}
                          onChange={(e) => setNewEvent({ ...newEvent, month: parseInt(e.target.value) })}
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
                          onChange={(e) => setNewEvent({ ...newEvent, date: parseInt(e.target.value) })}
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
                        onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
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
                            onClick={() => setNewEvent({ ...newEvent, color: color })}
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
                        onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
                      />
                    </div>

                    <div className="event-form-group">
                      <label className="event-form-label">날짜</label>
                      <select
                        className="event-form-select"
                        value={selectedEvent.date}
                        onChange={(e) => setSelectedEvent({ ...selectedEvent, date: parseInt(e.target.value) })}
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
                        onChange={(e) => setSelectedEvent({ ...selectedEvent, category: e.target.value })}
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
                            onClick={() => setSelectedEvent({ ...selectedEvent, color: color })}
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

      {/* 안내창 / 확인 다이얼로그 */}
      <AlertDialog
        message={alertMessage}
        show={showAlert}
        onClose={() => setShowAlert(false)}
      />

      <ConfirmDialog
        message={confirmMessage}
        show={showConfirm}
        onConfirm={() => {
          setShowConfirm(false);
          if (confirmCallback) {
            confirmCallback();
          }
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}

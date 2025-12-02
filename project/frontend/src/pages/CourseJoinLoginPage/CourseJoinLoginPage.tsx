import React, { useState } from "react";
import { User, Lock, BookOpen } from "lucide-react";
import { login } from "../../api/auth";
import { enrollCourse } from "../../api/course";
import { useAuth } from "../../contexts/AuthContext";
import "./course-join-login-page.css";
import AlertDialog from "../Alert/AlertDialog";

interface CourseJoinLoginPageProps {
  onNavigate: (page: string, type?: 'student' | 'professor') => void;
  courseId: string;
  courseName?: string;
  courseCode?: string;
}

export default function CourseJoinLoginPage({ 
  onNavigate, 
  courseId,
  courseName = "강의",
  courseCode = ""
}: CourseJoinLoginPageProps) {
  const { login: saveLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  // 강의 초대 정보를 localStorage에 저장 (회원가입/로그인 페이지에서 돌아올 수 있도록)
  React.useEffect(() => {
    if (courseId && courseName && courseCode) {
      localStorage.setItem('pendingCourseJoin', JSON.stringify({
        courseId,
        courseName,
        courseCode
      }));
    }
  }, [courseId, courseName, courseCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const credentials = { email, password };
      const data = await login(credentials);

      if (data.access_token) {
        console.log("✅ 로그인 성공:", data);
        
        // AuthContext에 저장
        saveLogin(data.user, data.access_token);
        
        // 사용자 타입 확인 - 학생만 강의 참여 가능
        const userType = data.user.user_type;
        if (userType === 'student') {
          // 강의 참여 시도
          try {
            await enrollCourse(parseInt(courseId));
            // 강의 참여 성공 시 localStorage 정리
            localStorage.removeItem('pendingCourseJoin');
            setAlertMessage(`${courseName} 강의에 참여했습니다!`);
            setShowAlert(true);
            setTimeout(() => {
              onNavigate('student-dashboard', 'student');
            }, 1500);
          } catch (err: any) {
            // fetch API를 사용하므로 err.message를 확인
            const errorMessage = err.message || err.response?.data?.message || "강의 참여 중 오류가 발생했습니다.";
            
            // 이미 수강 중인 경우
            if (errorMessage.includes("이미 수강")) {
              // 이미 수강 중인 경우에도 localStorage 정리
              localStorage.removeItem('pendingCourseJoin');
              setAlertMessage(`이미 수강 중인 강의입니다.`);
              setShowAlert(true);
              setTimeout(() => {
                onNavigate('student-dashboard', 'student');
              }, 1500);
            } else {
              setError(errorMessage);
            }
          }
        } else {
          setError("학생 계정만 강의에 참여할 수 있습니다.");
        }
      } else {
        console.error("❌ 로그인 실패:", data.message);
        setError(data.message || "로그인 실패. 다시 시도해주세요.");
      }
    } catch (err) {
      console.error("로그인 에러:", err);
      setError("로그인 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="course-join-login-page">
      <div className="course-join-login-page__background"></div>
      <div className="course-join-login-page__container">
        <div className="course-join-login-page__course-banner">
          <div className="course-join-login-page__course-icon">
            <BookOpen size={32} />
          </div>
          <div className="course-join-login-page__course-info">
            <h2>{courseName}</h2>
            {courseCode && <span className="course-join-login-page__course-code">{courseCode}</span>}
          </div>
        </div>

        <div className="course-join-login-page__header">
          <h1 className="course-join-login-page__title">강의 참여</h1>
          <p className="course-join-login-page__subtitle">
            로그인하고 강의에 참여하세요
          </p>
        </div>

        <form className="course-join-login-page__form" onSubmit={handleSubmit}>
          {/* 아이디 또는 이메일 */}
          <div className="course-join-login-page__input-group">
            <input
              type="text"
              className="course-join-login-page__input"
              placeholder="아이디 또는 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <User className="course-join-login-page__input-icon" size={20} />
          </div>

          {/* 비밀번호 */}
          <div className="course-join-login-page__input-group">
            <input
              type="password"
              className="course-join-login-page__input"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Lock className="course-join-login-page__input-icon" size={20} />
          </div>

          {error && (
            <p className="course-join-login-page__error">{error}</p>
          )}

          <button type="submit" className="course-join-login-page__submit-button">
            로그인하고 참여하기
          </button>

          <div className="course-join-login-page__footer">
            <span className="course-join-login-page__footer-text">계정이 없으신가요?</span>
            <button
              type="button"
              onClick={() => onNavigate("signup-for-course")}
              className="course-join-login-page__footer-link"
            >
              회원가입
            </button>
          </div>
        </form>
      </div>

      {/* 안내창 */}
      <AlertDialog
        message={alertMessage}
        show={showAlert}
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
}


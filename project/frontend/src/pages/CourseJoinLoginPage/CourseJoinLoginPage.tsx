import React, { useState } from "react";
import { User, Lock, BookOpen } from "lucide-react";
import { login } from "../../api/auth";
import "./course-join-login-page.css";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const credentials = { email, password };
    const data = await login(credentials);

    if (data.access_token) {
      console.log("✅ 로그인 성공:", data);
      
      // 사용자 타입 확인 - 학생만 강의 참여 가능
      const userType = data.user.user_type;
      if (userType === 'student') {
        // 학생 대시보드로 이동 (실제로는 강의 ID를 전달하여 해당 강의로 자동 입장)
        alert(`${courseName} 강의에 참여했습니다!`);
        onNavigate('student-dashboard', 'student');
      } else {
        setError("학생 계정만 강의에 참여할 수 있습니다.");
      }
    } else {
      console.error("❌ 로그인 실패:", data.message);
      setError(data.message || "로그인 실패. 다시 시도해주세요.");
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
    </div>
  );
}


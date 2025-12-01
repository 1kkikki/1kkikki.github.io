import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import "./signup-page.css";
import { register } from "../../api/auth";
import AlertDialog from "../Alert/AlertDialog";
import { useAuth } from "../../contexts/AuthContext";

interface SignUpPageProps {
  onNavigate: (page: string) => void;
  returnToCourseJoin?: boolean;
}

export default function SignUpPage({ onNavigate, returnToCourseJoin = false }: SignUpPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [formData, setFormData] = useState<{
    userType: 'student' | 'professor';
    studentId: string;
    name: string;
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
  }>({
    userType: "student", // 기본값: 학생
    studentId: "",
    name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  });
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  // localStorage에서 강의 초대 정보 확인
  const [hasPendingCourseJoin, setHasPendingCourseJoin] = React.useState(false);

  React.useEffect(() => {
    const pendingJoin = localStorage.getItem('pendingCourseJoin');
    if (pendingJoin) {
      setHasPendingCourseJoin(true);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setAlertMessage("비밀번호가 일치하지 않습니다.");
      setShowAlert(true);
      return;
    }
    try {
    const response = await register({
      userType: formData.userType,
      studentId: formData.studentId,
      name: formData.name,
      email: formData.email,
      username: formData.username,
      password: formData.password,
    });

    if (response.status === 201) {
      setAlertMessage("회원가입이 완료되었습니다!");
      setShowAlert(true);
      // 강의 참여 중이었다면 강의 참여 로그인 페이지로, 아니면 일반 로그인으로
      setTimeout(() => {
        // localStorage에서 강의 정보 확인
        const pendingJoin = localStorage.getItem('pendingCourseJoin');
        if (pendingJoin || returnToCourseJoin) {
          // 강의 정보가 있으면 강의 참여 로그인 페이지로 이동
          if (pendingJoin) {
            try {
              const { courseId, courseName, courseCode } = JSON.parse(pendingJoin);
              navigate(`/course/${courseId}/${encodeURIComponent(courseName)}/${encodeURIComponent(courseCode)}`);
            } catch (e) {
              console.error("강의 정보 파싱 오류:", e);
              onNavigate("course-join-login");
            }
          } else {
            onNavigate("course-join-login");
          }
        } else {
          onNavigate("login");
        }
      }, 800);
    } else {
      setAlertMessage(`회원가입 실패: ${response.message || "다시 시도해주세요."}`);
      setShowAlert(true);
    }
  } catch (error) {
    console.error("회원가입 중 오류:", error);
    setAlertMessage("서버 오류가 발생했습니다.");
    setShowAlert(true);
  }
  };

  // 뒤로가기 핸들러
  const handleBack = () => {
    // 로그인되지 않은 상태
    if (!user) {
      // pendingCourseJoin이 있으면 강의 참여 페이지로
      const pendingJoin = localStorage.getItem('pendingCourseJoin');
      if (pendingJoin && returnToCourseJoin) {
        try {
          const { courseId, courseName, courseCode } = JSON.parse(pendingJoin);
          navigate(`/course/${courseId}/${encodeURIComponent(courseName)}/${encodeURIComponent(courseCode)}`);
        } catch (e) {
          console.error("강의 정보 파싱 오류:", e);
          // 브라우저 히스토리 사용 (로그인에서 왔으면 로그인으로, 홈에서 왔으면 홈으로)
          navigate(-1);
        }
      } else {
        // 브라우저 히스토리 사용 (로그인에서 왔으면 로그인으로, 홈에서 왔으면 홈으로)
        navigate(-1);
      }
      return;
    }
    
    // 로그인된 상태에서만 강의 참여 페이지로 이동 가능
    if (hasPendingCourseJoin || returnToCourseJoin) {
      // localStorage에서 강의 정보 가져오기
      const pendingJoin = localStorage.getItem('pendingCourseJoin');
      if (pendingJoin) {
        try {
          const { courseId, courseName, courseCode } = JSON.parse(pendingJoin);
          // React Router의 navigate를 사용해 깜빡임 없이 이동
          navigate(`/course/${courseId}/${encodeURIComponent(courseName)}/${encodeURIComponent(courseCode)}`);
        } catch (e) {
          console.error("강의 정보 파싱 오류:", e);
          navigate(-1);
        }
      } else {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-page__background"></div>
      <button 
        className="signup-page__back-button"
        onClick={handleBack}
        title={user && (hasPendingCourseJoin || returnToCourseJoin) ? "강의 참여로 돌아가기" : "이전 페이지로 돌아가기"}
      >
        <ArrowLeft size={20} />
      </button>
      <div className="signup-page__container">
        <h1 className="signup-page__title">SIGN UP</h1>

        <form className="signup-page__form" onSubmit={handleSubmit}>
          {/* 교수/학생 선택 버튼 */}
          <div className="signup-page__user-type-group">
            <button
              type="button"
              className={`signup-page__user-type-button ${
                formData.userType === "student" ? "active" : ""
              }`}
              onClick={() => setFormData({ ...formData, userType: "student" })}
            >
              학생
            </button>
            <button
              type="button"
              className={`signup-page__user-type-button ${
                formData.userType === "professor" ? "active" : ""
              }`}
              onClick={() => setFormData({ ...formData, userType: "professor" })}
            >
              교수
            </button>
          </div>

          <div className="signup-page__input-group">
            <input
              type="text"
              name="studentId"
              className="signup-page__input"
              placeholder="학번"
              value={formData.studentId}
              onChange={handleChange}
              required
            />
          </div>

          <div className="signup-page__input-group">
            <input
              type="text"
              name="name"
              className="signup-page__input"
              placeholder="이름"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="signup-page__input-group">
            <input
              type="email"
              name="email"
              className="signup-page__input"
              placeholder="이메일 주소"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="signup-page__input-group">
            <input
              type="text"
              name="username"
              className="signup-page__input"
              placeholder="아이디"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="signup-page__input-group">
            <input
              type="password"
              name="password"
              className="signup-page__input"
              placeholder="비밀번호"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="signup-page__input-group">
            <input
              type="password"
              name="confirmPassword"
              className="signup-page__input"
              placeholder="비밀번호 확인"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="signup-page__submit-button">
            회원가입
          </button>

          <div className="signup-page__footer">
            <span className="signup-page__footer-text">
              이미 계정이 있으신가요?
            </span>
            <button
              type="button"
              onClick={() => {
                // localStorage에서 강의 정보 확인
                const pendingJoin = localStorage.getItem('pendingCourseJoin');
                if (pendingJoin || returnToCourseJoin) {
                  // 강의 정보가 있으면 강의 참여 로그인 페이지로 이동
                  if (pendingJoin) {
                    try {
                      const { courseId, courseName, courseCode } = JSON.parse(pendingJoin);
                      navigate(`/course/${courseId}/${encodeURIComponent(courseName)}/${encodeURIComponent(courseCode)}`);
                    } catch (e) {
                      console.error("강의 정보 파싱 오류:", e);
                      onNavigate("course-join-login");
                    }
                  } else {
                    onNavigate("course-join-login");
                  }
                } else {
                  onNavigate("login");
                }
              }}
              className="signup-page__footer-link"
            >
              로그인
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
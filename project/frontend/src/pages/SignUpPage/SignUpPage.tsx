import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import "./signup-page.css";
import { register } from "../../api/auth";
import AlertDialog from "../Alert/AlertDialog";

interface SignUpPageProps {
  onNavigate: (page: string) => void;
  returnToCourseJoin?: boolean;
}

export default function SignUpPage({ onNavigate, returnToCourseJoin = false }: SignUpPageProps) {
  const [formData, setFormData] = useState({
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
        if (returnToCourseJoin) {
          onNavigate("course-join-login");
        } else {
          onNavigate("login");
        }
      }, 1500);
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

  return (
    <div className="signup-page">
      <div className="signup-page__background"></div>
      <button 
        className="signup-page__back-button"
        onClick={() => onNavigate(returnToCourseJoin ? "course-join-login" : "home")}
        title={returnToCourseJoin ? "강의 참여로 돌아가기" : "홈으로 돌아가기"}
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
              onClick={() => onNavigate(returnToCourseJoin ? "course-join-login" : "login")}
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
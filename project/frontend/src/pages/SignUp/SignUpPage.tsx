import { useState } from "react";
import { register } from "../../api/auth";  // ✅ Flask와 통신하는 함수
import "./signup-page.css";

interface SignUpPageProps {
  onNavigate: (page: string) => void;
}

export default function SignUpPage({ onNavigate }: SignUpPageProps) {
  const [formData, setFormData] = useState({
    studentId: "",
    name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const data = await register({
        studentId: formData.studentId,
        name: formData.name,
        email: formData.email,
        username: formData.username,
        password: formData.password
      });

      console.log("서버 응답:", data);

      // ✅ 성공 조건: 백엔드에서 message가 '회원가입 성공'이고 상태코드 201
      if (data.message === "회원가입 성공") {
        alert("회원가입이 완료되었습니다!");
        onNavigate("login"); // 로그인 페이지로 이동
      } else {
        alert(data.message || "회원가입 실패");
      }
    } catch (error) {
      console.error("회원가입 중 오류:", error);
      alert("서버 오류가 발생했습니다.");
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-page__background"></div>

      <div className="signup-page__container">
        <h1 className="signup-page__title">SIGN UP</h1>

        <form className="signup-page__form" onSubmit={handleSubmit}>
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
              onClick={() => onNavigate("login")}
              className="signup-page__footer-link"
            >
              로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
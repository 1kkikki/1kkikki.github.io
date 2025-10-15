import { useState } from "react";
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    // 회원가입 로직 추가 예정
    console.log("Sign up attempt:", formData);
  };

  return (
    <div className="signup-page">
      <div className="signup-page__background"></div>
      
      <div className="signup-page__container">
        <h1 className="signup-page__title">SIGN UP</h1>
        
        <form className="signup-page__form" onSubmit={handleSubmit}>
          {/* 학번 */}
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
          
          {/* 이름 */}
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
          
          {/* 이메일 주소 */}
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
          
          {/* 아이디 */}
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
          
          {/* 비밀번호 */}
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
          
          {/* 비밀번호 확인 */}
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
          
          {/* 회원가입 버튼 */}
          <button type="submit" className="signup-page__submit-button">
            회원가입
          </button>
          
          {/* 로그인 링크 */}
          <div className="signup-page__footer">
            <span className="signup-page__footer-text">이미 계정이 있으신가요?</span>
            <button
              type="button"
              onClick={() => onNavigate('login')}
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

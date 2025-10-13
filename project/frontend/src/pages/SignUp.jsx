import { useState } from 'react';
import { useNavigate } from 'react-router-dom';   // ✅ 추가
import './signup.css';

export default function SignUp() {
  const navigate = useNavigate(); // ✅ useNavigate 훅
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    studentId: ''
  });
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignUp = (e) => {
    e.preventDefault();

    // 유효성 검사
    if (!formData.email || !formData.username || !formData.password ||
        !formData.confirmPassword || !formData.name || !formData.studentId) {
      setErrorMessage('모든 필드를 입력해주세요.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage('올바른 이메일 형식이 아닙니다.');
      return;
    }

    console.log('회원가입 시도:', formData);
    setErrorMessage('');
    alert('회원가입 성공!');

    // ✅ 회원가입 성공 시 로그인 페이지로 이동
    navigate('/login');
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* SIGN UP 타이틀 */}
        <div className="login-header">
          <h1 className="login-title">SIGN UP</h1>
        </div>

        {/* 회원가입 카드 */}
        <div className="login-card">
          <form onSubmit={handleSignUp} className="login-form">
            {/* 학번 입력 */}
            <div className="input-group">
              <input
                type="text"
                name="studentId"
                placeholder="학번"
                value={formData.studentId}
                onChange={handleChange}
                className="signup-input"
              />
            </div>

            {/* 이름 입력 */}
            <div className="input-group">
              <input
                type="text"
                name="name"
                placeholder="이름"
                value={formData.name}
                onChange={handleChange}
                className="signup-input"
              />
            </div>

            {/* 이메일 주소 입력 */}
            <div className="input-group">
              <input
                type="email"
                name="email"
                placeholder="이메일 주소"
                value={formData.email}
                onChange={handleChange}
                className="signup-input"
              />
            </div>

            {/* 아이디 입력 */}
            <div className="input-group">
              <input
                type="text"
                name="username"
                placeholder="아이디"
                value={formData.username}
                onChange={handleChange}
                className="signup-input"
              />
            </div>

            {/* 비밀번호 입력 */}
            <div className="input-group">
              <input
                type="password"
                name="password"
                placeholder="비밀번호"
                value={formData.password}
                onChange={handleChange}
                className="signup-input"
              />
            </div>

            {/* 비밀번호 확인 입력 */}
            <div className="input-group">
              <input
                type="password"
                name="confirmPassword"
                placeholder="비밀번호 확인"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="signup-input"
              />
            </div>

            {/* 에러 메시지 */}
            {errorMessage && <p className="error-message">{errorMessage}</p>}

            {/* 회원가입 버튼 */}
            <button type="submit" className="login-button">
              회원가입
            </button>

            {/* 로그인 페이지로 돌아가기 버튼 */}
            <div className="links-group">
              <span className="signup-text">이미 계정이 있으신가요?</span>
              <button
                type="button"
                onClick={() => navigate('/login')}  // ✅ 클릭 시 바로 /login 이동
                className="link-button signup-link"
              >
                로그인
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

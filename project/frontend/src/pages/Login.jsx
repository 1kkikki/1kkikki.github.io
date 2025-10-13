import { useState } from 'react';
import { useNavigate } from 'react-router-dom';   // ✅ 추가
import './login.css';

export default function Login() {
  const navigate = useNavigate(); // ✅ useNavigate 훅
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setErrorMessage('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    console.log('로그인 시도:', { username, password, rememberMe });
    setErrorMessage('');
    alert('로그인 성공!');
  };

  const handleFindUsername = () => {
    alert('아이디 찾기 기능');
  };

  const handleFindPassword = () => {
    alert('비밀번호 찾기 기능');
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* LOGIN 타이틀 */}
        <div className="login-header">
          <h1 className="login-title">LOGIN</h1>
        </div>

        {/* 로그인 카드 */}
        <div className="login-card">
          <form onSubmit={handleLogin} className="login-form">
            {/* 아이디 입력 */}
            <div className="input-group">
              <input
                type="text"
                placeholder="아이디 또는 이메일"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
              />
              <svg
                className="input-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>

            {/* 비밀번호 입력 */}
            <div className="input-group">
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
              />
              <svg
                className="input-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>

            {/* 에러 메시지 */}
            {errorMessage && (
              <p className="error-message">{errorMessage}</p>
            )}

            {/* 사용자이름 기억 체크박스 */}
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="checkbox-input"
              />
              <label htmlFor="remember" className="checkbox-label">
                사용자이름 기억
              </label>
            </div>

            {/* 로그인 버튼 */}
            <button type="submit" className="login-button">
              로그인
            </button>

            {/* 아이디 찾기 / 비밀번호 찾기 */}
            <div className="links-group">
              <button
                type="button"
                onClick={handleFindUsername}
                className="link-button"
              >
                아이디 찾기
              </button>
              <span className="separator">|</span>
              <button
                type="button"
                onClick={handleFindPassword}
                className="link-button"
              >
                비밀번호 찾기
              </button>
            </div>

            {/* 회원가입 링크 */}
            <div className="links-group" style={{ marginTop: '1rem' }}>
              <span className="signup-text">계정이 없으신가요?</span>
              <button
                type="button"
                onClick={() => navigate('/signup')}   // ✅ 회원가입 페이지로 이동
                className="link-button signup-link"
              >
                회원가입
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { User, Lock } from "lucide-react";
import { login } from "../../api/auth";   // ✅ 로그인 API 불러오기
import "./login-page.css";

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const credentials = { email, password };
    const data = await login(credentials);

    if (data.access_token) {
      console.log("✅ 로그인 성공:", data);
      alert(`환영합니다, ${data.user.name}님!`);
      onNavigate("home"); // 로그인 성공 후 이동 (원하는 페이지 이름)
    } else {
      console.error("❌ 로그인 실패:", data.message);
      setError(data.message || "로그인 실패. 다시 시도해주세요.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__background"></div>
      <div className="login-page__container">
        <h1 className="login-page__title">LOGIN</h1>

        <form className="login-page__form" onSubmit={handleSubmit}>
          {/* 아이디 또는 이메일 */}
          <div className="login-page__input-group">
            <input
              type="text"
              className="login-page__input"
              placeholder="아이디 또는 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <User className="login-page__input-icon" size={20} />
          </div>

          {/* 비밀번호 */}
          <div className="login-page__input-group">
            <input
              type="password"
              className="login-page__input"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Lock className="login-page__input-icon" size={20} />
          </div>

          {error && (
            <p style={{ color: "red", fontSize: "14px" }}>{error}</p>
          )}

          <div className="login-page__checkbox-group">
            <input
              type="checkbox"
              id="rememberMe"
              className="login-page__checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="rememberMe" className="login-page__checkbox-label">
              사용자이름 기억
            </label>
          </div>

          <button type="submit" className="login-page__submit-button">
            로그인
          </button>

          <div className="login-page__links">
            <a href="#" className="login-page__link">아이디 찾기</a>
            <span className="login-page__link-divider">|</span>
            <a href="#" className="login-page__link">비밀번호 찾기</a>
          </div>

          <div className="login-page__footer">
            <span className="login-page__footer-text">계정이 없으신가요?</span>
            <button
              type="button"
              onClick={() => onNavigate("signup")}
              className="login-page__footer-link"
            >
              회원가입
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

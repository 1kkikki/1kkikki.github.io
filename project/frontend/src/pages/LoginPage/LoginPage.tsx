import React, { useState, useEffect } from "react";
import { User, Lock, ArrowLeft, X, Mail, Search } from "lucide-react";
import { login, findId, resetPassword } from "../../api/auth";   // 로그인 API 불러오기
import "./login-page.css";
import { useAuth } from "../../contexts/AuthContext";
import SuccessAlert from "../Alert/SuccessAlert";
import AlertDialog from "../Alert/AlertDialog";

interface LoginPageProps {
  onNavigate: (page: string, type?: 'student' | 'professor') => void;
  returnToCourseJoin?: boolean;
}

export default function LoginPage({ onNavigate, returnToCourseJoin = false }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [showFindId, setShowFindId] = useState(false);
  const [showFindPassword, setShowFindPassword] = useState(false);
  
  // 아이디 찾기 상태
  const [findIdName, setFindIdName] = useState("");
  const [findIdEmail, setFindIdEmail] = useState("");
  const [foundId, setFoundId] = useState("");
  const [findIdError, setFindIdError] = useState("");
  
  // 비밀번호 찾기 상태
  const [findPasswordId, setFindPasswordId] = useState("");
  const [findPasswordEmail, setFindPasswordEmail] = useState("");
  const [findPasswordError, setFindPasswordError] = useState("");
  const [findPasswordSuccess, setFindPasswordSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  
  // 환영 메시지 안내창 상태
  const [showWelcomeAlert, setShowWelcomeAlert] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [pendingUserType, setPendingUserType] = useState<'student' | 'professor' | null>(null);

  const { login: saveLogin } = useAuth();

  // 컴포넌트 마운트 시 저장된 사용자 이름 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";
    
    if (savedEmail && savedRememberMe) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const credentials = { email, password };
    const data = await login(credentials);

    if (data.access_token) {
      console.log("✅ 로그인 성공:", data);

      saveLogin(data.user, data.access_token);
      
      // 사용자 이름 기억하기 처리
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberMe");
      }
      
      // 환영 메시지 표시
      const userType = data.user.user_type;
      const title = userType === 'professor' ? '교수님' : '님';
      setWelcomeMessage(`환영합니다, ${data.user.name}${title}!`);
      setPendingUserType(userType === 'student' ? 'student' : userType === 'professor' ? 'professor' : null);
      setShowWelcomeAlert(true);
    } else {
      console.error("❌ 로그인 실패:", data.message);
      setError(data.message || "로그인 실패. 다시 시도해주세요.");
    }
  };

  const handleFindId = async (e: React.FormEvent) => {
    e.preventDefault();
    setFindIdError("");
    setFoundId("");
    
    if (!findIdName || !findIdEmail) {
      setFindIdError("이름과 이메일을 모두 입력해주세요.");
      return;
    }
    
    try {
      const data = await findId({
        name: findIdName,
        email: findIdEmail
      });

      if (data.status === 200 && data.username) {
        setFoundId(data.username);
      } else {
        setFindIdError(data.message || "아이디를 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("아이디 찾기 오류:", error);
      setFindIdError("서버 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const handleFindPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFindPasswordError("");
    setFindPasswordSuccess(false);
    
    if (!findPasswordId || !findPasswordEmail) {
      setFindPasswordError("아이디와 이메일을 모두 입력해주세요.");
      return;
    }
    
    try {
      const data = await resetPassword({
        username: findPasswordId,
        email: findPasswordEmail
      });

      if (data.status === 200) {
        // 임시 비밀번호를 사용자에게 표시
        const tempPw = data.temp_password || "";
        setTempPassword(tempPw);
        setFindPasswordSuccess(true);
      } else {
        setFindPasswordError(data.message || "비밀번호 재설정에 실패했습니다.");
      }
    } catch (error) {
      console.error("비밀번호 찾기 오류:", error);
      setFindPasswordError("서버 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const closeFindIdModal = () => {
    setShowFindId(false);
    setFindIdName("");
    setFindIdEmail("");
    setFoundId("");
    setFindIdError("");
  };

  const closeFindPasswordModal = () => {
    setShowFindPassword(false);
    setFindPasswordId("");
    setFindPasswordEmail("");
    setFindPasswordError("");
    setFindPasswordSuccess(false);
    setTempPassword("");
  };

  return (
    <div className="login-page">
      <div className="login-page__background"></div>
      <button 
        className="login-page__back-button"
        onClick={() => onNavigate(returnToCourseJoin ? "course-join-login" : "home")}
        title={returnToCourseJoin ? "강의 참여로 돌아가기" : "홈으로 돌아가기"}
      >
        <ArrowLeft size={20} />
      </button>
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
              아이디 저장
            </label>
          </div>

          <button type="submit" className="login-page__submit-button">
            로그인
          </button>

          <div className="login-page__links">
            <button 
              type="button"
              onClick={() => setShowFindId(true)}
              className="login-page__link-button"
            >
              아이디 찾기
            </button>
            <span className="login-page__link-divider">|</span>
            <button 
              type="button"
              onClick={() => setShowFindPassword(true)}
              className="login-page__link-button"
            >
              비밀번호 찾기
            </button>
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

      {/* 아이디 찾기 모달 */}
      {showFindId && (
        <div className="modal-overlay">
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">아이디 찾기</h2>
              <button className="modal-close-button" onClick={closeFindIdModal}>
                <X size={24} />
              </button>
            </div>
            <form className="modal-form" onSubmit={handleFindId}>
              <div className="modal-input-group">
                <label className="modal-label">이름</label>
                <div className="modal-input-wrapper">
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="이름을 입력하세요"
                    value={findIdName}
                    onChange={(e) => setFindIdName(e.target.value)}
                    required
                  />
                  <User className="modal-input-icon" size={20} />
                </div>
              </div>
              <div className="modal-input-group">
                <label className="modal-label">이메일</label>
                <div className="modal-input-wrapper">
                  <input
                    type="email"
                    className="modal-input"
                    placeholder="이메일을 입력하세요"
                    value={findIdEmail}
                    onChange={(e) => setFindIdEmail(e.target.value)}
                    required
                  />
                  <Mail className="modal-input-icon" size={20} />
                </div>
              </div>
              {findIdError && (
                <p className="modal-error">{findIdError}</p>
              )}
              {foundId && (
                <div className="modal-success">
                  <p className="modal-success-text">찾은 아이디:</p>
                  <p className="modal-success-id">{foundId}</p>
                </div>
              )}
              <button type="submit" className="modal-submit-button">
                <Search size={18} />
                아이디 찾기
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 비밀번호 찾기 모달 */}
      {showFindPassword && (
        <div className="modal-overlay">
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">비밀번호 찾기</h2>
              <button className="modal-close-button" onClick={closeFindPasswordModal}>
                <X size={24} />
              </button>
            </div>
            {!findPasswordSuccess ? (
              <form className="modal-form" onSubmit={handleFindPassword}>
                <div className="modal-input-group">
                  <label className="modal-label">아이디</label>
                  <div className="modal-input-wrapper">
                    <input
                      type="text"
                      className="modal-input"
                      placeholder="아이디를 입력하세요"
                      value={findPasswordId}
                      onChange={(e) => setFindPasswordId(e.target.value)}
                      required
                    />
                    <User className="modal-input-icon" size={20} />
                  </div>
                </div>
                <div className="modal-input-group">
                  <label className="modal-label">이메일</label>
                  <div className="modal-input-wrapper">
                    <input
                      type="email"
                      className="modal-input"
                      placeholder="이메일을 입력하세요"
                      value={findPasswordEmail}
                      onChange={(e) => setFindPasswordEmail(e.target.value)}
                      required
                    />
                    <Mail className="modal-input-icon" size={20} />
                  </div>
                </div>
                {findPasswordError && (
                  <p className="modal-error">{findPasswordError}</p>
                )}
                <button type="submit" className="modal-submit-button">
                  <Search size={18} />
                  비밀번호 찾기
                </button>
              </form>
            ) : (
              <div className="modal-success-content">
                <div className="modal-success-icon">✓</div>
                <p className="modal-success-message">
                  임시 비밀번호가 생성되었습니다.
                  <br />
                  아래 임시 비밀번호로 로그인 후 비밀번호를 변경해주세요.
                </p>
                {tempPassword && (
                  <div className="modal-temp-password">
                    <p className="modal-temp-password-label">임시 비밀번호:</p>
                    <p className="modal-temp-password-value">{tempPassword}</p>
                  </div>
                )}
                <button 
                  type="button"
                  onClick={closeFindPasswordModal}
                  className="modal-submit-button"
                >
                  확인
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 환영 안내창 */}
      <SuccessAlert
        message={welcomeMessage}
        show={showWelcomeAlert}
        onClose={() => {
          setShowWelcomeAlert(false);
          if (pendingUserType === 'student') {
            onNavigate('student-dashboard', 'student');
          } else if (pendingUserType === 'professor') {
            onNavigate('professor-dashboard', 'professor');
          } else {
            setError("알 수 없는 사용자 유형입니다.");
          }
        }}
        autoCloseDelay={1500}
      />

      {/* 일반 안내창 */}
      <AlertDialog
        message={alertMessage}
        show={showAlert}
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
}



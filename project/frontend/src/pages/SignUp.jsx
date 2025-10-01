import "./Signup.css";

export default function Signup() {
  return (
    <div className="auth">
      <div className="content">
        <div className="copy">
          <h1>계정 생성</h1>
          <p>앱에 가입하려면 이메일을 입력하세요</p>
        </div>

        <input type="email" placeholder="이메일 입력" className="field" />
        <button className="button">이메일로 가입하기</button>

        <div className="divider">
          <span className="divider-line"></span>
          <span>또는 아래 Google 계정으로 가입</span>
          <span className="divider-line"></span>
        </div>

        <div className="google-btn">
          <span>Google로 가입</span>
        </div>

        <p style={{ fontSize: "12px", color: "#828282", textAlign: "center" }}>
          ‘가입하기’를 클릭함으로써, 이용약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { login } from "../api/auth";

export default function Login() {
  const [form, setForm] = useState({ student_id: "", password: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const res = await login(form);
    if (res.access_token) {
      alert("로그인 성공");
    } else {
      alert(res.msg || res.error || "로그인 실패");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>로그인</h2>
        <div className="form-group">
          <label>학번</label>
          <input name="student_id" onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>비밀번호</label>
          <input type="password" name="password" onChange={handleChange} />
        </div>
        <button className="login-btn" onClick={handleSubmit}>로그인</button>
      </div>
    </div>
  );
}


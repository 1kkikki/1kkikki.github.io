import { useState } from "react";
import { register } from "../api/auth";

export default function Signup() {
  const [form, setForm] = useState({ student_id: "", name: "", password: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const res = await register({ ...form, role: "student" });
    alert(res.msg || res.error);
  };

  return (
    <div>
      <h1>계정 생성</h1>

      <input
        type="text"
        name="student_id"
        placeholder="학번 입력"
        onChange={handleChange}
      />
      <br />

      <input
        type="text"
        name="name"
        placeholder="이름 입력"
        onChange={handleChange}
      />
      <br />

      <input
        type="password"
        name="password"
        placeholder="비밀번호 입력"
        onChange={handleChange}
      />
      <br />

      <button onClick={handleSubmit}>회원가입</button>
    </div>
  );
}

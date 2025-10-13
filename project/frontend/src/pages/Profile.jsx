import React, { useEffect, useState } from "react";
import { getProfile, updateProfile } from "../api/auth"; 

function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", role: "" });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    getProfile().then(data => {
      setProfile(data);
      setForm({ name: data.name, role: data.role });
    });
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const res = await updateProfile(form);
    alert(res.msg);
    setProfile({ ...profile, ...form });
    setEditing(false);
  };

  if (!profile) return <p>불러오는 중...</p>;

  return (
    <div>
      <h2>프로필 페이지</h2>
      <p><b>학번:</b> {profile.student_id}</p>
      {!editing ? (
        <>
          <p><b>이름:</b> {profile.name}</p>
          <p><b>역할:</b> {profile.role}</p>
          <button onClick={() => setEditing(true)}>수정하기</button>
        </>
      ) : (
        <>
          <input name="name" value={form.name} onChange={handleChange} />
          <input name="role" value={form.role} onChange={handleChange} />
          <button onClick={handleSubmit}>저장</button>
          <button onClick={() => setEditing(false)}>취소</button>
        </>
      )}
    </div>
  );
}

export default Profile;

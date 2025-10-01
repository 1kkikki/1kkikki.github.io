const API_URL = "http://127.0.0.1:5000";

// 회원가입
export async function register(userData) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData)
  });
  return await res.json();
}

// 로그인
export async function login(credentials) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });
  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem("token", data.access_token);
  }
  return data;
}

// 프로필 조회
export async function getProfile() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/profile/`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  return await res.json();
}

// 프로필 수정
export async function updateProfile(data) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/profile/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return await res.json();
}
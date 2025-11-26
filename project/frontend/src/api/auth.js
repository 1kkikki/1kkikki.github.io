// 백엔드 주소 가져오기 (없으면 기본값 5000 사용)
const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const API_URL = `${BASE_URL}/auth`;

// ✅ 회원가입
export async function register(userData) {
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json();
    return {
      status: res.status,
      ...data,
    };
  } catch (error) {
    console.error("회원가입 API 오류:", error);
    return { message: "서버 오류가 발생했습니다.", status: 500 };
  }
}

// ✅ 로그인
export async function login(credentials) {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await res.json();

    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("accessToken", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return {
      status: res.status,
      ...data,
    };
  } catch (error) {
    console.error("로그인 API 오류:", error);
    return { message: "서버 오류가 발생했습니다.", status: 500 };
  }
}
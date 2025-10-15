const API_URL = "http://127.0.0.1:5000";

// ✅ 회원가입
export async function register(userData) {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json();
    return {
      status: res.status, // 🔹 HTTP 상태코드 함께 반환
      ...data,            // 🔹 서버에서 보낸 JSON 병합
    };
  } catch (error) {
    console.error("회원가입 API 오류:", error);
    return { message: "서버 오류가 발생했습니다.", status: 500 };
  }
}

// ✅ 로그인
export async function login(credentials) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await res.json();

    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
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
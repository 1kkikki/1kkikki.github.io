const API_URL = "/auth";

// ✅ 회원가입
export async function register(userData) {
  try {
    // ✅ 여기 수정: `/auth/register` → `/register`
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
    // ✅ 여기도 `/auth/login` → `/login`
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await res.json();

    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
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

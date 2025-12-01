// 백엔드 주소 가져오기 (없으면 기본값 5000 사용)
const BASE_URL = import.meta.env.VITE_API_URL || "https://allmeet-backend.onrender.com";
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

    // localStorage 저장은 AuthContext의 login 함수에서 처리하므로 여기서는 제거
    // LoginPage에서 saveLogin(data.user, data.access_token)을 호출하여 저장함

    return {
      status: res.status,
      ...data,
    };
  } catch (error) {
    console.error("로그인 API 오류:", error);
    return { message: "서버 오류가 발생했습니다.", status: 500 };
  }
}

// ✅ 아이디 찾기
export async function findId(findIdData) {
  try {
    const res = await fetch(`${API_URL}/find-id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(findIdData),
    });

    const data = await res.json();
    return {
      status: res.status,
      ...data,
    };
  } catch (error) {
    console.error("아이디 찾기 API 오류:", error);
    return { message: "서버 오류가 발생했습니다.", status: 500 };
  }
}

// ✅ 비밀번호 찾기 (임시 비밀번호 생성)
export async function resetPassword(resetData) {
  try {
    const res = await fetch(`${API_URL}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resetData),
    });

    const data = await res.json();
    return {
      status: res.status,
      ...data,
    };
  } catch (error) {
    console.error("비밀번호 찾기 API 오류:", error);
    return { message: "서버 오류가 발생했습니다.", status: 500 };
  }
}
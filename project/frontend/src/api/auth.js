// 백엔드 주소 가져오기 (없으면 기본값 5000 사용)
import { baseURL } from "./config";
const API_URL = `${baseURL}/auth`;

// ✅ 회원가입
export async function register(userData) {
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    // 응답이 없거나 실패한 경우
    if (!res.ok) {
      const errorText = await res.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || "서버 오류가 발생했습니다." };
      }
      return {
        status: res.status,
        ...errorData,
      };
    }

    const data = await res.json();
    return {
      status: res.status,
      ...data,
    };
  } catch (error) {
    console.error("회원가입 API 오류:", error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { 
        message: "서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.", 
        status: 500 
      };
    }
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

    // 응답이 없거나 실패한 경우
    if (!res.ok) {
      const errorText = await res.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || "서버 오류가 발생했습니다." };
      }
      return {
        status: res.status,
        ...errorData,
      };
    }

    const data = await res.json();

    // localStorage 저장은 AuthContext의 login 함수에서 처리하므로 여기서는 제거
    // LoginPage에서 saveLogin(data.user, data.access_token)을 호출하여 저장함

    return {
      status: res.status,
      ...data,
    };
  } catch (error) {
    console.error("로그인 API 오류:", error);
    // CORS 오류나 네트워크 오류인 경우
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { 
        message: "서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.", 
        status: 500 
      };
    }
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
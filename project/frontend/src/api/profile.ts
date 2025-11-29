import { BASE_URL } from "./config.js"; 

const PROFILE_URL = `${BASE_URL}/profile`;        

// 프로필 불러오기
export async function getProfile() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${PROFILE_URL}/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      // 401 Unauthorized일 때만 인증 에러로 처리
      if (res.status === 401) {
        return { error: "UNAUTHORIZED", status: 401 };
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return data; // {"profile": {...}}
  } catch (error) {
    console.error("프로필 불러오기 오류:", error);
    // 네트워크 에러 등 기타 에러는 다른 형태로 반환
    return { error: "NETWORK_ERROR", originalError: error };
  }
}

// 프로필 업데이트
export async function updateProfile(updateData: { name: string; email: string; profileImage?: string | null;}) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${PROFILE_URL}/`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data; // {"message": "...", "profile": {...}}
  } catch (error) {
    console.error("프로필 업데이트 오류:", error);
    return { error };
  }
}

// 비밀번호 변경
export async function changePassword(currentPassword: string, newPassword: string) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${PROFILE_URL}/password`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("비밀번호 변경 오류:", error);
    return { error };
  }
}

// 회원탈퇴
export async function deleteAccount(identifier: string, password: string) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${PROFILE_URL}/delete`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("회원탈퇴 오류:", error);
    return { error };
  }
}
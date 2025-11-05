// backend와 통신할 API 함수 모음
const API_URL = "http://127.0.0.1:5000";

// 프로필 불러오기
export async function getProfile() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/profile/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data; // {"profile": {...}}
  } catch (error) {
    console.error("프로필 불러오기 오류:", error);
    return { error };
  }
}

// 프로필 업데이트
export async function updateProfile(updateData: { name: string; email: string; profileImage?: string | null;}) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/profile/`, {
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
    const res = await fetch("http://127.0.0.1:5000/profile/password", {
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
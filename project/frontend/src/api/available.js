import { BASE_URL } from "./config";

// /available prefix
const AVAILABLE_URL = `${BASE_URL}/available`;

// 가능한 시간 추가
export async function addAvailableTime(day_of_week, start_time, end_time) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  try {
    const res = await fetch(`${AVAILABLE_URL}/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ day_of_week, start_time, end_time }),
    });

    const data = await res.json();
    return { status: res.status, ...data };
  } catch (error) {
    console.error("가능한 시간 추가 오류:", error);
    return { message: "서버 오류가 발생했습니다.", status: 500 };
  }
}

// 가능한 시간 목록 조회
export async function getMyAvailableTimes() {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  try {
    const res = await fetch(`${AVAILABLE_URL}/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      // 401 오류 등 에러 응답 시 빈 배열 반환
      if (res.status === 401) {
        return [];
      }
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    // 배열인지 확인
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("가능한 시간 목록 조회 오류:", error);
    return [];
  }
}

// 가능한 시간 삭제
export async function deleteAvailableTime(id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  try {
    const res = await fetch(`${AVAILABLE_URL}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch (err) {
    console.error("시간 삭제 오류:", err);
    return { msg: "서버 오류" };
  }
}

export async function getTeamCommonAvailability(teamId) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  try {
    const res = await fetch(`${AVAILABLE_URL}/team/${teamId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("팀 가능 시간 조회 오류:", error);
    return { error };
  }
}
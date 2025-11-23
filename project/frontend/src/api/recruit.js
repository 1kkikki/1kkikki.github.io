const API_URL = "http://127.0.0.1:5000";

function getToken() {
  return localStorage.getItem("accessToken") || localStorage.getItem("token");
}

// 모집 글 목록 조회
export async function getRecruitments(course_id) {
  const token = getToken();

  const res = await fetch(`${API_URL}/recruit/${course_id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.json();
}

// 모집 글 생성
export async function createRecruitment(course_id, title, description, max_members) {
  const token = getToken();

  const res = await fetch(`${API_URL}/recruit/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ course_id, title, description, max_members }),
  });

  return res.json();
}

// 모집 참여 / 취소 토글
export async function toggleRecruitmentJoin(recruitment_id) {
  const token = getToken();

  const res = await fetch(`${API_URL}/recruit/${recruitment_id}/join`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.json();
}

// 모집 글 삭제
export async function deleteRecruitment(recruitment_id) {
  const token = getToken();

  const res = await fetch(`${API_URL}/recruit/${recruitment_id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.json();
}



import { BASE_URL } from "./config";

const RECRUIT_URL = `${BASE_URL}/recruit`;

function getToken() {
  return localStorage.getItem("accessToken") || localStorage.getItem("token");
}

// 모집 글 목록 조회
export async function getRecruitments(course_id) {
  const token = getToken();

  const res = await fetch(`${RECRUIT_URL}/${course_id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.json();
}

// 모집 글 생성
export async function createRecruitment(course_id, title, description, team_board_name, max_members) {
  const token = getToken();

  const res = await fetch(`${RECRUIT_URL}/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ course_id, title, description, team_board_name, max_members }),
  });

  return res.json();
}

// 모집 참여 / 취소 토글
export async function toggleRecruitmentJoin(recruitment_id) {
  const token = getToken();

  const res = await fetch(`${RECRUIT_URL}/${recruitment_id}/join`, {
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

  const res = await fetch(`${RECRUIT_URL}/${recruitment_id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.json();
}

// 팀 게시판 활성화
export async function activateTeamBoard(recruitment_id) {
  const token = getToken();

  const res = await fetch(`${RECRUIT_URL}/${recruitment_id}/activate-team-board`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.json();
}
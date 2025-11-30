import { BASE_URL } from "./config";

const BOARD_URL = `${BASE_URL}/board`;

// 파일 업로드
export async function uploadFile(file) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BOARD_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  return res.json();
}

/**
 * @param {string} course_id 
 * @param {string} title 
 * @param {string} content 
 * @param {string} category 
 * @param {Array} files 
 * @param {string | null} team_board_name 
 * @param {Object | null} poll 
 * @returns {Promise<any>}
 */
export async function createBoardPost(course_id, title, content, category, files = [], team_board_name = null, poll = null) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const body = { course_id, title, content, category, files, team_board_name };
  if (poll) {
    body.poll = poll;
  }

  const res = await fetch(`${BOARD_URL}/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return res.json();
}

export async function getBoardPosts(course_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${BOARD_URL}/course/${course_id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

export async function deleteBoardPost(post_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${BOARD_URL}/post/${post_id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

/**
 * @param {number} post_id 
 * @param {string} title 
 * @param {string} content 
 * @param {Array} files 
 * @param {Object | null} poll 
 * @returns {Promise<any>}
 */
export async function updateBoardPost(post_id, title, content, files = [], poll = null) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const body = { title, content, files };
  if (poll !== null) {
    body.poll = poll;
  }

  const res = await fetch(`${BOARD_URL}/post/${post_id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  
  // HTTP 에러 상태 코드 처리
  if (!res.ok) {
    throw new Error(data.message || `HTTP error! status: ${res.status}`);
  }
  
  return data;
}

// 댓글 목록 조회
export async function getComments(post_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${BOARD_URL}/post/${post_id}/comments`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

// 댓글 작성
export async function createComment(post_id, content, parent_comment_id = null) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const body = { content };
  if (parent_comment_id) {
    body.parent_comment_id = parent_comment_id;
  }

  const res = await fetch(`${BOARD_URL}/post/${post_id}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return res.json();
}

// 댓글 삭제
export async function deleteComment(comment_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${BOARD_URL}/comments/${comment_id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

// 좋아요 토글
export async function toggleLike(post_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${BOARD_URL}/post/${post_id}/like`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

// 댓글 좋아요 토글
export async function toggleCommentLike(comment_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${BOARD_URL}/comment/${comment_id}/like`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

// 투표하기
export async function votePoll(post_id, option_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${BOARD_URL}/post/${post_id}/poll/vote`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ option_id })
  });

  return res.json();
}

// 게시물 고정/고정 해제
export async function togglePinPost(post_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${BOARD_URL}/post/${post_id}/pin`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  const data = await res.json();
  
  // HTTP 에러 상태 코드 처리
  if (!res.ok) {
    throw new Error(data.message || `HTTP error! status: ${res.status}`);
  }
  
  return data;
}
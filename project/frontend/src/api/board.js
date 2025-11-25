const API_URL = "http://127.0.0.1:5000";

// 파일 업로드
export async function uploadFile(file) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/board/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  return res.json();
}

export async function createBoardPost(course_id, title, content, category, files = []) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${API_URL}/board/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ course_id, title, content, category, files })
  });

  return res.json();
}

export async function getBoardPosts(course_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${API_URL}/board/course/${course_id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

export async function deleteBoardPost(post_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${API_URL}/board/post/${post_id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

// 댓글 목록 조회
export async function getComments(post_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${API_URL}/board/post/${post_id}/comments`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

// 댓글 작성 (parent_comment_id 가 있으면 답글)
export async function createComment(post_id, content, parent_comment_id = null) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const body = { content };
  if (parent_comment_id) {
    body.parent_comment_id = parent_comment_id;
  }

  const res = await fetch(`${API_URL}/board/post/${post_id}/comments`, {
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

  const res = await fetch(`${API_URL}/board/comments/${comment_id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

// 좋아요 토글
export async function toggleLike(post_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${API_URL}/board/post/${post_id}/like`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

// 댓글 좋아요 토글
export async function toggleCommentLike(comment_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${API_URL}/board/comment/${comment_id}/like`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}
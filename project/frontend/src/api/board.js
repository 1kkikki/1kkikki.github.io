const API_URL = "http://127.0.0.1:5000";

export async function createBoardPost(course_id, title, content, category) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${API_URL}/board/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ course_id, title, content, category })
  });

  return res.json();
}

export async function getBoardPosts(course_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${API_URL}/board/${course_id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

export async function deleteBoardPost(post_id) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  const res = await fetch(`${API_URL}/board/${post_id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

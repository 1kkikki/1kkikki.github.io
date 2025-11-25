const API_URL = "http://127.0.0.1:5000";

export async function getNotifications(limit = 30) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  
  const res = await fetch(`${API_URL}/notification/?limit=${limit}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return res.json();
}

export async function markAsRead(notificationId) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  
  const res = await fetch(`${API_URL}/notification/${notificationId}/read`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return res.json();
}

export async function markAllAsRead() {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  
  const res = await fetch(`${API_URL}/notification/read-all`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return res.json();
}

export async function deleteNotification(notificationId) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  
  const res = await fetch(`${API_URL}/notification/${notificationId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return res.json();
}


import { BASE_URL } from "./config";
const NOTIFICATION_URL = `${BASE_URL}/notification`;

export async function getNotifications(limit = 30) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  
  const res = await fetch(`${NOTIFICATION_URL}/?limit=${limit}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return res.json();
}

export async function markAsRead(notificationId) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  
  const res = await fetch(`${NOTIFICATION_URL}/${notificationId}/read`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return res.json();
}

export async function markAllAsRead() {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  
  const res = await fetch(`${NOTIFICATION_URL}/read-all`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return res.json();
}

export async function deleteNotification(notificationId) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  
  const res = await fetch(`${NOTIFICATION_URL}/${notificationId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return res.json();
}


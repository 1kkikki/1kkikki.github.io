import { BASE_URL } from "./config";
const NOTIFICATION_URL = `${BASE_URL}/notification`;

export async function getNotifications(limit = 30) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  
  try {
    const res = await fetch(`${NOTIFICATION_URL}/?limit=${limit}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
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
    console.error("알림 조회 오류:", error);
    return [];
  }
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


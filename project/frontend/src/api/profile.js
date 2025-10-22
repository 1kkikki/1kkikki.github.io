const API_URL = "http://127.0.0.1:5000";

export async function getProfile() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/profile/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  return await res.json();
}

export async function updateProfile(updateData) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/profile/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });
  return await res.json();
}


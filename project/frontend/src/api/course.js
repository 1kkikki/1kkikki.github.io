import { baseURL } from "./config"; 

const API_URL = `${baseURL}/course`; 

// 본인 강의 목록 조회 (교수)
export async function getMyCourses() {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/my`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return [];
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("강의 목록 조회 실패:", err);
    return [];
  }
}

// 강의 생성 (교수)
export async function createCourse(title, code) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, code }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("강의 생성 실패:", err);
    throw err;
  }
}

// 강의 삭제 (교수)
export async function deleteCourse(courseId) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/${courseId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("강의 삭제 실패:", err);
    throw err;
  }
}

// 모든 강의 조회 (학생)
export async function getAllCourses() {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/all`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return [];
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("강의 목록 조회 실패:", err);
    return [];
  }
}

// 강의 참여 (학생)
export async function enrollCourse(courseId) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/enroll/${courseId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("강의 참여 실패:", err);
    throw err;
  }
}

// 학생의 수강 강의 목록 조회
export async function getEnrolledCourses() {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/enrolled`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return [];
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("수강 강의 목록 조회 실패:", err);
    return [];
  }
}


import axios from "axios";

const API_URL = "http://127.0.0.1:5000/course";

// 본인 강의 목록 조회 (교수)
export async function getMyCourses() {
  const token = localStorage.getItem("accessToken");
  try {
    const res = await axios.get(`${API_URL}/my`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    console.error("강의 목록 조회 실패:", err);
    return [];
  }
}

// 강의 생성 (교수)
export async function createCourse(title, code) {
  const token = localStorage.getItem("accessToken");
  try {
    const res = await axios.post(
      API_URL,
      { title, code },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  } catch (err) {
    console.error("강의 생성 실패:", err);
    throw err;
  }
}

// 강의 삭제 (교수)
export async function deleteCourse(courseId) {
  const token = localStorage.getItem("accessToken");
  try {
    const res = await axios.delete(`${API_URL}/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    console.error("강의 삭제 실패:", err);
    throw err;
  }
}

// 모든 강의 조회 (학생)
export async function getAllCourses() {
  const token = localStorage.getItem("accessToken");
  try {
    const res = await axios.get(`${API_URL}/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    console.error("강의 목록 조회 실패:", err);
    return [];
  }
}

// 강의 참여 (학생)
export async function enrollCourse(courseId) {
  const token = localStorage.getItem("accessToken");
  try {
    const res = await axios.post(
      `${API_URL}/enroll/${courseId}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  } catch (err) {
    console.error("강의 참여 실패:", err);
    throw err;
  }
}

// 학생의 수강 강의 목록 조회
export async function getEnrolledCourses() {
  const token = localStorage.getItem("accessToken");
  try {
    const res = await axios.get(`${API_URL}/enrolled`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    console.error("수강 강의 목록 조회 실패:", err);
    return [];
  }
}


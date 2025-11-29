import { BASE_URL } from "./config.js";
const COURSE_URL = `${BASE_URL}/course`;

// 강의 추가
export async function createCourse(title: string, code: string) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${COURSE_URL}/`, {
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
    return data; // { message: "...", course: {...} }
  } catch (error) {
    console.error("강의 추가 오류:", error);
    throw error;
  }
}

// 강의 목록 조회
export async function getCourses() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${COURSE_URL}/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { error: "UNAUTHORIZED", status: 401 };
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return data; // { courses: [...] } 또는 [...]
  } catch (error) {
    console.error("강의 목록 조회 오류:", error);
    return { error: "NETWORK_ERROR", originalError: error };
  }
}

// 본인 강의 목록 조회 (교수)
export async function getMyCourses() {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  try {
    const res = await fetch(`${COURSE_URL}/my`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { error: "UNAUTHORIZED", status: 401 };
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return data; // 강의 목록 배열
  } catch (error) {
    console.error("강의 목록 조회 실패:", error);
    return [];
  }
}

// 강의 삭제
export async function deleteCourse(courseId: number) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${COURSE_URL}/${courseId}`, {
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
    return data; // { message: "..." }
  } catch (error) {
    console.error("강의 삭제 오류:", error);
    throw error;
  }
}

// 강의 참여 코드로 강의 정보 조회
export async function getCourseByJoinCode(joinCode: string): Promise<Course> {
  try {
    const res = await fetch(`${COURSE_URL}/join/${joinCode}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    // 백엔드가 course.to_dict()를 직접 반환하므로 course 객체가 바로 옴
    return data;
  } catch (error) {
    console.error("강의 정보 조회 오류:", error);
    throw error;
  }
}

// 강의 참여
export async function joinCourse(joinCode: string): Promise<Course> {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${COURSE_URL}/join`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ join_code: joinCode }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    // 백엔드가 { message: "...", course: {...} } 형식으로 반환
    return data.course;
  } catch (error) {
    console.error("강의 참여 오류:", error);
    throw error;
  }
}

// 수강한 강의 목록 조회
export async function getEnrolledCourses() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${COURSE_URL}/enrolled`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { error: "UNAUTHORIZED", status: 401 };
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return data; // { courses: [...] }
  } catch (error) {
    console.error("수강 강의 목록 조회 오류:", error);
    return { error: "NETWORK_ERROR", originalError: error };
  }
}

// 강의 참여 (학생)
export async function enrollCourse(courseId: number) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  try {
    const res = await fetch(`${COURSE_URL}/enroll/${courseId}`, {
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
  } catch (error) {
    console.error("강의 참여 오류:", error);
    throw error;
  }
}

// Course 타입 export
export interface Course {
  id: number;
  title: string;
  code: string;
  professor_id: number;
  join_code: string;
  created_at: string;
}


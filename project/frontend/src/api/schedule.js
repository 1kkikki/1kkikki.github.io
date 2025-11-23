import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:5000";

// 토큰 가져오기
const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 모든 일정 조회 (년/월 필터링 가능)
export const getSchedules = async (year = null, month = null) => {
  try {
    let url = `${API_BASE_URL}/schedule/`;
    if (year && month) {
      url += `?year=${year}&month=${month}`;
    }
    const response = await axios.get(url, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error("일정 조회 실패:", error);
    throw error;
  }
};

// 일정 생성
export const createSchedule = async (scheduleData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/schedule/`,
      scheduleData,
      {
        headers: getAuthHeader(),
      }
    );
    return response.data;
  } catch (error) {
    console.error("일정 생성 실패:", error);
    throw error;
  }
};

// 일정 수정
export const updateSchedule = async (scheduleId, scheduleData) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/schedule/${scheduleId}`,
      scheduleData,
      {
        headers: getAuthHeader(),
      }
    );
    return response.data;
  } catch (error) {
    console.error("일정 수정 실패:", error);
    throw error;
  }
};

// 일정 삭제
export const deleteSchedule = async (scheduleId) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/schedule/${scheduleId}`,
      {
        headers: getAuthHeader(),
      }
    );
    return response.data;
  } catch (error) {
    console.error("일정 삭제 실패:", error);
    throw error;
  }
};


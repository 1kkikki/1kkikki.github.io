import axios from "axios";
import { baseURL } from "./config.js";

const SCHEDULE_URL = `${baseURL}/schedule`;

// 토큰 가져오기
const getAuthHeader = () => {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 모든 일정 조회 (년/월 필터링 가능)
export const getSchedules = async (year: number | null = null, month: number | null = null) => {
  try {
    let url = `${SCHEDULE_URL}/`;
    if (year && month) {
      url += `?year=${year}&month=${month}`;
    }
    const response = await axios.get(url, {
      headers: getAuthHeader(),
    });
    const data = response.data;
    // 배열인지 확인
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error("일정 조회 실패:", error);
    // 401 오류 등 에러 응답 시 빈 배열 반환
    if (error.response?.status === 401) {
      return [];
    }
    // 다른 오류도 빈 배열 반환하여 앱이 크래시되지 않도록 함
    return [];
  }
};

// 일정 생성
export const createSchedule = async (scheduleData: {
  title: string;
  date: number;
  month: number;
  year: number;
  color: string;
  category?: string;
}) => {
  try {
    const response = await axios.post(`${SCHEDULE_URL}/`, scheduleData, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error("일정 생성 실패:", error);
    throw error;
  }
};

// 일정 수정
export const updateSchedule = async (
  scheduleId: number,
  scheduleData: {
    title: string;
    date: number;
    month: number;
    year: number;
    color: string;
    category?: string;
  }
) => {
  try {
    const response = await axios.put(
      `${SCHEDULE_URL}/${scheduleId}`,
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
export const deleteSchedule = async (scheduleId: number) => {
  try {
    const response = await axios.delete(`${SCHEDULE_URL}/${scheduleId}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error("일정 삭제 실패:", error);
    throw error;
  }
};


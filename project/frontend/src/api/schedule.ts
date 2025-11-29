import axios from "axios";
import { BASE_URL } from "./config.js";

const SCHEDULE_URL = `${BASE_URL}/schedule`;

// 토큰 가져오기
const getAuthHeader = () => {
  const token = localStorage.getItem("token");
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
    return response.data;
  } catch (error) {
    console.error("일정 조회 실패:", error);
    throw error;
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


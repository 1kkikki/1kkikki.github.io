import axios from "axios";

const isDevelopment = import.meta.env.DEV || 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

export const baseURL = isDevelopment
  ? "http://localhost:5000" // 개발 환경 (Development environment)
  : "https://api.allmeet.site"; // 배포 환경 (DNS 연결한 백엔드) (Deployment environment (backend connected via DNS))

// axios 전역 설정
axios.defaults.withCredentials = true;
axios.defaults.baseURL = baseURL;
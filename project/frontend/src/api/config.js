// 개발 환경에서는 로컬 백엔드 사용, 프로덕션에서는 환경 변수 또는 기본값 사용
const isDevelopment = import.meta.env.DEV || 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

// 환경 변수로 API URL 설정 (Vercel 등에서 설정 가능)
// VITE_API_URL이 설정되어 있으면 우선 사용
// 없으면 개발 환경에서는 localhost, 프로덕션에서는 Render.com 백엔드 사용
export const baseURL = import.meta.env.VITE_API_URL || 
  (isDevelopment ? "http://localhost:5000" : "https://allmeet-backend.onrender.com");

// 디버깅용 (개발 환경에서만)
if (isDevelopment) {
  console.log("🌐 API Base URL:", baseURL);
}
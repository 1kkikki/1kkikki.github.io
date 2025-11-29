import React, { useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import SignUpPage from "./pages/SignUpPage/SignUpPage";
import StudentDashboardPage from './pages/StudentDashboardPage/StudentDashboardPage';
import ProfessorDashboardPage from './pages/ProfessorDashboardPage/ProfessorDashboardPage';
import MyPage from './pages/MyPage/MyPage';
import CourseJoinLoginPage from './pages/CourseJoinLoginPage/CourseJoinLoginPage';

// CourseJoinLoginPage 라우트 컴포넌트
function CourseJoinLoginPageRoute({ onNavigate }: { onNavigate: (page: string, type?: 'student' | 'professor') => void }) {
  const { courseId, courseName, courseCode } = useParams<{ courseId: string; courseName: string; courseCode: string }>();
  
  return (
    <NavigationWrapper onNavigate={onNavigate}>
      <CourseJoinLoginPage 
        onNavigate={onNavigate} 
        courseId={courseId ? decodeURIComponent(courseId) : ''}
        courseName={courseName ? decodeURIComponent(courseName) : '강의'}
        courseCode={courseCode ? decodeURIComponent(courseCode) : ''}
      />
    </NavigationWrapper>
  );
}

// 네비게이션 래퍼 컴포넌트
function NavigationWrapper({ children, onNavigate }: { children: React.ReactNode; onNavigate: (page: string, type?: 'student' | 'professor') => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  // onNavigate를 URL 기반으로 변환
  const wrappedNavigate = (page: string, type?: 'student' | 'professor') => {
    const pathMap: Record<string, string> = {
      'home': '/',
      'login': '/login',
      'signup': '/signup',
      'student-dashboard': '/student-dashboard',
      'professor-dashboard': '/professor-dashboard',
      'mypage': '/mypage',
      'course-join-login': location.pathname, // 현재 경로 유지
      'signup-for-course': '/signup'
    };
    
    const path = pathMap[page] || '/';
    navigate(path);
  };

  return React.cloneElement(children as React.ReactElement, { onNavigate: wrappedNavigate });
}

// 로그인 상태 확인 및 자동 리다이렉트 컴포넌트
function AuthRedirect() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 로딩 중이면 리다이렉트하지 않음
    if (isLoading) return;

    if (user) {
      // 현재 경로가 홈이고, 로그인되어 있으면 대시보드로 리다이렉트
      if (location.pathname === '/') {
        if (user.user_type === 'student') {
          navigate('/student-dashboard', { replace: true });
        } else if (user.user_type === 'professor') {
          navigate('/professor-dashboard', { replace: true });
        }
      }
    } else {
      // 로그인되지 않았고, 보호된 페이지에 있으면 홈으로 리다이렉트
      const protectedPaths = ['/student-dashboard', '/professor-dashboard', '/mypage'];
      if (protectedPaths.includes(location.pathname)) {
        navigate('/', { replace: true });
      }
    }
  }, [user, isLoading, location.pathname, navigate]);

  return null;
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading } = useAuth();

  // URL 해시에서 강의 정보 추출 (기존 호환성 유지)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/course/')) {
      const params = hash.replace('#/course/', '');
      const [courseId, courseName, courseCode] = params.split('/');
      // URL로 변환하여 리다이렉트
      navigate(`/course/${encodeURIComponent(courseId)}/${encodeURIComponent(courseName || '강의')}/${encodeURIComponent(courseCode || '')}`, { replace: true });
    }
  }, [navigate]);

  const handleNavigate = (page: string, type?: 'student' | 'professor') => {
    const pathMap: Record<string, string> = {
      'home': '/',
      'login': '/login',
      'signup': '/signup',
      'student-dashboard': '/student-dashboard',
      'professor-dashboard': '/professor-dashboard',
      'mypage': '/mypage',
      'course-join-login': location.pathname,
      'signup-for-course': '/signup'
    };
    
    const path = pathMap[page] || '/';
    navigate(path);
  };

  // 강의 참여 맥락인지 확인
  const isCourseJoinContext = location.pathname.startsWith('/course/');

  // 로딩 중이면 아무것도 렌더링하지 않음 (깜빡임 방지)
  if (isLoading) {
    return null;
  }

  return (
    <>
      <AuthRedirect />
      <Routes>
        <Route path="/" element={<NavigationWrapper onNavigate={handleNavigate}><HomePage onNavigate={handleNavigate} /></NavigationWrapper>} />
        <Route path="/login" element={<NavigationWrapper onNavigate={handleNavigate}><LoginPage onNavigate={handleNavigate} returnToCourseJoin={isCourseJoinContext} /></NavigationWrapper>} />
        <Route path="/signup" element={<NavigationWrapper onNavigate={handleNavigate}><SignUpPage onNavigate={handleNavigate} returnToCourseJoin={isCourseJoinContext} /></NavigationWrapper>} />
        <Route path="/student-dashboard/*" element={<NavigationWrapper onNavigate={handleNavigate}><StudentDashboardPage onNavigate={handleNavigate} /></NavigationWrapper>} />
        <Route path="/professor-dashboard/*" element={<NavigationWrapper onNavigate={handleNavigate}><ProfessorDashboardPage onNavigate={handleNavigate} /></NavigationWrapper>} />
        <Route path="/mypage" element={<NavigationWrapper onNavigate={handleNavigate}><MyPage onNavigate={handleNavigate} /></NavigationWrapper>} />
        <Route 
          path="/course/:courseId/:courseName/:courseCode" 
          element={<CourseJoinLoginPageRoute onNavigate={handleNavigate} />} 
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}



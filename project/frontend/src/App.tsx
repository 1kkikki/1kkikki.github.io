import React, { useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CourseProvider } from "./contexts/CourseContext";
import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import SignUpPage from "./pages/SignUpPage/SignUpPage";
import StudentDashboardPage from './pages/StudentDashboardPage/StudentDashboardPage';
import ProfessorDashboardPage from './pages/ProfessorDashboardPage/ProfessorDashboardPage';
import MyPage from './pages/MyPage/MyPage';
import CourseJoinLoginPage from './pages/CourseJoinLoginPage/CourseJoinLoginPage';

// CourseJoinLoginPage 라우트 컴포넌트
function CourseJoinLoginPageRoute() {
  const { courseId, courseName, courseCode } = useParams<{ courseId: string; courseName: string; courseCode: string }>();
  
  // 임시 onNavigate 함수 (NavigationWrapper가 덮어쓸 것임)
  const tempNavigate = () => {};
  
  return (
    <NavigationWrapper>
      <CourseJoinLoginPage 
        onNavigate={tempNavigate}
        courseId={courseId ? decodeURIComponent(courseId) : ''}
        courseName={courseName ? decodeURIComponent(courseName) : '강의'}
        courseCode={courseCode ? decodeURIComponent(courseCode) : ''}
      />
    </NavigationWrapper>
  );
}

// 네비게이션 래퍼 컴포넌트 (React.memo로 최적화)
const NavigationWrapper = React.memo(({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // onNavigate를 URL 기반으로 변환 (useCallback으로 메모이제이션)
  const wrappedNavigate = React.useCallback((page: string, _type?: 'student' | 'professor') => {
    // course-join-login인 경우 localStorage에서 강의 정보 확인
    if (page === 'course-join-login') {
      const pendingJoin = localStorage.getItem('pendingCourseJoin');
      if (pendingJoin) {
        try {
          const { courseId, courseName, courseCode } = JSON.parse(pendingJoin);
          navigate(`/course/${courseId}/${encodeURIComponent(courseName)}/${encodeURIComponent(courseCode)}`);
          return;
        } catch (e) {
          console.error("강의 정보 파싱 오류:", e);
        }
      }
      // 강의 정보가 없으면 현재 경로 유지 (이미 강의 참여 페이지에 있는 경우)
      if (location.pathname.startsWith('/course/')) {
        navigate(location.pathname);
        return;
      }
    }
    
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
  }, [navigate, location.pathname]);

  return <>{React.cloneElement(children as React.ReactElement<any>, { onNavigate: wrappedNavigate })}</>;
});

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
    
    // 404.html에서 저장한 리다이렉트 경로 처리
    const redirectPath = sessionStorage.getItem('redirectPath');
    if (redirectPath && redirectPath !== location.pathname) {
      sessionStorage.removeItem('redirectPath');
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, location.pathname]);

  const handleNavigate = (page: string) => {
    // course-join-login인 경우 localStorage에서 강의 정보 확인
    if (page === 'course-join-login') {
      const pendingJoin = localStorage.getItem('pendingCourseJoin');
      if (pendingJoin) {
        try {
          const { courseId, courseName, courseCode } = JSON.parse(pendingJoin);
          navigate(`/course/${courseId}/${encodeURIComponent(courseName)}/${encodeURIComponent(courseCode)}`);
          return;
        } catch (e) {
          console.error("강의 정보 파싱 오류:", e);
        }
      }
      // 강의 정보가 없으면 현재 경로 유지 (이미 강의 참여 페이지에 있는 경우)
      if (location.pathname.startsWith('/course/')) {
        navigate(location.pathname);
        return;
      }
    }
    
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

  // 강의 참여 맥락인지 확인 (경로 또는 localStorage 확인)
  const isCourseJoinContext = location.pathname.startsWith('/course/') || !!localStorage.getItem('pendingCourseJoin');

  // 로딩 중이면 로딩 상태 표시 (깜빡임 방지)
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f9fafb'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #a855f7',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <AuthRedirect />
      <Routes>
        <Route path="/" element={<NavigationWrapper><HomePage onNavigate={handleNavigate} /></NavigationWrapper>} />
        <Route path="/login" element={<NavigationWrapper><LoginPage onNavigate={handleNavigate} returnToCourseJoin={isCourseJoinContext} /></NavigationWrapper>} />
        <Route path="/signup" element={<NavigationWrapper><SignUpPage onNavigate={handleNavigate} returnToCourseJoin={isCourseJoinContext} /></NavigationWrapper>} />
        <Route path="/student-dashboard/*" element={<NavigationWrapper><StudentDashboardPage onNavigate={handleNavigate} /></NavigationWrapper>} />
        <Route path="/professor-dashboard/*" element={<NavigationWrapper><ProfessorDashboardPage onNavigate={handleNavigate} /></NavigationWrapper>} />
        <Route path="/mypage" element={<NavigationWrapper><MyPage onNavigate={handleNavigate} /></NavigationWrapper>} />
        <Route 
          path="/course/:courseId/:courseName/:courseCode" 
          element={<CourseJoinLoginPageRoute />} 
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CourseProvider>
        <AppContent />
      </CourseProvider>
    </AuthProvider>
  );
}



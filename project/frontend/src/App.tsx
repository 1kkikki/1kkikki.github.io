import React, { useState, useEffect } from "react";
import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import SignUpPage from "./pages/SignUpPage/SignUpPage";
import StudentDashboardPage from './pages/StudentDashboardPage/StudentDashboardPage';
import ProfessorDashboardPage from './pages/ProfessorDashboardPage/ProfessorDashboardPage';
import MyPage from './pages/MyPage/MyPage';
import CourseJoinLoginPage from './pages/CourseJoinLoginPage/CourseJoinLoginPage';


type PageType = 'home' | 'login' | 'signup' | 'student-dashboard' | 'professor-dashboard' | 'mypage' | 'course-join-login' | 'signup-for-course';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [userType, setUserType] = useState<'student' | 'professor' | null>(null);
  const [courseInfo, setCourseInfo] = useState<{ id: string; name: string; code: string }>({ id: '', name: '', code: '' });

  // URL 해시에서 강의 정보 추출
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/course/')) {
      const params = hash.replace('#/course/', '');
      const [courseId, courseName, courseCode] = params.split('/');
      setCourseInfo({ 
        id: decodeURIComponent(courseId), 
        name: decodeURIComponent(courseName || '강의'),
        code: decodeURIComponent(courseCode || '')
      });
      setCurrentPage('course-join-login');
    }
  }, []);

  const handleNavigate = (page: string, type?: 'student' | 'professor') => {
    setCurrentPage(page as PageType);
    if (type) {
      setUserType(type);
    }
  };


  return (
    <>
      {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
      {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
      {currentPage === 'signup' && <SignUpPage onNavigate={handleNavigate} />}
      {currentPage === 'signup-for-course' && <SignUpPage onNavigate={handleNavigate} returnToCourseJoin={true} />}
      {currentPage === 'student-dashboard' && <StudentDashboardPage onNavigate={handleNavigate} />}
      {currentPage === 'professor-dashboard' && <ProfessorDashboardPage onNavigate={handleNavigate} />}
      {currentPage === 'mypage' && <MyPage onNavigate={handleNavigate} />}
      {currentPage === 'course-join-login' && (
        <CourseJoinLoginPage 
          onNavigate={handleNavigate} 
          courseId={courseInfo.id}
          courseName={courseInfo.name}
          courseCode={courseInfo.code}
        />
      )}
    </>
  );
}



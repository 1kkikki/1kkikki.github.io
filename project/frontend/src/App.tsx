import { useState } from "react";
import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import SignUpPage from "./pages/SignUpPage/SignUpPage";
import MainDashboardPage from './pages/MainDashboardPage/MainDashboardPage';
import MyPage from './pages/MyPage/MyPage';


export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'login' | 'signup' | 'dashboard' | 'mypage'>('home');

  const handleNavigate = (page: string) => {
    setCurrentPage(page as 'home' | 'login' | 'signup' | 'dashboard' | 'mypage');
  };


  return (
    <>
      {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
      {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
      {currentPage === 'signup' && <SignUpPage onNavigate={handleNavigate} />}
      {currentPage === 'dashboard' && <MainDashboardPage onNavigate={handleNavigate} />}
       {currentPage === 'mypage' && <MyPage onNavigate={handleNavigate} />}
    </>
  );
}
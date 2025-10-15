
import { useState } from "react";
import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import SignUpPage from "./pages/SignUp/SignUpPage";


export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'login' | 'signup'>('home');

  const handleNavigate = (page: string) => {
    setCurrentPage(page as 'home' | 'login' | 'signup');
  };

  return (
    <>
      {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
      {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
      {currentPage === 'signup' && <SignUpPage onNavigate={handleNavigate} />}
    </>
  );
}
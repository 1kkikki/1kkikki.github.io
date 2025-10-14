import { Routes, Route, Link, useNavigate, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/SignUp";
import Profile from "./pages/Profile";  
import Mainpage from "./pages/Mainpage";

export default function App() {
  const navigate = useNavigate();
  return (
    <div>

      <nav
        style={{
          padding: "10px 20px",
          display: "flex",
          justifyContent: "flex-end", // 오른쪽 정렬
        }}
      >
        <button
          onClick={() => navigate("/mainpage")}
          style={{
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
          }}
          title="메인페이지로 이동"
        >
          🏠
        </button>
      </nav>

      <Routes>
        <Route path="/" element={<Navigate to="/mainpage" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/mainpage" element={<Mainpage />} />
      </Routes>

    </div>
  );
}

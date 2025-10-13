import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/SignUp";
import Profile from "./pages/Profile";   // ✅ 변경
import Mainpage from "./pages/Mainpage";

export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} /> {/* ✅ 변경 */}
        <Route path="/mainpage" element={<Mainpage />} />
      </Routes>
    </div>
  );
}

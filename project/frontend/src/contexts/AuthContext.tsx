// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface LoggedInUser {
  id: number;
  name: string;
  email: string;
  user_type: "student" | "professor";
  student_id?: string | null;
  profile_image?: string | null;
  // 백엔드에서 오는 필드 더 있으면 여기 추가해도 됨
}

interface AuthContextValue {
  user: LoggedInUser | null;
  token: string | null;
  login: (user: LoggedInUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 🔹 새로고침해도 유지되도록 localStorage에서 불러오기
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    const savedToken = localStorage.getItem("accessToken");

    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (e) {
        console.error("저장된 사용자 정보를 읽을 수 없습니다.", e);
        localStorage.removeItem("currentUser");
        localStorage.removeItem("accessToken");
      }
    }
  }, []);

  const login = (userData: LoggedInUser, token: string) => {
    setUser(userData);
    setToken(token);
    localStorage.setItem("currentUser", JSON.stringify(userData));
    localStorage.setItem("accessToken", token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth는 AuthProvider 안에서만 사용할 수 있습니다.");
  }
  return ctx;
}

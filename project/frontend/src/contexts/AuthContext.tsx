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
  isLoading: boolean;
  login: (user: LoggedInUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 🔹 새로고침해도 유지되도록 localStorage에서 불러오기
  useEffect(() => {
    // 먼저 currentUser를 확인하고, 없으면 user 키도 확인 (기존 호환성)
    let savedUser = localStorage.getItem("currentUser");
    let savedToken = localStorage.getItem("accessToken");

    // currentUser가 없으면 user 키 확인
    if (!savedUser) {
      const oldUser = localStorage.getItem("user");
      const oldToken = localStorage.getItem("token") || localStorage.getItem("accessToken");
      if (oldUser && oldToken) {
        savedUser = oldUser;
        savedToken = oldToken;
        // 새로운 키로 마이그레이션
        localStorage.setItem("currentUser", oldUser);
        localStorage.setItem("accessToken", oldToken);
      }
    }

    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setToken(savedToken);
      } catch (e) {
        console.error("저장된 사용자 정보를 읽을 수 없습니다.", e);
        localStorage.removeItem("currentUser");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    
    // 로딩 완료
    setIsLoading(false);
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
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
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

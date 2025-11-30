// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getProfile } from "../api/profile";
import { writeProfileImageToStorage, notifyProfileImageUpdated } from "../utils/profileImage";

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
    async function validateSession() {
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
          
          // 🔹 백엔드에서 토큰 유효성 검증
          const profileData = await getProfile();
          
          // 에러가 발생하면 (토큰 무효, 네트워크 오류 등) 로그아웃 처리
          if (profileData.error) {
            console.warn("저장된 세션이 유효하지 않습니다. 로그아웃 처리합니다.");
            // 인증 관련 localStorage 모두 정리
            localStorage.removeItem("currentUser");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("pendingCourseJoin");
            localStorage.removeItem("notificationTarget");
            // 프로필 이미지 캐시도 정리
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith("userProfileImage")) {
                localStorage.removeItem(key);
              }
            });
            setUser(null);
            setToken(null);
          } else {
            // 토큰이 유효하면 최신 프로필 정보로 사용자 정보 업데이트
            const updatedUserData = {
              ...userData,
              profile_image: profileData.profile?.profile_image || null,
            };
            
            setUser(updatedUserData);
            setToken(savedToken);
            
            // currentUser도 최신 정보로 업데이트
            localStorage.setItem("currentUser", JSON.stringify(updatedUserData));
            
            // 프로필 이미지 localStorage에 저장
            if (profileData.profile?.profile_image) {
              writeProfileImageToStorage(userData.id, profileData.profile.profile_image);
            } else {
              writeProfileImageToStorage(userData.id, null);
            }
          }
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
    }

    validateSession();
  }, []);

  const login = (userData: LoggedInUser, token: string) => {
    setUser(userData);
    setToken(token);
    localStorage.setItem("currentUser", JSON.stringify(userData));
    localStorage.setItem("accessToken", token);
    
    // 프로필 이미지 localStorage에 저장 및 이벤트 발송
    if (userData.profile_image) {
      writeProfileImageToStorage(userData.id, userData.profile_image);
      notifyProfileImageUpdated({
        userId: userData.id,
        profileImage: userData.profile_image,
      });
    } else {
      writeProfileImageToStorage(userData.id, null);
      notifyProfileImageUpdated({
        userId: userData.id,
        profileImage: null,
      });
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    // 인증 관련 localStorage 모두 정리
    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("pendingCourseJoin");
    localStorage.removeItem("notificationTarget");
    // 프로필 이미지 캐시도 정리
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("userProfileImage")) {
        localStorage.removeItem(key);
      }
    });
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

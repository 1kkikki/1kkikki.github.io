import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getEnrolledCourses, getMyCourses } from "../api/course";
import { useAuth } from "./AuthContext";

interface Course {
  id: number;
  title: string;
  code: string;
  professor_name?: string;
  professor_id?: number;
  join_code?: string;
}

interface CourseContextValue {
  courses: Course[];
  isLoading: boolean;
  refreshCourses: () => Promise<void>;
}

const CourseContext = createContext<CourseContextValue | undefined>(undefined);

export function CourseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshCourses = async () => {
    if (!user) {
      setCourses([]);
      return;
    }

    setIsLoading(true);
    try {
      let data: Course[] = [];
      if (user.user_type === "student") {
        data = await getEnrolledCourses();
      } else if (user.user_type === "professor") {
        data = await getMyCourses();
      }
      setCourses(data);
    } catch (err) {
      console.error("강의 목록 로드 실패:", err);
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 사용자가 로그인하면 강의 목록 로드
  useEffect(() => {
    if (user) {
      refreshCourses();
    } else {
      setCourses([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <CourseContext.Provider value={{ courses, isLoading, refreshCourses }}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourses() {
  const ctx = useContext(CourseContext);
  if (!ctx) {
    throw new Error("useCourses must be used within CourseProvider");
  }
  return ctx;
}


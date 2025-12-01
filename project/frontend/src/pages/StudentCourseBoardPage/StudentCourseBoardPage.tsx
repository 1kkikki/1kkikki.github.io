import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useCourses } from "../../contexts/CourseContext";
import { getBoardPosts, createBoardPost, deleteBoardPost, updateBoardPost, getComments, createComment, deleteComment, toggleLike, toggleCommentLike, uploadFile, votePoll, togglePinPost, checkPostExists, checkCommentExists} from "../../api/board";
import { getRecruitments, createRecruitment, toggleRecruitmentJoin, deleteRecruitment, activateTeamBoard, getTeamBoards } from "../../api/recruit";
import { getTeamCommonAvailability, addAvailableTime, getMyAvailableTimes, deleteAvailableTime, submitTeamAvailability } from "../../api/available";
import { getNotifications, markAsRead, markAllAsRead } from "../../api/notification";
import {
  Home,
  Bell,
  Users,
  Search,
  Send,
  User,
  Hash,
  Pin,
  Heart,
  MessageCircle,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  Clock,
  Trash2,
  Image,
  Video,
  File,
  FileText,
  BarChart3,
  Minus,
  Edit
} from "lucide-react";
import "./student-courseboard.css";
import {
  readProfileImageFromStorage,
  PROFILE_IMAGE_UPDATED_EVENT,
  ProfileImageEventDetail,
} from "../../utils/profileImage";
import { onNotificationUpdated, notifyNotificationUpdated } from "../../utils/notificationSync";
import ConfirmDialog from "../Alert/ConfirmDialog";
import SuccessAlert from "../Alert/SuccessAlert";
import WarningAlert from "../Alert/WarningAlert";

interface CourseBoardPageProps {
  course: {
    id: number;
    title: string;
    code: string;
  };
  onBack: () => void;
  onNavigate: (page: string) => void;
  availableTimes?: AvailableTime[]; // 현재 사용되지 않음 (팀 게시판에서 자체적으로 시간을 불러옴)
}

interface AvailableTime {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  source?: 'dashboard' | 'team'; // 대시보드에서 온 시간인지 팀에서 추가한 시간인지 구분
  teamTimeId?: number; // 팀 시간인 경우 서버 ID (삭제 시 사용)
}

interface TeamMemberTime {
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface TeamMemberAvailability {
  user_id: number;
  name: string;
  student_id?: string | null;
  user_type?: string;
  times: TeamMemberTime[];
}

interface PollOption {
  id?: number;
  text: string;
  votes?: number;
  percentage?: number;
}

interface Poll {
  id?: number;
  question: string;
  options: PollOption[];
  total_votes?: number;
  user_vote?: number | null; // 사용자가 선택한 옵션 ID
  expires_at?: string | null;
}

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  author_id?: number;
  author_student_id?: string | null;
  is_professor?: boolean;
  author_profile_image?: string | null;
  timestamp: string;
  category: string;  // 표시용 카테고리 (공지, 커뮤니티, 팀 게시판 등)
  originalCategory?: string;  // 원본 카테고리 (notice, community, team 등)
  tags: string[];
  likes: number;
  comments: Comment[];
  comments_count?: number;
  isPinned?: boolean;
  isLiked?: boolean;
  team_board_name?: string | null;
  files?: Array<{
    filename: string;
    original_name: string;
    type: 'image' | 'video' | 'file';
    size: number;
    url: string;
  }>;
  poll?: Poll | null;
}

interface Comment {
  id: number;
  author: string;
  author_id?: number;
  author_student_id?: string | null;
  is_professor?: boolean;
  author_profile_image?: string | null;
  parent_comment_id?: number | null;
  content: string;
  timestamp: string;
  likes?: number;
  isLiked?: boolean;
  replies?: Comment[];
}

interface RecruitmentMember {
  user_id?: number | null;
  name: string;
  student_id?: string | null;
  is_professor?: boolean;
  profile_image?: string | null;
}

interface TeamRecruitment {
  id: number;
  title: string;
  description: string;
  team_board_name?: string | null;
  author: string;
  author_id?: number;
  author_student_id?: string | null;
  is_professor?: boolean;
  author_profile_image?: string | null;
  timestamp: string;
  maxMembers: number;
  currentMembers: number;
  membersList: string[];
  members?: RecruitmentMember[];
  isJoined: boolean;
  is_board_activated?: boolean;
}

interface Notification {
  id: number;
  type: string;
  content: string;
  related_id?: number | null;
  comment_id?: number | null;
  course_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export default function CourseBoardPage({ course, onBack, onNavigate }: CourseBoardPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { courses } = useCourses();
  // 프로필 이미지 초기값을 localStorage에서 바로 읽어서 설정 (깜빡임 방지)
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    return user?.id ? readProfileImageFromStorage(user.id) : null;
  });

  const [activeTab, setActiveTab] = useState("공지");
  const prevCourseIdRef = useRef<number>(course.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isEditPostOpen, setIsEditPostOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostContent, setEditPostContent] = useState("");
  const [editPostFiles, setEditPostFiles] = useState<Array<{
    filename: string;
    original_name: string;
    type: 'image' | 'video' | 'file';
    size: number;
    url: string;
    preview?: string;
  }>>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [postFiles, setPostFiles] = useState<Array<{
    filename: string;
    original_name: string;
    type: 'image' | 'video' | 'file';
    size: number;
    url: string;
    preview?: string;
  }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // 투표 관련 상태
  const [newPostPoll, setNewPostPoll] = useState<Poll | null>(null);
  const [editPostPoll, setEditPostPoll] = useState<Poll | null>(null);
  const [isAvailableTimeModalOpen, setIsAvailableTimeModalOpen] = useState(false);
  const [myAvailableTimes, setMyAvailableTimes] = useState<AvailableTime[]>([]);
  const [isResultView, setIsResultView] = useState(false);
  // 팀별 제출 여부를 추적 (teamId -> boolean)
  const [teamSubmittedMap, setTeamSubmittedMap] = useState<Map<number, boolean>>(new Map());
  const SCHEDULE_START_HOUR = 9;
  const SCHEDULE_END_HOUR = 20;
  const SCHEDULE_ROW_COUNT = SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1;
  const SLOT_INTERVAL_MINUTES = 10;
  const SLOTS_PER_HOUR = 60 / SLOT_INTERVAL_MINUTES;

  const AVAILABLE_HOUR_OPTIONS = Array.from({ length: SCHEDULE_ROW_COUNT }, (_, i) =>
    (SCHEDULE_START_HOUR + i).toString().padStart(2, "0")
  );

  const [newTime, setNewTime] = useState({
    day: "월요일",
    startHour: "09",
    startMinute: "00",
    endHour: "10",
    endMinute: "00"
  });
  const [timeOverlapWarning, setTimeOverlapWarning] = useState("");
  const [teamMemberAvailabilities, setTeamMemberAvailabilities] = useState<TeamMemberAvailability[]>([]);
  const [teamSize, setTeamSize] = useState(0);
  const [teamModalName, setTeamModalName] = useState<string | null>(null);
  const [teamSlotsError, setTeamSlotsError] = useState("");
  const [isTeamSlotsLoading, setIsTeamSlotsLoading] = useState(false);

  // 모집 관련 상태
  const [selectedRecruitment, setSelectedRecruitment] = useState<TeamRecruitment | null>(null);
  const [isCreateRecruitmentOpen, setIsCreateRecruitmentOpen] = useState(false);
  const [newRecruitment, setNewRecruitment] = useState({
    team_board_name: "",
    title: "",
    description: "",
    maxMembers: 3
  });
  
  // 확인 다이얼로그 상태
  const [confirmMessage, setConfirmMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  
  // 성공 알림 상태
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  
  // 경고 알림 상태
  const [warningMessage, setWarningMessage] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  // 모집 데이터 (서버에서 불러옴)
  const [recruitments, setRecruitments] = useState<TeamRecruitment[]>([]);
  // 로드된 recruitments가 어느 강의의 것인지 추적
  const [loadedRecruitmentsCourseCode, setLoadedRecruitmentsCourseCode] = useState<string>("");
  
  // 팀 게시판 목록 (활성화된 팀 게시판들)
  const [teamBoards, setTeamBoards] = useState<TeamRecruitment[]>([]);
  
  // 로드된 teamBoards가 어느 강의의 것인지 추적
  const [loadedTeamBoardsCourseCode, setLoadedTeamBoardsCourseCode] = useState<string>("");
  
  // 선택된 팀 게시판 (팀 게시판 내부로 들어갔을 때)
  const [selectedTeamBoard, setSelectedTeamBoard] = useState<TeamRecruitment | null>(null);

  // 상단 탭 메뉴 (팀 게시판은 활성화된 경우에만 표시, 각 팀 게시판마다 개별 탭)
  const tabs = useMemo(() => {
    const baseTabs: Array<{ id: string; name: string; icon: any; teamBoardId?: number; teamBoardName?: string }> = [
      { id: "notice", name: "공지", icon: Bell },
      { id: "community", name: "커뮤니티", icon: MessageCircle },
      { id: "recruit", name: "모집", icon: Users },
    ];
    
    // 활성화된 각 팀 게시판마다 개별 탭 추가
    teamBoards.forEach((teamBoard) => {
      if (teamBoard.team_board_name) {
        baseTabs.push({ 
          id: `team-${teamBoard.id}`, 
          name: `팀 게시판: ${teamBoard.team_board_name}`, 
          icon: Hash,
          teamBoardId: teamBoard.id,
          teamBoardName: teamBoard.team_board_name
        });
      }
    });
    
    return baseTabs;
  }, [teamBoards]);

  // 매핑 함수
  function tabNameToCategory(tab: string): string {
    if (tab.startsWith("팀 게시판:")) {
      return "team";
    }
    switch (tab) {
      case "공지":
        return "notice";
      case "모집":
        return "recruit";
      case "커뮤니티":
        return "community";
      default:
        return "community";
    }
  }

  function categoryToTabName(category: string): string {
    switch (category) {
      case "notice":
        return "공지";
      case "recruit":
        return "모집";
      case "community":
        return "커뮤니티";
      case "team":
        return "팀 게시판";
      default:
        return "커뮤니티";
    }
  }

  // 샘플 게시글 데이터
  const [posts, setPosts] = useState<Post[]>([]);
  // 현재 로드된 posts가 어느 강의의 것인지 추적
  const [loadedCourseCode, setLoadedCourseCode] = useState<string>("");

  // 서버에서 게시글 목록 가져오기
  async function loadPosts(signal?: AbortSignal) {
    console.log('[loadPosts 시작]', {
      activeTab,
      courseCode: course.code,
      loadedCourseCode,
      hasSignal: !!signal,
      signalAborted: signal?.aborted
    });
    
    try {
      // 다른 강의로 전환할 때만 posts 초기화 (같은 강의는 기존 posts 유지 - 깜빡임 방지)
      if (loadedCourseCode !== course.code) {
        setPosts([]);
        setLoadedCourseCode("");
      }
      
      // 여기서 course.id 쓰는 건 그대로 놔두기 (지금 백엔드에서 Integer course_id 쓰고 있으니까)
      const data = await getBoardPosts(course.code);

      console.log('[loadPosts API 응답]', {
        dataLength: data.length,
        signalAborted: signal?.aborted
      });

      // 컴포넌트가 unmount되었으면 중단
      if (signal?.aborted) {
        console.log('[loadPosts] signal aborted, 중단');
        return [];
      }

      const mapped: Post[] = data.map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        author: p.author || "익명",
        author_id: p.author_id,
        author_student_id: p.author_student_id || null,
        is_professor: p.is_professor || false,
        author_profile_image: p.author_profile_image || null,
        timestamp: p.created_at,
        category: categoryToTabName(p.category),
        originalCategory: p.category,  // 원본 카테고리 저장
        tags: [],
        likes: p.likes || 0,
        comments: [],
        comments_count: p.comments_count || 0,
        isPinned: p.is_pinned === true || p.is_pinned === 1,
        isLiked: p.is_liked || false,
        team_board_name: p.team_board_name || null,
        files: p.files || [],
        poll: p.poll || null,
      }));

      setPosts(mapped);
      setLoadedCourseCode(course.code); // ✅ 중요: posts 로드 완료 후 course code 저장
      
      console.log('[loadPosts 완료]', {
        postsCount: mapped.length,
        loadedCourseCode: course.code,
        activeTab
      });
      
      // 디버깅: poll 데이터 확인
      mapped.forEach((post, idx) => {
        if (post.poll) {
          console.log(`게시글 ${idx + 1} (ID: ${post.id}) poll 데이터:`, post.poll);
        }
      });
      
      // 게시글 목록 반환 (제출 후 자동 추천 게시글 확인용)
      return mapped;
    } catch (err) {
      console.error("게시글 불러오기 실패:", err);
      return [];
    }
  }

  // 서버에서 모집글 목록 가져오기
  async function loadRecruitments() {
    try {
      // 다른 강의로 전환할 때 recruitments 초기화
      if (loadedRecruitmentsCourseCode !== course.code) {
        setRecruitments([]);
        setLoadedRecruitmentsCourseCode("");
      }
      
      const data = await getRecruitments(course.code);

      const mapped: TeamRecruitment[] = data.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        team_board_name: r.team_board_name || null,
        author: r.author,
        author_id: r.author_id,
        author_student_id: r.author_student_id || null,
        is_professor: r.is_professor || false,
        author_profile_image: r.author_profile_image || null,
        timestamp: r.created_at,
        maxMembers: r.max_members,
        currentMembers: r.current_members,
        membersList: r.members_list || [],
        members: r.members || [],
        isJoined: r.is_joined,
        is_board_activated: r.is_board_activated || false,
      }));

      setRecruitments(mapped);
      setLoadedRecruitmentsCourseCode(course.code); // ✅ 로드 완료 표시
    } catch (err) {
      console.error("모집글 불러오기 실패:", err);
    }
  }

  // 탭이 바뀔 때마다, 처음 렌더링 할 때 서버에서 게시글 다시 불러오기
  useEffect(() => {
    console.log('[activeTab 변경 useEffect]', {
      activeTab,
      courseId: course.id,
      courseCode: course.code
    });
    
    const abortController = new AbortController();
    loadPosts(abortController.signal);
    
    return () => {
      console.log('[activeTab useEffect cleanup]', { activeTab });
      abortController.abort();
    };
  }, [activeTab, course.id]);

  // 강의가 바뀔 때 모집글 불러오기
  useEffect(() => {
    loadRecruitments();
    loadTeamBoards();
  }, [course.id]);
  
  // 팀 게시판 목록 불러오기
  async function loadTeamBoards() {
    try {
      // 강의가 바뀌면 이전 teamBoards 초기화
      if (loadedTeamBoardsCourseCode !== course.code) {
        setTeamBoards([]);
        setLoadedTeamBoardsCourseCode("");
      }
      
      const data = await getTeamBoards(course.code);
      const mapped: TeamRecruitment[] = data.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        team_board_name: r.team_board_name || null,
        author: r.author,
        author_id: r.author_id,
        author_student_id: r.author_student_id || null,
        is_professor: r.is_professor || false,
        author_profile_image: r.author_profile_image || null,
        timestamp: r.created_at,
        maxMembers: r.max_members,
        currentMembers: r.current_members,
        membersList: r.members_list || [],
        members: r.members || [],
        isJoined: r.is_joined,
        is_board_activated: r.is_board_activated || false,
      }));
      setTeamBoards(mapped);
      // 로딩 완료 - 어느 강의의 teamBoards인지 기록
      setLoadedTeamBoardsCourseCode(course.code);
    } catch (err) {
      console.error("팀 게시판 목록 불러오기 실패:", err);
    }
  }

  // 게시글이 변경될 때 댓글 입력창 초기화
  useEffect(() => {
    setNewComment("");
    setReplyTo(null);
  }, [selectedPost?.id]);

  // 프로필 이미지 업데이트 이벤트 리스너
  useEffect(() => {
    const handleProfileChange = (event: Event) => {
      const { detail } = event as CustomEvent<ProfileImageEventDetail>;
      if (!detail) return;

      if (!user?.id || detail.userId === user.id) {
        setProfileImage(detail.profileImage ?? null);
      }
    };

    window.addEventListener(PROFILE_IMAGE_UPDATED_EVENT, handleProfileChange);
    return () => {
      window.removeEventListener(PROFILE_IMAGE_UPDATED_EVENT, handleProfileChange);
    };
  }, [user?.id]);

  // 알림 로드 함수 (외부에서도 호출 가능하도록 분리)
  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("알림 불러오기 실패:", err);
    }
  };

  // 알림 데이터 로드
  useEffect(() => {
    loadNotifications();
    
    // 10초마다 알림 자동 새로고침 (실시간 반영)
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // 알림 동기화 리스너 (다른 페이지에서 알림을 읽으면 즉시 반영)
  useEffect(() => {
    const unsubscribe = onNotificationUpdated((detail) => {
      if (detail.type === 'read-all') {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      } else if (detail.type === 'read' && detail.notificationId) {
        setNotifications(prev => 
          prev.map(n => n.id === detail.notificationId ? { ...n, is_read: true } : n)
        );
      } else if (detail.type === 'new') {
        // 새 알림이 생성되면 알림 목록 새로고침
        loadNotifications();
      }
    });

    return unsubscribe;
  }, []);

  // 프로필 아바타 렌더링 함수
  const renderProfileAvatar = (authorId: number | undefined, authorProfileImage: string | null | undefined, size: number = 20, containerClassName?: string) => {
    const isCurrentUser = authorId === user?.id;
    const profile = isCurrentUser ? profileImage : authorProfileImage;
    
    if (profile) {
      if (profile.startsWith('color:')) {
        const color = profile.replace('color:', '');
        return (
          <div 
            className={containerClassName}
            style={{ 
              width: '100%', 
              height: '100%', 
              background: color, 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none'
            }}
          >
            <User size={size} color="white" />
          </div>
        );
      } else {
        return (
          <div
            className={containerClassName}
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img 
              src={profile} 
              alt="프로필" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                borderRadius: '50%' 
              }} 
            />
          </div>
        );
      }
    }
    return <User size={size} />;
  };

  // 알림 데이터
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationTargetPostId, setNotificationTargetPostId] = useState<number | null>(null);
  const [notificationTargetCommentId, setNotificationTargetCommentId] = useState<number | null>(null);
  const [notificationTargetRecruitmentId, setNotificationTargetRecruitmentId] = useState<number | null>(null);
  const [pendingPostOpen, setPendingPostOpen] = useState<Post | null>(null);
  const [pendingNotificationTarget, setPendingNotificationTarget] = useState<any>(null);

  // 팀 게시판 탭이 사라졌을 때 activeTab 조정
  useEffect(() => {
    // 알림 처리 중이면 검증 건너뛰기
    if (pendingNotificationTarget || notificationTargetPostId) {
      console.log('[tabs 검증 useEffect] 알림 처리 중, 검증 건너뛰기', {
        hasPendingNotification: !!pendingNotificationTarget,
        hasNotificationTargetPostId: !!notificationTargetPostId
      });
      return;
    }
    
    console.log('[tabs 검증 useEffect] 검증 시작', {
      activeTab,
      tabExists: tabs.some(tab => tab.name === activeTab),
      tabsCount: tabs.length
    });
    
    const tabExists = tabs.some(tab => tab.name === activeTab);
    if (!tabExists) {
      console.log('[tabs 검증 useEffect] 탭이 없음, "공지"로 초기화');
      setActiveTab("공지");
    }
  }, [tabs, activeTab, pendingNotificationTarget, notificationTargetPostId]);

  // localStorage에서 notificationTarget 읽어서 state로 이동 (한 번만 실행)
  useEffect(() => {
    const stored = localStorage.getItem("notificationTarget");
    if (!stored) return;

    try {
      const target = JSON.parse(stored);
      if (target.courseCode === course.code) {
        // localStorage에서 즉시 제거하고 state로 이동
        localStorage.removeItem("notificationTarget");
        setPendingNotificationTarget(target);
      }
    } catch (err) {
      console.error("알림 타겟 파싱 실패:", err);
    }
  }, [course.code]);

  // pendingNotificationTarget 처리 (단계별 실행)
  useEffect(() => {
    if (!pendingNotificationTarget) return;

    const target = pendingNotificationTarget;
    
    // 게시글 관련 알림
    if (typeof target.postId === "number") {
      // category 정보가 있으면 탭 확인
      if (target.category) {
        let targetTab = target.category;
        // 팀 게시판인 경우 팀 이름 추가
        if (target.category === "팀 게시판" && target.teamBoardName) {
          targetTab = `팀 게시판: ${target.teamBoardName}`;
        }
        
        // 현재 탭이 아니면 탭 전환만 하고 return
        if (activeTab !== targetTab) {
          console.log('[pendingNotificationTarget] 탭 전환:', {
            from: activeTab,
            to: targetTab
          });
          setActiveTab(targetTab);
          // 탭 전환 후 다음 렌더에서 다시 실행되도록 return (state 유지)
          return;
        }
      }
      
      // 탭이 맞으면 댓글 ID와 게시글 ID 설정
      if (target.commentId) {
        setNotificationTargetCommentId(target.commentId);
      }
      
      setNotificationTargetPostId(target.postId);
      
      // 처리 완료: state 정리
      setPendingNotificationTarget(null);
    }
    // 강의 참여 알림 - 이미 해당 강의 게시판에 있으므로 아무것도 하지 않음
    else if (target.type === 'enrollment') {
      setPendingNotificationTarget(null);
    }
    // 팀 모집 참여 알림 - 모집 상세 모달 바로 열기
    else if (target.type === 'recruitment_join') {
      // recruitmentId가 있으면 해당 모집을 선택 (recruitments가 로드된 후 처리)
      if (target.recruitmentId) {
        setNotificationTargetRecruitmentId(target.recruitmentId);
      }
      setPendingNotificationTarget(null);
    }
    // 팀 게시판 활성화 알림 - 해당 팀 게시판 탭으로 이동
    else if (target.type === 'team_board_activated') {
      if (target.recruitmentId) {
        // teamBoards가 현재 강의의 것이 아니면 대기
        if (loadedTeamBoardsCourseCode !== course.code) {
          return; // useEffect가 teamBoards 로드 후 다시 실행됨
        }
        
        // recruitmentId로 teamBoard 찾기 (타입 변환 시도)
        const targetTeamBoard = teamBoards.find(tb => 
          tb.id === target.recruitmentId || 
          tb.id === Number(target.recruitmentId) ||
          String(tb.id) === String(target.recruitmentId)
        );
        
        if (targetTeamBoard && targetTeamBoard.team_board_name) {
          // 팀 게시판 탭으로 전환
          setActiveTab(`팀 게시판: ${targetTeamBoard.team_board_name}`);
          setSelectedTeamBoard(targetTeamBoard);
        }
      }
      // 처리 완료
      setPendingNotificationTarget(null);
    }
  }, [pendingNotificationTarget, activeTab, loadedTeamBoardsCourseCode, teamBoards, course.code]);

  // 강의가 변경되면 탭을 "공지"로 초기화
  useEffect(() => {
    console.log('[강의 변경 useEffect]', {
      courseId: course.id,
      prevCourseId: prevCourseIdRef.current,
      courseChanged: course.id !== prevCourseIdRef.current,
      hasPendingNotification: !!pendingNotificationTarget
    });
    
    // course.id가 실제로 변경되었는지 확인
    if (course.id !== prevCourseIdRef.current) {
      console.log('[강의 변경 useEffect] 강의 변경 감지');
      prevCourseIdRef.current = course.id;
      
      // pendingNotificationTarget이 있으면 초기화 건너뛰기 (알림 처리 중)
      if (pendingNotificationTarget) {
        console.log('[강의 변경 useEffect] pendingNotificationTarget 있음, 탭 초기화 건너뛰기');
        return;
      }
      
      console.log('[강의 변경 useEffect] 탭을 "공지"로 초기화');
      setActiveTab("공지");
    } else {
      console.log('[강의 변경 useEffect] 강의 변경 없음, 실행 안 함');
    }
  }, [course.id, pendingNotificationTarget]);

  // 현재 선택된 팀 게시판 정보 가져오기
  const currentTeamBoard = useMemo(() => {
    if (activeTab.startsWith("팀 게시판:")) {
      const teamBoardName = activeTab.replace("팀 게시판: ", "");
      return teamBoards.find(tb => tb.team_board_name === teamBoardName) || null;
    }
    return null;
  }, [activeTab, teamBoards]);
  
  // 팀 게시판 탭이 선택되면 자동으로 selectedTeamBoard 설정
  useEffect(() => {
    if (currentTeamBoard && selectedTeamBoard?.id !== currentTeamBoard.id) {
      setSelectedTeamBoard(currentTeamBoard);
    } else if (!activeTab.startsWith("팀 게시판:") && selectedTeamBoard) {
      setSelectedTeamBoard(null);
    }
  }, [currentTeamBoard, activeTab, selectedTeamBoard]);

  // 필터링된 게시글
  const filteredPosts = posts.filter(post => {
    // 팀 게시판 탭인 경우
    if (activeTab.startsWith("팀 게시판:")) {
      if (currentTeamBoard) {
        // 카테고리가 "팀 게시판"이고, team_board_name이 일치하는지 확인
        const matchesCategory = post.category === "팀 게시판";
        // team_board_name을 정확히 비교 (null/undefined 체크 포함)
        const matchesTeamBoard = post.team_board_name != null && 
                                 currentTeamBoard.team_board_name != null &&
                                 post.team_board_name.trim() === currentTeamBoard.team_board_name.trim();
        const matchesSearch = searchQuery === "" || 
                             post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             post.content.toLowerCase().includes(searchQuery.toLowerCase());
        
        const shouldShow = matchesCategory && matchesTeamBoard && matchesSearch;
        
        return shouldShow;
      }
      return false;
    }
    
    // 일반 탭인 경우
    const matchesTab = post.category === activeTab;
    const matchesSearch = searchQuery === "" || 
                         post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  }).sort((a, b) => {
    // 고정된 게시물을 먼저 표시
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    // 같은 고정 상태면 최신순 (id가 높을수록 최신)
    return b.id - a.id;
  });

  // 정렬된 모집 목록 (마감 안된 것 우선, 최신순)
  const sortedRecruitments = [...recruitments].sort((a, b) => {
    const aFull = a.currentMembers >= a.maxMembers;
    const bFull = b.currentMembers >= b.maxMembers;

    // 마감 여부로 먼저 정렬 (마감 안된 것이 앞으로)
    if (aFull !== bFull) {
      return aFull ? 1 : -1;
    }

    // 같은 마감 상태면 최신순 (id가 높을수록 최신)
    return b.id - a.id;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // 알림으로 지정된 게시글 자동 열기
  useEffect(() => {
    if (!notificationTargetPostId) return;
    
    console.log('[notificationTargetPostId useEffect] 시작:', {
      notificationTargetPostId,
      postsLength: posts?.length,
      loadedCourseCode,
      currentCourse: course.code,
      activeTab
    });
    
    if (!posts || posts.length === 0) return;

    // posts가 현재 강의의 것인지 확인
    if (loadedCourseCode !== course.code) return;

    const targetPost = posts.find((p) => p.id === notificationTargetPostId);
    
    // 게시글을 찾지 못한 경우
    if (!targetPost) {
      console.log('[notificationTargetPostId useEffect] 게시글을 찾지 못함:', {
        notificationTargetPostId,
        availablePostIds: posts.map(p => p.id)
      });
      return;
    }

    console.log('[notificationTargetPostId useEffect] 게시글 찾음:', {
      postId: targetPost.id,
      postCategory: targetPost.category,
      postTitle: targetPost.title
    });

    // 게시글이 속한 탭 확인
    let targetTab = targetPost.category;
    if (targetPost.category === "팀 게시판" && targetPost.team_board_name) {
      targetTab = `팀 게시판: ${targetPost.team_board_name}`;
    }
    
    console.log('[notificationTargetPostId useEffect] 탭 확인:', {
      현재탭: activeTab,
      게시글탭: targetTab,
      일치: activeTab === targetTab
    });
    
    // 올바른 탭에 있지 않으면 대기 (탭 전환 중)
    if (activeTab !== targetTab) {
      console.log('[notificationTargetPostId useEffect] 탭 불일치, 대기 중...');
      return;
    }

    console.log('[notificationTargetPostId useEffect] 게시글 모달 열기');
    
    // 게시글을 찾았으므로 이전 경고 메시지 초기화
    setShowWarning(false);
    setWarningMessage("");

    // notificationTargetPostId를 먼저 null로 설정 (useEffect 중복 실행 방지)
    setNotificationTargetPostId(null);
    
    // localStorage 정리
    localStorage.removeItem("notificationTarget");
    
    // 게시글 열기
    setTimeout(() => {
      handlePostClick(targetPost);
    }, 30);
  }, [notificationTargetPostId, posts, course.code, loadedCourseCode, activeTab]);

  // 탭 전환 후 대기 중인 게시물 열기
  useEffect(() => {
    if (!pendingPostOpen) return;
    if (posts.length === 0) return;
    
    // pendingPostOpen을 null로 설정 (한 번만 실행)
    const postToOpen = pendingPostOpen;
    setPendingPostOpen(null);
    
    // 최소 딜레이로 게시물 열기 (깜빡임 최소화)
    setTimeout(() => {
      handlePostClick(postToOpen);
    }, 50);
  }, [pendingPostOpen, posts, activeTab]);

  // 알림으로 지정된 모집 자동 선택
  useEffect(() => {
    if (!notificationTargetRecruitmentId) return;
    
    // recruitments가 현재 강의의 것인지 확인
    if (loadedRecruitmentsCourseCode !== course.code) {
      console.log('[notificationTargetRecruitmentId useEffect] recruitments 로드 대기 중:', {
        loadedRecruitmentsCourseCode,
        currentCourse: course.code
      });
      return; // recruitments가 로드되면 다시 실행됨
    }
    
    if (!recruitments || recruitments.length === 0) return;

    console.log('[notificationTargetRecruitmentId useEffect]', {
      notificationTargetRecruitmentId,
      notificationTargetRecruitmentIdType: typeof notificationTargetRecruitmentId,
      recruitments: recruitments.map(r => ({ id: r.id, idType: typeof r.id, title: r.title }))
    });

    // 타입 변환을 시도하여 모집 찾기
    const targetRecruitment = recruitments.find(r => 
      r.id === notificationTargetRecruitmentId ||
      r.id === Number(notificationTargetRecruitmentId) ||
      String(r.id) === String(notificationTargetRecruitmentId)
    );
    
    if (targetRecruitment) {
      console.log('[notificationTargetRecruitmentId useEffect] 모집 찾음:', targetRecruitment.title);
      // 모집을 찾았으므로 이전 경고 메시지 초기화
      setShowWarning(false);
      setWarningMessage("");
      // 모집 탭으로 전환하고 모집 선택 (모달이 바로 열림)
      setActiveTab("모집");
      setSelectedRecruitment(targetRecruitment);
    } else {
      console.log('[notificationTargetRecruitmentId useEffect] 모집을 찾지 못함');
      setWarningMessage("삭제된 모집입니다.");
      setShowWarning(true);
    }
    
    // ✅ localStorage와 state 정리 (다른 탭 이동 시 다시 열리지 않도록)
    setNotificationTargetRecruitmentId(null);
    localStorage.removeItem("notificationTarget");
  }, [notificationTargetRecruitmentId, recruitments, loadedRecruitmentsCourseCode, course.code]);

  // 댓글/답글 알림 처리 (알림 클릭 시점에 존재 확인 완료)
  useEffect(() => {
    if (!notificationTargetCommentId) return;
    if (!selectedPost) return;
    
    // 이전 경고 메시지 초기화
      setShowWarning(false);
      setWarningMessage("");
    
    // commentId 처리 완료
    setNotificationTargetCommentId(null);
  }, [notificationTargetCommentId, selectedPost]);

  // 팀 게시판 이름 추출 헬퍼 함수
  const extractTeamBoardName = (content: string): string | null => {
    const patterns = [
      /\] (.+?) 새 글이 작성되었습니다/,  // "] 팀이름 새 글이 작성되었습니다"
      /팀 게시판 - (.+?)에 새 글/,       // "팀 게시판 - 팀이름에 새 글"
      /팀 게시판 - (.+?)에/,             // "팀 게시판 - 팀이름에"
      /팀게시판-([^\s]+)/,               // "팀게시판-팀이름"
      /\] (.+?) 팀 게시판/,              // "] 팀이름 팀 게시판"
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // 알림 클릭 핸들러
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      // 낙관적 업데이트: UI를 먼저 업데이트
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? {...n, is_read: true} : n)
      );
      
      // 다른 페이지에도 알림 (즉시 동기화)
      notifyNotificationUpdated({ type: 'read', notificationId: notification.id });
      
      try {
        await markAsRead(notification.id);
      } catch (err) {
        console.error("알림 읽음 처리 실패:", err);
        // 실패 시 원래대로 복구
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? {...n, is_read: false} : n)
        );
      }
    }

    // 게시판 관련 알림이면 먼저 존재 여부 확인
    if (
      (notification.type === 'notice' || notification.type === 'comment' || notification.type === 'reply' || notification.type === 'team_post') &&
      notification.related_id
    ) {
      try {
        // 게시물 존재 확인 (게시물이 삭제되었으면 우선적으로 표시)
        const postCheck = await checkPostExists(notification.related_id);
        if (!postCheck.exists) {
          setWarningMessage("삭제된 게시물입니다.");
          setShowWarning(true);
          return; // 현재 위치에서 메시지만 표시
        }
        
        // 게시물이 존재하고, 댓글/답글 알림이면 댓글 존재 확인
        if ((notification.type === 'comment' || notification.type === 'reply') && notification.comment_id) {
          const commentCheck = await checkCommentExists(notification.comment_id);
          if (!commentCheck.exists) {
            setWarningMessage("삭제된 댓글입니다.");
            setShowWarning(true);
            return; // 현재 위치에서 메시지만 표시
          }
        }
        
        // 게시물과 댓글이 존재하면 기존 로직 실행
        // 카테고리 정보 추출 (모든 경우에 필요)
        let category = "공지";
        let teamBoardName = null;
        
        if (notification.type === 'notice') {
          category = "공지";
        } else if (notification.type === 'team_post') {
          category = "팀 게시판";
          teamBoardName = extractTeamBoardName(notification.content);
        } else if (notification.type === 'comment' || notification.type === 'reply') {
          if (notification.content.includes('팀게시판') || notification.content.includes('팀 게시판')) {
            category = "팀 게시판";
            teamBoardName = extractTeamBoardName(notification.content);
          } else if (notification.content.includes('공지')) {
            category = "공지";
          } else if (notification.content.includes('커뮤니티')) {
            category = "커뮤니티";
          }
        }
      
      // 현재 강의에 대한 알림이면 pendingNotificationTarget 설정
      if (notification.course_id === course.code) {
          // pendingNotificationTarget을 통해 탭 전환 처리
          setPendingNotificationTarget({
            courseCode: course.code,
            postId: notification.related_id,
            commentId: notification.comment_id,
            category: category,
            teamBoardName: teamBoardName,
          });
        } else if (notification.course_id) {
          // 다른 강의 알림이면 직접 해당 강의로 이동
        try {
          // 알림 내용에서 카테고리 정보 추출 (같은 강의와 동일한 로직 사용)
          let category = "공지"; // 기본값
          let teamBoardName = null;
          
          if (notification.type === 'team_post') {
            category = "팀 게시판";
            teamBoardName = extractTeamBoardName(notification.content);
          } else if (notification.type === 'comment' || notification.type === 'reply') {
            if (notification.content.includes('팀게시판') || notification.content.includes('팀 게시판')) {
              category = "팀 게시판";
              teamBoardName = extractTeamBoardName(notification.content);
            } else if (notification.content.includes('공지')) {
              category = "공지";
            } else if (notification.content.includes('커뮤니티')) {
              category = "커뮤니티";
            }
          } else if (notification.type === 'notice') {
            category = "공지";
          }
          
          localStorage.setItem(
            "notificationTarget",
            JSON.stringify({
              courseCode: notification.course_id,
              postId: notification.related_id,
              commentId: notification.comment_id,
              category: category,
              teamBoardName: teamBoardName,
            })
          );
        } catch (e) {
          console.error("알림 타겟 저장 실패:", e);
        }
        
          // 해당 강의로 직접 이동 (대시보드를 거치지 않음)
          const targetCourse = courses.find(c => c.code === notification.course_id);
          if (targetCourse) {
            navigate(`/student-dashboard/course/${targetCourse.id}`, { replace: true });
          } else {
            // 강의를 찾지 못하면 대시보드로
            onBack();
          }
        }
      } catch (err) {
        console.error("게시물/댓글 존재 확인 실패:", err);
        // API 오류 시 기존 로직 실행 (하위 호환성)
        
        // 카테고리 정보 추출 (모든 경우에 필요)
        let category = "공지";
        let teamBoardName = null;
        
        if (notification.type === 'notice') {
          category = "공지";
        } else if (notification.type === 'team_post') {
          category = "팀 게시판";
          teamBoardName = extractTeamBoardName(notification.content);
        } else if (notification.type === 'comment' || notification.type === 'reply') {
          if (notification.content.includes('팀게시판') || notification.content.includes('팀 게시판')) {
            category = "팀 게시판";
            teamBoardName = extractTeamBoardName(notification.content);
          } else if (notification.content.includes('공지')) {
            category = "공지";
          } else if (notification.content.includes('커뮤니티')) {
            category = "커뮤니티";
          }
        }
        
        if (notification.course_id === course.code) {
          // pendingNotificationTarget을 통해 탭 전환 처리
          setPendingNotificationTarget({
            courseCode: course.code,
            postId: notification.related_id,
            commentId: notification.comment_id,
            category: category,
            teamBoardName: teamBoardName,
          });
      } else if (notification.course_id) {
        try {
          // 알림 내용에서 카테고리 정보 추출 (같은 강의와 동일한 로직 사용)
          let category = "공지";
          let teamBoardName = null;
          
          if (notification.type === 'team_post') {
            category = "팀 게시판";
            teamBoardName = extractTeamBoardName(notification.content);
          } else if (notification.type === 'comment' || notification.type === 'reply') {
            if (notification.content.includes('팀게시판') || notification.content.includes('팀 게시판')) {
              category = "팀 게시판";
              teamBoardName = extractTeamBoardName(notification.content);
            } else if (notification.content.includes('공지')) {
              category = "공지";
            } else if (notification.content.includes('커뮤니티')) {
              category = "커뮤니티";
            }
          } else if (notification.type === 'notice') {
            category = "공지";
          }
          
          localStorage.setItem(
            "notificationTarget",
            JSON.stringify({
              courseCode: notification.course_id,
              postId: notification.related_id,
              commentId: notification.comment_id,
              category: category,
              teamBoardName: teamBoardName,
            })
          );
        } catch (e) {
          console.error("알림 타겟 저장 실패:", e);
        }
          const targetCourse = courses.find(c => c.code === notification.course_id);
          if (targetCourse) {
            navigate(`/student-dashboard/course/${targetCourse.id}`, { replace: true });
          } else {
        onBack();
          }
        }
      }
    }

    // 강의 참여 알림이면 현재 강의에 있으므로 아무것도 하지 않음
    if (notification.type === 'enrollment' && notification.course_id === course.code) {
      // 이미 해당 강의 게시판에 있으므로 아무것도 하지 않음
    } else if (notification.type === 'enrollment' && notification.course_id) {
      // 다른 강의 참여 알림이면 직접 해당 강의로 이동
      try {
        localStorage.setItem(
          "notificationTarget",
          JSON.stringify({
            courseCode: notification.course_id,
            type: 'enrollment',
          })
        );
      } catch (e) {
        console.error("알림 타겟 저장 실패:", e);
      }
      
      const targetCourse = courses.find(c => c.code === notification.course_id);
      if (targetCourse) {
        navigate(`/student-dashboard/course/${targetCourse.id}`, { replace: true });
      } else {
      onBack();
      }
    }

    // 팀 모집 참여 알림이면 모집 상세 모달 바로 열기
    if (notification.type === 'recruitment_join') {
      // 현재 강의에 대한 알림이면 모집 상세 모달 바로 열기
      if (notification.course_id === course.code) {
        // related_id가 있으면 해당 모집을 선택 (recruitments가 로드된 후 처리)
        if (notification.related_id) {
          setNotificationTargetRecruitmentId(notification.related_id);
        }
      } else if (notification.course_id) {
        // 다른 강의 알림이면 직접 해당 강의로 이동
        try {
          localStorage.setItem(
            "notificationTarget",
            JSON.stringify({
              courseCode: notification.course_id,
              type: 'recruitment_join',
              recruitmentId: notification.related_id,
            })
          );
        } catch (e) {
          console.error("알림 타겟 저장 실패:", e);
        }
        
        const targetCourse = courses.find(c => c.code === notification.course_id);
        if (targetCourse) {
          navigate(`/student-dashboard/course/${targetCourse.id}`, { replace: true });
        } else {
        onBack();
        }
      }
    }

    // 팀 게시판 활성화 알림이면 해당 팀 게시판 탭으로 이동
    if (notification.type === 'team_board_activated') {
      // 현재 강의에 대한 알림이면 팀 게시판 탭으로 이동
      if (notification.course_id === course.code && notification.related_id) {
        // recruitmentId로 teamBoard 찾기 (타입 변환 시도)
        const targetTeamBoard = teamBoards.find(tb => 
          tb.id === notification.related_id || 
          tb.id === Number(notification.related_id) ||
          String(tb.id) === String(notification.related_id)
        );
        
        if (targetTeamBoard && targetTeamBoard.team_board_name) {
          // 팀 게시판 탭으로 전환
          setActiveTab(`팀 게시판: ${targetTeamBoard.team_board_name}`);
          setSelectedTeamBoard(targetTeamBoard);
        } else if (teamBoards.length === 0) {
          // teamBoards가 로드되지 않았으면 localStorage에 저장하고 대기
          try {
            localStorage.setItem(
              "notificationTarget",
              JSON.stringify({
                courseCode: notification.course_id,
                type: 'team_board_activated',
                recruitmentId: notification.related_id,
              })
            );
          } catch (e) {
            console.error("알림 타겟 저장 실패:", e);
          }
          // 알림 패널 닫기
          setIsNotificationOpen(false);
          return;
        }
      } else if (notification.course_id) {
        // 다른 강의 알림이면 직접 해당 강의로 이동
        try {
          // 알림 내용에서 팀 게시판 이름 추출
          let teamBoardName = null;
          const match = notification.content.match(/모집 "([^"]+)"/);
          if (match && match[1]) {
            teamBoardName = match[1];
          }
          
          localStorage.setItem(
            "notificationTarget",
            JSON.stringify({
              courseCode: notification.course_id,
              type: 'team_board_activated',
              recruitmentId: notification.related_id,
              teamBoardName: teamBoardName,
            })
          );
        } catch (e) {
          console.error("알림 타겟 저장 실패:", e);
        }
        
        const targetCourse = courses.find(c => c.code === notification.course_id);
        if (targetCourse) {
          navigate(`/student-dashboard/course/${targetCourse.id}`, { replace: true });
        } else {
          onBack();
        }
      }
    }

    // 알림 패널 닫기
    setIsNotificationOpen(false);
  };

  // 알림 아이콘 가져오기
  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'notice': return AlertCircle;
      case 'comment': return MessageSquare;
      case 'reply': return MessageSquare;
      case 'enrollment': return Users;
      case 'recruitment_join': return Users;
      case 'team_post': return FileText;
      case 'team_board_activated': return CheckCircle;
      default: return Bell;
    }
  };

  // 상대 시간 계산 (몇분 전, 몇시간 전, 날짜)
  const getRelativeTime = (dateString: string): string => {
    try {
      const now = new Date();
      let notifDate: Date;
      
      if (dateString.includes('T')) {
        // ISO 형식
        notifDate = new Date(dateString);
      } else {
        // "2025-11-24 12:27" 형식을 로컬 시간으로 정확히 파싱
        const [datePart, timePart] = dateString.split(' ');
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        notifDate = new Date(
          parseInt(year), 
          parseInt(month) - 1, 
          parseInt(day), 
          parseInt(hour), 
          parseInt(minute)
        );
      }
      
      const diffMs = now.getTime() - notifDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= 1) {
        return `${diffDays}일 전`;
      } else if (diffHours >= 1) {
        return `${diffHours}시간 전`;
      } else if (diffMinutes >= 1) {
        return `${diffMinutes}분 전`;
      } else {
        return '방금 전';
      }
    } catch (error) {
      console.error('날짜 파싱 오류:', error, dateString);
      return dateString;
    }
  };

  // 알림 내용 포맷팅 (강의명과 탭을 굵게 표시)
  const formatNotificationContent = (content: string) => {
    // [강의명] 모집 "제목" ... 패턴 (팀모집 참여 알림)
    const recruitmentMatch = content.match(/^(\[[^\]]+\]\s+)(모집)(\s+.+)$/);
    if (recruitmentMatch) {
      const [, prefix, keyword, rest] = recruitmentMatch;
      return (
        <>
          <strong>{prefix.trim()}</strong> <strong>{keyword}</strong>{rest}
        </>
      );
    }

    // [강의명] 탭 "제목" ... 형식을 파싱 (> 없이)
    const match = content.match(/\[([^\]]+)\]\s+([^\s"]+)\s+(.+)/);
    
    if (match) {
      const [, courseName, tabName, rest] = match;
      // 탭 이름이 있는 경우 (공지사항, 질문게시판 등)
      if (
        ['공지사항', '질문게시판', '자유게시판', '커뮤니티'].includes(tabName) ||
        tabName.startsWith('팀게시판')
      ) {
        return (
          <>
            <strong>[{courseName}]</strong> <strong>{tabName}</strong> {rest}
          </>
        );
      }
    }
    
    // [강의명] 나머지 내용 (강의 참여 알림 등)
    const simpleMatch = content.match(/\[([^\]]+)\]\s+(.+)/);
    if (simpleMatch) {
      const [, courseName, rest] = simpleMatch;
      return (
        <>
          <strong>[{courseName}]</strong> {rest}
        </>
      );
    }
    
    // 매칭되지 않으면 원본 그대로 반환
    return content;
  };

  // formatDateTime 함수는 현재 사용되지 않음
  // const formatDateTime = (date: Date) => {
  //   const year = date.getFullYear();
  //   const month = String(date.getMonth() + 1).padStart(2, '0');
  //   const day = String(date.getDate()).padStart(2, '0');
  //   const hours = String(date.getHours()).padStart(2, '0');
  //   const minutes = String(date.getMinutes()).padStart(2, '0');
  //   return `${year}. ${month}. ${day}. ${hours}:${minutes}`;
  // };

  // 파일 타입 확인
  const getFileType = (filename: string): 'image' | 'video' | 'file' => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) return 'video';
    return 'file';
  };

  // 파일 업로드 핸들러
  const handleFileUpload = async (file: File, fileType: 'image' | 'video' | 'file', isEditMode: boolean = false) => {
    try {
      const res = await uploadFile(file);
      if (res.file) {
        const fileData = {
          ...res.file,
          preview: fileType === 'image' ? URL.createObjectURL(file) : undefined
        };
        if (isEditMode) {
          setEditPostFiles(prev => [...prev, fileData]);
        } else {
        setPostFiles(prev => [...prev, fileData]);
        }
      } else {
        setWarningMessage(res.message || "파일 업로드에 실패했습니다.");
        setShowWarning(true);
      }
    } catch (err) {
      console.error("파일 업로드 실패:", err);
      setWarningMessage("파일 업로드 중 오류가 발생했습니다.");
      setShowWarning(true);
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video' | 'file', isEditMode: boolean = false) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      // 파일 크기 확인 (50MB)
      if (file.size > 50 * 1024 * 1024) {
        setWarningMessage(`${file.name} 파일 크기는 50MB를 초과할 수 없습니다.`);
        setShowWarning(true);
        return;
      }
      handleFileUpload(file, fileType, isEditMode);
    });

    // 같은 파일을 다시 선택할 수 있도록 input 초기화
    e.target.value = '';
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent, isEditMode: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files.length) return;

    Array.from(files).forEach(file => {
      if (file.size > 50 * 1024 * 1024) {
        setWarningMessage(`${file.name} 파일 크기는 50MB를 초과할 수 없습니다.`);
        setShowWarning(true);
        return;
      }
      const fileType = getFileType(file.name);
      handleFileUpload(file, fileType, isEditMode);
    });
  };

  // 파일 삭제 핸들러
  const handleRemoveFile = (index: number) => {
    setPostFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      setWarningMessage("제목과 내용을 입력해주세요.");
      setShowWarning(true);
      return;
    }

    // 투표 검증
    if (newPostPoll) {
      if (!newPostPoll.question.trim()) {
        setWarningMessage("투표 질문을 입력해주세요.");
        setShowWarning(true);
        return;
      }
      const validOptions = newPostPoll.options.filter(opt => opt.text.trim());
      if (validOptions.length < 2) {
        setWarningMessage("투표 옵션은 최소 2개 이상 필요합니다.");
        setShowWarning(true);
        return;
      }
    }

    try {
      // 탭(공지/모집/커뮤니티/팀 게시판)을 백엔드 category 값으로 변환
      const categoryForApi = tabNameToCategory(activeTab);

      // 파일 정보 준비
      const filesData = postFiles.map(f => ({
        filename: f.filename,
        original_name: f.original_name,
        type: f.type,
        size: f.size,
        url: f.url
      }));

      // 팀 게시판인 경우 team_board_name 추가
      const teamBoardName = activeTab.startsWith("팀 게시판:") 
        ? activeTab.replace("팀 게시판: ", "")
        : null;

      // 투표 정보 준비 (유효한 옵션만)
      const pollData = newPostPoll ? {
        question: newPostPoll.question,
        options: newPostPoll.options.filter(opt => opt.text.trim()).map(opt => ({ text: opt.text })),
        expires_at: newPostPoll.expires_at || null
      } : null;

      // 서버에 글 생성 요청 보내기
      const res = await createBoardPost(
        course.code,
        newPostTitle,    
        newPostContent,  
        categoryForApi,
        filesData,
        teamBoardName,
        pollData
      );

      const p = res.post;

      // 서버에서 돌아온 데이터 → 화면에서 쓰는 Post 타입으로 변환
      const createdPost: Post = {
        id: p.id,
        title: p.title,
        content: p.content,
        author: p.author || (user?.name || "나"),
        author_id: p.author_id || user?.id,
        author_student_id: (user?.user_type === 'professor') ? null : (p.author_student_id || user?.student_id || null),
        is_professor: p.is_professor || (user?.user_type === 'professor') || false,
        author_profile_image: p.author_profile_image || null,
        timestamp: p.created_at,
        category: categoryToTabName(p.category),
        originalCategory: p.category,  // 원본 카테고리 저장
        tags: [],
        likes: 0,
        comments: [],
        isPinned: false,
        isLiked: false,
        team_board_name: p.team_board_name || null,
        files: p.files || filesData || [],
        poll: p.poll || (newPostPoll ? {
          ...newPostPoll,
          options: newPostPoll.options.filter(opt => opt.text.trim()).map((opt, idx) => ({
            id: idx,
            text: opt.text,
            votes: 0
          }))
        } : null),
      };

      // 맨 앞에 추가
      setPosts((prev) => [createdPost, ...prev]);

      // 폼 초기화 & 모달 닫기
      setNewPostTitle("");
      setNewPostContent("");
      setPostFiles([]);
      setNewPostPoll(null);
      setIsCreatePostOpen(false);
    } catch (err) {
      console.error("게시글 작성 실패:", err);
      setWarningMessage("게시글 작성 중 오류가 발생했습니다.");
      setShowWarning(true);
    }
  };

  const handleLikePost = async (postId: number) => {
    try {
      const res = await toggleLike(postId);
      
      // 좋아요 상태 업데이트
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likes: res.likes,
            isLiked: res.is_liked
          };
        }
        return post;
      }));

      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost({
          ...selectedPost,
          likes: res.likes,
          isLiked: res.is_liked
        });
      }
    } catch (err) {
      console.error("좋아요 실패:", err);
    }
  };

  const handleVotePoll = async (postId: number, optionId: number) => {
    try {
      const res = await votePoll(postId, optionId);
      
      // 투표 상태 업데이트
      setPosts(posts.map(post => {
        if (post.id === postId && post.poll) {
          return {
            ...post,
            poll: {
              ...post.poll,
              ...res.poll,
              user_vote: optionId
            }
          };
        }
        return post;
      }));

      if (selectedPost && selectedPost.id === postId && selectedPost.poll) {
        setSelectedPost({
          ...selectedPost,
          poll: {
            ...selectedPost.poll,
            ...res.poll,
            user_vote: optionId
          }
        });
      }
    } catch (err) {
      console.error("투표 실패:", err);
      setWarningMessage("투표 중 오류가 발생했습니다.");
      setShowWarning(true);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;

    try {
      // 답글일 경우 @이름 부분 제거
      const commentContent = replyTo 
        ? newComment.replace(`@${replyTo.author} `, '').trim()
        : newComment;
      
      const res = await createComment(selectedPost.id, commentContent, replyTo?.id as any);
      const newCommentData: Comment = {
        id: res.comment.id,
        author: res.comment.author,
        author_id: res.comment.author_id ?? undefined,
        author_student_id: (user?.user_type === 'professor') ? null : (res.comment.author_student_id || user?.student_id || null),
        is_professor: res.comment.is_professor || (user?.user_type === 'professor') || false,
        author_profile_image: res.comment.author_profile_image || null,
        parent_comment_id: res.comment.parent_comment_id || null,
        content: res.comment.content,
        timestamp: res.comment.created_at,
        likes: res.comment.likes || 0,
        isLiked: res.comment.is_liked || false,
      };

      // 상세 모달 댓글 목록 업데이트 (답글이면 부모 아래에 추가)
      if (replyTo) {
        const parentId = replyTo.id;
        const addReply = (comments: Comment[]): Comment[] =>
          comments.map(c => {
            if (c.id === parentId) {
              return { ...c, replies: [...(c.replies || []), newCommentData] };
            }
            return { ...c, replies: c.replies ? addReply(c.replies) : c.replies };
          });

        setSelectedPost({
          ...selectedPost,
          comments: addReply(selectedPost.comments),
        });
      } else {
        setSelectedPost({
          ...selectedPost,
          comments: [...selectedPost.comments, newCommentData],
        });
      }

      // 목록 댓글 수/목록도 업데이트
      setPosts(prev =>
        prev.map(post =>
          post.id === selectedPost.id
            ? {
                ...post,
                comments: [...post.comments, newCommentData],
                comments_count: (post.comments_count || 0) + 1,
              }
            : post
        )
      );
      setNewComment("");
      setReplyTo(null);
      
      // 알림 새로고침 (댓글/답글 작성 시 알림이 생성됨)
      notifyNotificationUpdated({ type: 'new' });
    } catch (err) {
      console.error("댓글 작성 실패:", err);
      setWarningMessage("댓글 작성 중 오류가 발생했습니다.");
      setShowWarning(true);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!selectedPost) return;
    setConfirmMessage("댓글을 삭제하시겠습니까?");
    setConfirmCallback(() => async () => {
      try {
        await deleteComment(commentId);

        // 댓글 목록에서 제거 (답글 포함)
        const removeComment = (comments: Comment[]): Comment[] => {
          return comments
            .filter(c => c.id !== commentId)
            .map(c => ({
              ...c,
              replies: c.replies ? removeComment(c.replies) : c.replies
            }));
        };

        setSelectedPost({
          ...selectedPost,
          comments: removeComment(selectedPost.comments),
        });

        // 목록의 댓글 수도 업데이트
        setPosts(prev =>
          prev.map(post =>
            post.id === selectedPost.id
              ? {
                  ...post,
                  comments_count: (post.comments_count || 0) - 1,
                }
              : post
          )
        );
        
        // 성공 메시지 표시
        setSuccessMessage("댓글이 삭제되었습니다.");
        setShowSuccess(true);
      } catch (err) {
        console.error("댓글 삭제 실패:", err);
        setWarningMessage("댓글 삭제 중 오류가 발생했습니다.");
        setShowWarning(true);
      }
    });
    setShowConfirm(true);
  };

  const handleCommentLike = async (commentId: number) => {
    if (!selectedPost) return;

    try {
      const res = await toggleCommentLike(commentId);

      // 댓글 목록 업데이트
      const updateCommentLike = (comments: Comment[]): Comment[] => {
        return comments.map(c => {
          if (c.id === commentId) {
            return { ...c, likes: res.likes, isLiked: res.is_liked };
          }
          return { ...c, replies: c.replies ? updateCommentLike(c.replies) : c.replies };
        });
      };

      setSelectedPost({
        ...selectedPost,
        comments: updateCommentLike(selectedPost.comments),
      });
    } catch (err) {
      console.error("댓글 좋아요 실패:", err);
      setWarningMessage("댓글 좋아요 중 오류가 발생했습니다.");
      setShowWarning(true);
    }
  };

  const handlePostClick = async (post: Post) => {
    // 게시글 열 때 이전 경고 메시지 초기화 (댓글 타겟은 useEffect에서 처리 후 초기화)
    setShowWarning(false);
    setWarningMessage("");
    
    try {
      // 댓글 불러오기
      const comments = await getComments(post.id);
      const flat: Comment[] = comments.map((c: any) => ({
        id: c.id,
        author: c.author,
        author_id: c.author_id,
        author_student_id: c.author_student_id || null,
        is_professor: c.is_professor || false,
        author_profile_image: c.author_profile_image || null,
        parent_comment_id: c.parent_comment_id || null,
        content: c.content,
        timestamp: c.created_at,
        likes: c.likes || 0,
        isLiked: c.is_liked || false,
        replies: [],
      }));

      const byId = new Map<number, Comment>();
      flat.forEach(c => {
        c.replies = [];
        byId.set(c.id, c);
      });

      const roots: Comment[] = [];
      flat.forEach(c => {
        if (c.parent_comment_id) {
          const parent = byId.get(c.parent_comment_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(c);
          } else {
            roots.push(c);
          }
        } else {
          roots.push(c);
        }
      });

      setSelectedPost({
        ...post,
        comments: roots
      });
    } catch (err) {
      console.error("댓글 로드 실패:", err);
      setSelectedPost(post);
    }
  };

  // 가능한 시간 관련 함수
  const checkTimeOverlap = (day: string, startTime: string, endTime: string): boolean => {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);

    return myAvailableTimes.some(time => {
      if (time.day !== day) return false;

      const existingStart = new Date(`2000-01-01 ${time.startTime}`);
      const existingEnd = new Date(`2000-01-01 ${time.endTime}`);

      return (start < existingEnd && end > existingStart);
    });
  };

  const handleAddTime = async () => {
    if (!currentTeamBoard) return;
    
    setTimeOverlapWarning("");

    const startTime = `${newTime.startHour}:${newTime.startMinute}`;
    const endTime = `${newTime.endHour}:${newTime.endMinute}`;

    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);

    if (start >= end) {
      setTimeOverlapWarning("종료 시간은 시작 시간보다 늦어야 합니다.");
      return;
    }

    // 겹치는 시간이 있는지 확인
    if (checkTimeOverlap(newTime.day, startTime, endTime)) {
      setTimeOverlapWarning("⚠️ 이미 해당 요일에 겹치는 시간이 있습니다.");
      return;
    }

    // 즉시 서버에 저장
    try {
      const result = await addAvailableTime(
        newTime.day,
        startTime,
        endTime,
        currentTeamBoard.id
      );

      if (result.status === 201 || result.status === 200) {
        
        // 서버에 저장된 시간을 다시 불러와서 state에 추가 (정확한 ID를 얻기 위해)
        try {
          const teamTimes = await getMyAvailableTimes(currentTeamBoard.id);
          const formattedTeamTimes: AvailableTime[] = teamTimes.map((time: any) => ({
            id: `team-${time.id}`,
            day: time.day_of_week,
            startTime: time.start_time,
            endTime: time.end_time,
            source: 'team' as const,
            teamTimeId: time.id
          }));

          // 기존 대시보드 시간은 유지하고, 새로 추가된 팀 시간만 업데이트
          const dashboardTimes = myAvailableTimes.filter(t => t.source === 'dashboard');
          setMyAvailableTimes([...dashboardTimes, ...formattedTeamTimes]);
        } catch (error) {
          console.error("추가된 시간 불러오기 실패:", error);
          // 실패해도 임시로 추가
          const time: AvailableTime = {
            id: `team-${Date.now()}`,
            day: newTime.day,
            startTime: startTime,
            endTime: endTime,
            source: 'team' as const
          };
          setMyAvailableTimes([...myAvailableTimes, time]);
        }

        setNewTime({ day: "월요일", startHour: "09", startMinute: "00", endHour: "10", endMinute: "00" });
      } else {
        setTimeOverlapWarning(result.msg || "시간 추가 실패");
      }
    } catch (error) {
      console.error("시간 추가 오류:", error);
      setTimeOverlapWarning("시간 추가 중 오류가 발생했습니다.");
    }
  };

  const handleRemoveTime = async (id: string) => {
    if (!currentTeamBoard) return;

    const timeToRemove = myAvailableTimes.find(t => t.id === id);
    
    if (!timeToRemove) return;

    // 대시보드 시간인 경우: 모달에서만 제거 (서버에는 영향 없음)
    if (timeToRemove.source === 'dashboard') {
      setMyAvailableTimes(myAvailableTimes.filter(t => t.id !== id));
      return;
    }

    // 팀 시간인 경우: 서버에서 삭제
    if (timeToRemove.source === 'team' && timeToRemove.teamTimeId) {
      try {
        await deleteAvailableTime(timeToRemove.teamTimeId);
        // 삭제 성공 시 모달에서도 제거
        setMyAvailableTimes(myAvailableTimes.filter(t => t.id !== id));
        // 팀 가능 시간 다시 불러오기
        await loadTeamAvailability();
      } catch (error) {
        console.error("시간 삭제 실패:", error);
        setWarningMessage("시간 삭제 중 오류가 발생했습니다.");
        setShowWarning(true);
      }
    } else {
      // source가 없는 경우 (예전 데이터) 모달에서만 제거
      setMyAvailableTimes(myAvailableTimes.filter(t => t.id !== id));
    }
  };

  const handleSubmitAvailableTime = async () => {
    if (!currentTeamBoard) return;
    
    // 시간은 이미 handleAddTime에서 저장되었으므로, 
    // 여기서는 제출 이력 기록 및 자동 추천 게시글 생성 확인만 수행
    try {
      // 제출 이력 기록 및 자동 추천 게시글 생성 확인
      const result = await submitTeamAvailability(currentTeamBoard.id);
      
      // 팀 가능 시간 다시 불러오기 (최신 상태 반영)
      await loadTeamAvailability();
      
      // 제출 완료 후 결과 보기 모드로 전환
      if (currentTeamBoard) {
        setIsResultView(true);
        setTeamSubmittedMap(prev => {
          const newMap = new Map(prev);
          newMap.set(currentTeamBoard.id, true);
          return newMap;
        });
      }
      
      // 게시글 목록 새로고침 (자동 추천 게시글이 생성되었을 수 있음)
      await loadPosts();
      
      // 자동 추천 게시글이 생성되었는지 확인
      if (result.created_posts && Array.isArray(result.created_posts) && result.created_posts.length > 0) {
        setSuccessMessage(
          `시간이 제출되었습니다!\n\n팀원 모두가 시간을 제출하여 팀 게시판에 자동 시간 추천 게시글이 생성되었습니다!`
        );
      } else {
        setSuccessMessage("시간이 제출되었습니다.");
      }
      setShowSuccess(true);
    } catch (error) {
      console.error("[TEST] ❌ 시간 제출 실패:", error);
      setWarningMessage("시간 제출 중 오류가 발생했습니다.");
      setShowWarning(true);
    }
  };

  const loadTeamAvailability = useCallback(async (teamId?: number) => {
    // teamId가 명시적으로 전달되면 그것을 사용, 아니면 currentTeamBoard 사용
    const targetTeamId = teamId ?? currentTeamBoard?.id;
    if (!targetTeamId) return;

    setIsTeamSlotsLoading(true);
    setTeamSlotsError("");

    try {
      const data = await getTeamCommonAvailability(targetTeamId);
      if ("error" in data) {
        throw data.error;
      }

      setTeamMemberAvailabilities(data.members || []);
      setTeamSize(data.team_size ?? data.members?.length ?? 0);
      // teamId가 명시적으로 전달된 경우 해당 팀의 이름 사용
      if (teamId && currentTeamBoard?.id === teamId) {
        setTeamModalName(data.team_board_name ?? currentTeamBoard.team_board_name ?? null);
      } else if (currentTeamBoard) {
        setTeamModalName(data.team_board_name ?? currentTeamBoard.team_board_name ?? null);
      } else {
        setTeamModalName(data.team_board_name ?? null);
      }
    } catch (err) {
      console.error("팀 가능 시간 조회 실패:", err);
      setTeamMemberAvailabilities([]);
      setTeamSize(0);
      if (currentTeamBoard) {
        setTeamModalName(currentTeamBoard.team_board_name ?? null);
      }
      setTeamSlotsError("팀원의 가능한 시간을 불러오는 데 실패했습니다.");
    } finally {
      setIsTeamSlotsLoading(false);
    }
  }, [currentTeamBoard]);

  const handleOpenAvailableTimeModal = async () => {
    if (!currentTeamBoard) return;

    // 대시보드 시간(연동) + 해당 팀에 추가한 시간을 합쳐서 불러오기
    try {
      // 1. 대시보드 시간 불러오기 (team_id 없이)
      const dashboardTimes = await getMyAvailableTimes(null);
      const formattedDashboardTimes: AvailableTime[] = dashboardTimes.map((time: any) => ({
        id: `dashboard-${time.id}`, // 대시보드 시간임을 구분하기 위한 prefix
        day: time.day_of_week,
        startTime: time.start_time,
        endTime: time.end_time,
        source: 'dashboard' as const
      }));

      // 2. 해당 팀에 추가한 시간 불러오기
      const teamTimes = await getMyAvailableTimes(currentTeamBoard.id);
      const formattedTeamTimes: AvailableTime[] = teamTimes.map((time: any) => ({
        id: `team-${time.id}`, // 팀 시간임을 구분하기 위한 prefix
        day: time.day_of_week,
        startTime: time.start_time,
        endTime: time.end_time,
        source: 'team' as const,
        teamTimeId: time.id // 서버 ID 저장 (삭제 시 사용)
      }));

      // 3. 두 시간을 합치기
      setMyAvailableTimes([...formattedDashboardTimes, ...formattedTeamTimes]);
      
      // 해당 팀에 제출한 시간이 있는지 확인 (팀 시간이 하나라도 있으면 제출한 것으로 간주)
      const hasTeamTimes = formattedTeamTimes.length > 0;
      setTeamSubmittedMap(prev => {
        const newMap = new Map(prev);
        newMap.set(currentTeamBoard.id, hasTeamTimes);
        return newMap;
      });
      
      // 이전에 제출한 적이 있으면 결과 뷰로 시작, 없으면 입력 뷰로 시작
      // teamSubmittedMap에 저장된 값도 확인 (이전에 제출한 적이 있는지)
      const hasSubmittedBefore = teamSubmittedMap.get(currentTeamBoard.id) || hasTeamTimes;
      setIsResultView(hasSubmittedBefore);
    } catch (error) {
      console.error("시간 불러오기 실패:", error);
      setMyAvailableTimes([]);
      setIsResultView(false);
    }
    
    setTeamSlotsError("");
    setTeamModalName(currentTeamBoard.team_board_name ?? null);
    
    // 모달을 열기 전에 해당 팀의 데이터를 명시적으로 불러오기
    await loadTeamAvailability(currentTeamBoard.id);
    
    setIsAvailableTimeModalOpen(true);
  };

  const DAY_MAP: Record<string, number> = {
    "월요일": 0, "화요일": 1, "수요일": 2, "목요일": 3, "금요일": 4, "토요일": 5, "일요일": 6
  };
  const parseTimeMinutes = (value?: string): number | null => {
    if (!value) return null;
    const [hourStr, minuteStr] = value.split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  };

  type TimeEntry = AvailableTime | TeamMemberTime;

  const getSlotKey = (dayIndex: number, minutes: number) => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${dayIndex}-${hour}-${minute}`;
  };

  const getHourSlotKeys = (dayIndex: number, hour: number) => {
    const baseMinutes = hour * 60;
    return Array.from({ length: SLOTS_PER_HOUR }, (_, idx) =>
      getSlotKey(dayIndex, baseMinutes + idx * SLOT_INTERVAL_MINUTES)
    );
  };

  const convertToTimeSlots = (times: TimeEntry[]): Set<string> => {
    const slots = new Set<string>();

    times.forEach(time => {
      const dayName = "day" in time
        ? time.day
        : time.day_of_week;
      if (!dayName) return;
      const dayIndex = DAY_MAP[dayName];
      if (dayIndex === undefined) return;

      const startMinutes = "startTime" in time ? parseTimeMinutes(time.startTime) : parseTimeMinutes(time.start_time);
      const endMinutes = "endTime" in time ? parseTimeMinutes(time.endTime) : parseTimeMinutes(time.end_time);
      if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        return;
      }

      for (let minutes = startMinutes; minutes < endMinutes; minutes += SLOT_INTERVAL_MINUTES) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        slots.add(`${dayIndex}-${hour}-${minute}`);
      }
    });

    return slots;
  };

  const teamMemberSlotSets = useMemo(() => {
    return teamMemberAvailabilities
      .filter(member => member.user_id !== user?.id)
      .map(member => convertToTimeSlots(member.times));
  }, [teamMemberAvailabilities, user?.id]);

  const mySlotSet = useMemo(() => convertToTimeSlots(myAvailableTimes), [myAvailableTimes]);

  const combinedSlotSets = useMemo(() => {
    const sets = [...teamMemberSlotSets];
    sets.push(mySlotSet);
    return sets;
  }, [teamMemberSlotSets, mySlotSet]);

  const slotCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    combinedSlotSets.forEach(set => {
      set.forEach(slot => {
        counts[slot] = (counts[slot] || 0) + 1;
      });
    });
    return counts;
  }, [combinedSlotSets]);

  const optimalSlots = useMemo(() => {
    if (combinedSlotSets.length === 0) {
      return new Set<string>();
    }
    if (combinedSlotSets.some((set) => set.size === 0)) {
      return new Set<string>();
    }

    const sortedSets = [...combinedSlotSets].sort((a, b) => a.size - b.size);
    const [base, ...rest] = sortedSets;
    const optimal = new Set<string>();
    base.forEach((slot) => {
      if (rest.every((slots) => slots.has(slot))) {
        optimal.add(slot);
      }
    });

    return optimal;
  }, [combinedSlotSets]);

  const optimalDurationMinutes = useMemo(() => optimalSlots.size * SLOT_INTERVAL_MINUTES, [optimalSlots]);
  const formatDurationLabel = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  // 모집 참여/취소 핸들러
  const handleJoinRecruitment = async (recruitmentId: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const recruitment = recruitments.find(r => r.id === recruitmentId);
    const isCurrentlyJoined = recruitment?.isJoined;
    
    // 팀 게시판이 활성화된 경우 참여 취소 불가
    if (isCurrentlyJoined && recruitment?.is_board_activated) {
      setWarningMessage("팀 게시판이 활성화되어 참여 취소할 수 없습니다.");
      setShowWarning(true);
      return;
    }

    // 참여 취소인 경우 확인 다이얼로그 표시
    if (isCurrentlyJoined) {
      setConfirmMessage("참여를 취소하시겠습니까?");
      setConfirmCallback(() => async () => {
        try {
          const res = await toggleRecruitmentJoin(recruitmentId);
          const r = res.recruitment;

          setRecruitments(prev =>
            prev.map(rec =>
              rec.id === recruitmentId
                ? {
                    ...rec,
                    maxMembers: r.max_members,
                    currentMembers: r.current_members,
                    membersList: r.members_list || [],
                    members: r.members || [],
                    isJoined: r.is_joined,
                  }
                : rec
            )
          );

          if (selectedRecruitment && selectedRecruitment.id === recruitmentId) {
            setSelectedRecruitment(prev =>
              prev
                ? {
                    ...prev,
                    maxMembers: r.max_members,
                    currentMembers: r.current_members,
                    membersList: r.members_list || [],
                    members: r.members || [],
                    isJoined: r.is_joined,
                  }
                : prev
            );
          }

          // 팀 게시판 목록도 최신 상태로 갱신 (참여 취소 시 팀 게시판 숨김)
          loadTeamBoards();
          
          // 알림 새로고침 트리거 (다른 사용자들에게도 알림 업데이트)
          notifyNotificationUpdated({ type: 'new' });
        } catch (err) {
          console.error("모집 참여/취소 실패:", err);
          setWarningMessage("모집 참여/취소 중 오류가 발생했습니다.");
          setShowWarning(true);
        }
      });
      setShowConfirm(true);
      return;
    }

    // 참여하는 경우는 바로 실행
    try {
      const res = await toggleRecruitmentJoin(recruitmentId);
      const r = res.recruitment;

      setRecruitments(prev =>
        prev.map(rec =>
          rec.id === recruitmentId
            ? {
                ...rec,
                maxMembers: r.max_members,
                currentMembers: r.current_members,
                membersList: r.members_list || [],
                members: r.members || [],
                isJoined: r.is_joined,
              }
            : rec
        )
      );

      if (selectedRecruitment && selectedRecruitment.id === recruitmentId) {
        setSelectedRecruitment(prev =>
          prev
            ? {
                ...prev,
                maxMembers: r.max_members,
                currentMembers: r.current_members,
                membersList: r.members_list || [],
                members: r.members || [],
                isJoined: r.is_joined,
              }
            : prev
        );
      }

      // 팀 게시판 목록도 최신 상태로 갱신 (참여 시 팀 게시판 즉시 노출)
      loadTeamBoards();
      
      // 알림 새로고침 트리거 (다른 사용자들에게도 알림 업데이트)
      notifyNotificationUpdated({ type: 'new' });
      
      // 알림 목록 새로고침
      loadNotifications();
    } catch (err) {
      console.error("모집 참여/취소 실패:", err);
      setWarningMessage("모집 참여/취소 중 오류가 발생했습니다.");
      setShowWarning(true);
    }
  };

  // 모집 생성 핸들러
  const handleCreateRecruitment = async () => {
    if (!newRecruitment.team_board_name?.trim()) {
      setWarningMessage("팀게시판 이름을 입력해주세요.");
      setShowWarning(true);
      return;
    }
    if (!newRecruitment.title.trim()) {
      setWarningMessage("제목을 입력해주세요.");
      setShowWarning(true);
      return;
    }
    if (!newRecruitment.description.trim()) {
      setWarningMessage("내용을 입력해주세요.");
      setShowWarning(true);
      return;
    }
    if (newRecruitment.maxMembers < 2) {
      setWarningMessage("인원수는 최소 2명 이상이어야 합니다.");
      setShowWarning(true);
      return;
    }

    try {
      const res = await createRecruitment(
        course.code,
        newRecruitment.title,
        newRecruitment.description,
        newRecruitment.team_board_name,
        newRecruitment.maxMembers
      );

      const r = res.recruitment;

      const recruitment: TeamRecruitment = {
        id: r.id,
        title: r.title,
        description: r.description,
        team_board_name: r.team_board_name || null,
        author: r.author,
        author_id: r.author_id,
        author_student_id: (user?.user_type === 'professor') ? null : (r.author_student_id || user?.student_id || null),
        is_professor: r.is_professor || (user?.user_type === 'professor') || false,
        timestamp: r.created_at,
        maxMembers: r.max_members,
        currentMembers: r.current_members,
        membersList: r.members_list || [],
        members: r.members || [],
        isJoined: r.is_joined,
        is_board_activated: r.is_board_activated || false,
      };

      setRecruitments(prev => [recruitment, ...prev]);
      setNewRecruitment({ team_board_name: "", title: "", description: "", maxMembers: 3 });
      setIsCreateRecruitmentOpen(false);
    } catch (err) {
      console.error("모집글 작성 실패:", err);
      setWarningMessage("모집글 작성 중 오류가 발생했습니다.");
      setShowWarning(true);
    }
  };

  // 모집 삭제 핸들러
  const handleDeleteRecruitment = async (recruitmentId: number) => {
    setConfirmMessage("이 모집글을 삭제하시겠습니까?");
    setConfirmCallback(() => async () => {
      try {
        await deleteRecruitment(recruitmentId);
        setRecruitments(prev => prev.filter(r => r.id !== recruitmentId));
        setSelectedRecruitment(null);
        setShowWarning(false);
        setWarningMessage("");
        setNotificationTargetCommentId(null);
      } catch (err) {
        console.error("모집글 삭제 실패:", err);
        setWarningMessage("모집글 삭제 중 오류가 발생했습니다.");
        setShowWarning(true);
      }
    });
    setShowConfirm(true);
  };

  // 팀 게시판 삭제 핸들러 (현재 사용되지 않음)
  // const handleDeleteTeamBoard = async (e: React.MouseEvent, boardId: number) => {
  //   e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
  //   setConfirmMessage("이 팀 게시판을 삭제하시겠습니까? (관련 게시글도 모두 삭제됩니다)");
  //   setConfirmCallback(() => async () => {
  //     try {
  //       await deleteRecruitment(boardId);
  //       setTeamBoards(prev => prev.filter(b => b.id !== boardId));
  //       if (selectedTeamBoard?.id === boardId) {
  //         setSelectedTeamBoard(null);
  //       }
  //       // 목록도 갱신
  //       await loadRecruitments();
  //     } catch (err) {
  //       console.error("팀 게시판 삭제 실패:", err);
  //       setWarningMessage("팀 게시판 삭제 중 오류가 발생했습니다.");
  //       setShowWarning(true);
  //     }
  //   });
  //   setShowConfirm(true);
  // };

  // 팀 게시판 활성화 핸들러
  const handleActivateTeamBoard = async (recruitmentId: number) => {
    setConfirmMessage("팀 게시판을 활성화하시겠습니까?\n 팀 게시판 활성화 시 자동으로 마감 처리됩니다.");
    setConfirmCallback(() => async () => {
      try {
        const res = await activateTeamBoard(recruitmentId);
        
        // 에러 응답 처리
        if (res.message && res.message.includes("이미 활성화")) {
          setWarningMessage(res.message);
          setShowWarning(true);
          return;
        }
        
        if (res.message && res.recruitment) {
          // SuccessAlert로 표시
          setSuccessMessage("팀 게시판이 활성화 되었습니다!");
          setShowSuccess(true);
          
          // 모집글 목록 업데이트 (서버에서 받은 최신 데이터로 업데이트)
          setRecruitments(prev =>
            prev.map(rec =>
              rec.id === recruitmentId
                ? {
                    ...rec,
                    is_board_activated: res.recruitment.is_board_activated || true,
                    maxMembers: res.recruitment.max_members || rec.maxMembers,
                    currentMembers: res.recruitment.current_members || rec.currentMembers,
                  }
                : rec
            )
          );
          
          // 상세 모달이 열려있으면 즉시 업데이트
          if (selectedRecruitment && selectedRecruitment.id === recruitmentId) {
            setSelectedRecruitment(prev =>
              prev
                ? {
                    ...prev,
                    is_board_activated: res.recruitment.is_board_activated || true,
                    maxMembers: res.recruitment.max_members || prev.maxMembers,
                    currentMembers: res.recruitment.current_members || prev.currentMembers,
                  }
                : prev
            );
          }
          
          // 게시글 목록, 모집글 목록, 팀 게시판 목록 새로고침
          await loadRecruitments();
          await loadTeamBoards();
          await loadPosts();
          
          // 알림 새로고침 트리거 (팀원 전체에게 실시간 알림)
          notifyNotificationUpdated({ type: 'new' });
          
          // 알림 목록 새로고침
          loadNotifications();
        } else if (res.message) {
          // 에러 메시지만 있는 경우
          setWarningMessage(res.message);
          setShowWarning(true);
        }
      } catch (err: any) {
        console.error("팀 게시판 활성화 실패:", err);
        const errorMessage = err.message || err.response?.data?.message || "팀 게시판 활성화 중 오류가 발생했습니다.";
        setWarningMessage(errorMessage);
        setShowWarning(true);
      }
    });
    setShowConfirm(true);
  };

  // 게시글 수정 핸들러
  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setEditPostTitle(post.title);
    setEditPostContent(post.content);
    setEditPostFiles(post.files ? post.files.map(f => ({
      ...f,
      preview: f.type === 'image' ? `http://127.0.0.1:5000${f.url}` : undefined
    })) : []);
    setEditPostPoll(post.poll ? { ...post.poll } : null);
    setIsEditPostOpen(true);
    setSelectedPost(null); // 상세 모달 닫기
  };

  const handleUpdatePost = async () => {
    if (!editingPost) return;
    
    if (!editPostTitle.trim() || !editPostContent.trim()) {
      setWarningMessage("제목과 내용을 입력해주세요.");
      setShowWarning(true);
      return;
    }

    // 투표 검증
    if (editPostPoll) {
      if (!editPostPoll.question.trim()) {
        setWarningMessage("투표 질문을 입력해주세요.");
        setShowWarning(true);
        return;
      }
      const validOptions = editPostPoll.options.filter(opt => opt.text.trim());
      if (validOptions.length < 2) {
        setWarningMessage("투표 옵션은 최소 2개 이상 필요합니다.");
        setShowWarning(true);
        return;
      }
    }

    try {
      // 파일 정보 준비
      const filesData = editPostFiles.map(f => ({
        filename: f.filename,
        original_name: f.original_name,
        type: f.type,
        size: f.size,
        url: f.url
      }));

      // 투표 정보 준비 (유효한 옵션만)
      const pollData = editPostPoll ? {
        question: editPostPoll.question,
        options: editPostPoll.options.filter(opt => opt.text.trim()).map(opt => ({ text: opt.text })),
        expires_at: editPostPoll.expires_at || null
      } : null;

      // 서버에 수정 요청 보내기
      const res = await updateBoardPost(
        editingPost.id,
        editPostTitle,
        editPostContent,
        filesData,
        pollData
      );

      // 에러 응답 확인
      if (res.message && (res.message.includes("오류") || res.message.includes("실패"))) {
        setWarningMessage(res.message || "게시글 수정 중 오류가 발생했습니다.");
        setShowWarning(true);
        return;
      }

      if (!res.post) {
        setWarningMessage("게시글 수정 응답이 올바르지 않습니다.");
        setShowWarning(true);
        return;
      }

      const p = res.post;

      // 서버에서 돌아온 데이터 → 화면에서 쓰는 Post 타입으로 변환
      const updatedPost: Post = {
        id: p.id,
        title: p.title,
        content: p.content,
        author: p.author || editingPost.author,
        author_id: p.author_id || editingPost.author_id,
        author_student_id: p.author_student_id || editingPost.author_student_id || null,
        is_professor: p.is_professor || editingPost.is_professor || false,
        timestamp: p.created_at || editingPost.timestamp,
        category: categoryToTabName(p.category) || editingPost.category,
        originalCategory: p.category || editingPost.originalCategory,  // 원본 카테고리 저장
        tags: [],
        likes: p.likes || editingPost.likes,
        comments: editingPost.comments || [],
        comments_count: editingPost.comments_count || 0,
        isPinned: p.is_pinned !== undefined ? p.is_pinned : editingPost.isPinned,
        isLiked: p.is_liked !== undefined ? p.is_liked : editingPost.isLiked,
        files: p.files || [],
        team_board_name: p.team_board_name || editingPost.team_board_name || null,
        poll: p.poll || editPostPoll || editingPost.poll || null,
      };

      // 목록 업데이트
      setPosts((prev) =>
        prev.map((post) => (post.id === editingPost.id ? updatedPost : post))
      );

      // 상세 모달이 열려있으면 업데이트
      if (selectedPost && selectedPost.id === editingPost.id) {
        setSelectedPost(updatedPost);
      }

      // 폼 초기화 & 모달 닫기
      setEditPostTitle("");
      setEditPostContent("");
      setEditPostFiles([]);
      setEditPostPoll(null);
      setEditingPost(null);
      setIsEditPostOpen(false);
      
      // 성공 메시지 표시
      setSuccessMessage("게시글이 수정되었습니다.");
      setShowSuccess(true);
    } catch (err: any) {
      console.error("게시글 수정 실패:", err);
      const errorMessage = err.message || err.response?.data?.message || "게시글 수정 중 오류가 발생했습니다.";
      setWarningMessage(errorMessage);
      setShowWarning(true);
    }
  };

  // 게시글 삭제 핸들러
  const handleDeletePost = async (postId: number) => {
    setConfirmMessage("이 게시글을 삭제하시겠습니까?");
    setConfirmCallback(() => async () => {
      try {
        await deleteBoardPost(postId);
        // 성공하면 프론트에서도 제거
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setSelectedPost(null);
        setShowWarning(false);
        setWarningMessage("");
        setNotificationTargetCommentId(null);
        setSuccessMessage("게시글이 삭제되었습니다.");
        setShowSuccess(true);
      } catch (err) {
        console.error("게시글 삭제 실패:", err);
        setWarningMessage("게시글 삭제 중 오류가 발생했습니다.");
        setShowWarning(true);
      }
    });
    setShowConfirm(true);
  };

  // 게시글 고정/고정 해제 핸들러
  const handleTogglePinPost = async (postId: number) => {
    try {
      const res = await togglePinPost(postId);
      // 성공하면 게시물 목록을 다시 불러와서 모든 고정 상태를 동기화
      await loadPosts();
      // 선택된 게시물도 업데이트
      if (selectedPost && selectedPost.id === postId) {
        const updatedPost = posts.find(p => p.id === postId);
        if (updatedPost) {
          setSelectedPost({ ...selectedPost, isPinned: updatedPost.isPinned });
        }
      }
      setSuccessMessage(res.is_pinned ? "게시글이 고정되었습니다." : "게시글 고정이 해제되었습니다.");
      setShowSuccess(true);
    } catch (err: any) {
      console.error("게시글 고정 실패:", err);
      const errorMessage = err.message || "게시글 고정 중 오류가 발생했습니다.";
      setWarningMessage(errorMessage);
      setShowWarning(true);
    }
  };

  return (
    <div className="course-board">
      {/* 헤더 */}
      <header className="course-board__header">
        <div className="course-board__header-left">
          <button className="course-board__back-button" onClick={onBack}>
            <Home size={18} />
          </button>
          <div className="course-board__course-info">
            <h1 className="course-board__course-title">
              {course.title} ({course.code})
            </h1>
          </div>
        </div>
        <div className="course-board__header-right">
          {/* 알림 버튼 */}
          <div className="course-board__notification-wrapper">
            <button
              className="course-board__icon-button"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="course-board__notification-badge">{unreadCount}</span>
              )}
            </button>

            {/* 알림 드롭다운 */}
            {isNotificationOpen && (
              <>
                <div
                  className="course-board__notification-overlay"
                  onClick={() => setIsNotificationOpen(false)}
                />
                <div className="course-board__notification-dropdown">
                  <div className="course-board__notification-header">
                    <h3>알림</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {notifications.some(n => !n.is_read) && (
                        <button 
                          onClick={async () => {
                            // 낙관적 업데이트: UI를 먼저 업데이트
                            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                            
                            // 다른 페이지에도 알림 (즉시 동기화)
                            notifyNotificationUpdated({ type: 'read-all' });
                            
                            try {
                              await markAllAsRead();
                            } catch (err) {
                              console.error("모두 읽음 처리 실패:", err);
                              // 실패 시 원래대로 복구
                              loadNotifications();
                            }
                          }}
                          style={{
                            fontSize: '12px',
                            color: '#a855f7',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background 0.2s',
                            width: 'auto',
                            height: 'auto',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          모두 읽음
                        </button>
                      )}
                      <button onClick={() => setIsNotificationOpen(false)}>
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="course-board__notification-list">
                    {notifications.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                        알림이 없습니다
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const Icon = getNotificationIcon(notif.type);
                        return (
                          <div
                            key={notif.id}
                            className={`course-board__notification-item ${!notif.is_read ? 'course-board__notification-item--unread' : ''}`}
                            onClick={() => handleNotificationClick(notif)}
                            style={{ cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
                          >
                            <div style={{ 
                              background: !notif.is_read ? '#f3f4f6' : '#fff',
                              borderRadius: '50%',
                              padding: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Icon size={18} style={{ color: !notif.is_read ? '#a855f7' : '#9ca3af' }} />
                            </div>
                            <div className="course-board__notification-content" style={{ flex: 1 }}>
                              <p>{formatNotificationContent(notif.content)}</p>
                              <span className="course-board__notification-time">{getRelativeTime(notif.created_at)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>



          {/* 프로필 버튼 */}
          <button
            className="course-board__profile-button"
            onClick={() => {
              // courseboard에서 온 경우를 표시하기 위해 localStorage에 저장
              localStorage.setItem('returnToCourseboard', JSON.stringify({
                courseId: course.id,
                courseTitle: course.title,
                courseCode: course.code
              }));
              onNavigate('mypage');
            }}
            style={
              profileImage && profileImage.startsWith('color:') 
                ? { background: profileImage.replace('color:', ''), padding: 0 } 
                : profileImage 
                  ? { background: 'transparent', padding: 0 } 
                  : {}
            }
          >
            {profileImage ? (
              profileImage.startsWith('color:') ? (
                <User size={20} color="white" />
              ) : (
                <img 
                  src={profileImage} 
                  alt="프로필" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover', 
                    borderRadius: '50%' 
                  }} 
                />
              )
            ) : (
              <User size={20} />
            )}
          </button>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="course-board__tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`course-board__tab ${activeTab === tab.name ? "course-board__tab--active" : ""}`}
              onClick={() => {
                setActiveTab(tab.name);
                // 팀 게시판 탭이 아닌 경우 selectedTeamBoard 초기화
                if (!tab.name.startsWith("팀 게시판:")) {
                  setSelectedTeamBoard(null);
                }
              }}
            >
              <Icon size={16} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="course-board__content">
        {/* 메인 게시판 영역 */}
        <main className="course-board__main course-board__main--full">
          {/* 검색 */}
          <div className="course-board__toolbar">
            <div className="course-board__search">
              <Search size={18} />
              <input
                type="text"
                placeholder="검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {activeTab.startsWith("팀 게시판:") && currentTeamBoard && (
              <button
                className="course-board__available-time-button"
                onClick={handleOpenAvailableTimeModal}
              >
                <Clock size={18} />
                가능한 시간
              </button>
            )}
          </div>

          {/* 게시글 목록 또는 모집 카드 또는 팀 게시판 목록 */}
          {activeTab === "모집" ? (
            /* 모집 카드 */
            <div className="recruitment-cards">
              <div className="course-board__posts-header">
                {sortedRecruitments.length}개의 모집
              </div>
              <div className="recruitment-cards__grid">
                {sortedRecruitments.map((recruitment) => {
                  const isFull = recruitment.currentMembers >= recruitment.maxMembers;
                  return (
                    <div
                      key={recruitment.id}
                      className="recruitment-card"
                      onClick={() => setSelectedRecruitment(recruitment)}
                    >
                      <div className="recruitment-card__header">
                        <h3 className="recruitment-card__title">{recruitment.title}</h3>
                        <div className="recruitment-card__author">
                          <div style={{ 
                            width: '16px', 
                            height: '16px', 
                            borderRadius: '50%', 
                            overflow: 'hidden', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            background: recruitment.author_profile_image && recruitment.author_profile_image.startsWith('color:') 
                              ? recruitment.author_profile_image.replace('color:', '')
                              : recruitment.author_profile_image 
                                ? 'transparent' 
                                : '#e5e7eb'
                          }}>
                            {renderProfileAvatar(recruitment.author_id, recruitment.author_profile_image ?? null, 16)}
                          </div>
                          <div className="recruitment-card__author-text">
                            <span className="recruitment-card__author-name">{recruitment.author}</span>
                            {recruitment.author_student_id && (
                              <span className="recruitment-card__author-id">{recruitment.author_student_id}</span>
                            )}
                            {recruitment.is_professor && (
                              <span className="recruitment-card__author-professor">교수</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="recruitment-card__content">
                        <p className="recruitment-card__description">{recruitment.description}</p>
                      </div>

                      <div className="recruitment-card__footer">
                        <div className="recruitment-card__members">
                          <Users size={18} />
                          <span className={isFull || recruitment.is_board_activated ? "recruitment-card__members-full" : ""}>
                            {recruitment.currentMembers} / {recruitment.maxMembers}명
                          </span>
                          {(isFull || recruitment.is_board_activated) && <span className="recruitment-card__full-badge">마감</span>}
                        </div>

                        {recruitment.author_id !== user?.id ? (
                          <button
                            className={`recruitment-card__join-button ${recruitment.isJoined ? "recruitment-card__join-button--joined" : ""
                              } ${(isFull && !recruitment.isJoined) || recruitment.is_board_activated || (recruitment.isJoined && recruitment.is_board_activated) ? "recruitment-card__join-button--disabled" : ""}`}
                            onClick={(e) => handleJoinRecruitment(recruitment.id, e)}
                            disabled={(isFull && !recruitment.isJoined) || recruitment.is_board_activated || (recruitment.isJoined && recruitment.is_board_activated)}
                          >
                            {recruitment.is_board_activated 
                              ? (recruitment.isJoined ? "참여중" : "마감")
                              : recruitment.isJoined 
                                ? "참여 취소" 
                                : isFull 
                                  ? "마감" 
                                  : "참여하기"}
                          </button>
                        ) : (
                          <div style={{ minWidth: '100px', flexShrink: 0 }}></div>
                        )}
                      </div>

                      <div className="recruitment-card__timestamp">{recruitment.timestamp}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* 일반 게시글 목록 */
            <div className="course-board__posts">
              <div className="course-board__posts-header">
                {filteredPosts.length}개의 글
              </div>
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="course-board__post"
                  onClick={() => handlePostClick(post)}
                >
                  <div className="course-board__post-header">
                    <div className="course-board__post-author">
                      <div 
                        className="course-board__post-avatar"
                        style={
                          profileImage && post.author_id === user?.id
                            ? (profileImage.startsWith('color:') 
                                ? { background: profileImage.replace('color:', '') }
                                : { background: 'transparent' })
                            : post.author_profile_image && post.author_profile_image.startsWith('color:')
                              ? { background: post.author_profile_image.replace('color:', '') }
                              : post.author_profile_image
                                ? { background: 'transparent' }
                                : {}
                        }
                      >
                        {renderProfileAvatar(post.author_id, post.author_profile_image, 20)}
                      </div>
                      <div className="course-board__post-meta">
                        <div className="course-board__post-author-row">
                          <span className="course-board__post-author-name">{post.author}</span>
                          {post.author_student_id && (
                            <span className="course-board__post-author-id">{post.author_student_id}</span>
                          )}
                          {post.is_professor && (
                            <span className="course-board__post-author-professor">교수</span>
                          )}
                        </div>
                        <span className="course-board__post-timestamp">{post.timestamp}</span>
                      </div>
                    </div>
                    {post.isPinned && (
                      <div className="course-board__post-pinned">
                        <Pin size={14} />
                      </div>
                    )}
                  </div>

                  <div className="course-board__post-content">
                    <h3 className="course-board__post-title">
                      {post.title}
                      {post.title.includes("🤖 자동 추천:") && (
                        <span className="course-board__post-auto-badge" title="자동 추천 게시글">
                          🤖 자동 추천
                        </span>
                      )}
                      {post.poll && (
                        <span className="course-board__post-poll-badge" title="투표가 있는 게시글">
                          <BarChart3 size={14} />
                        </span>
                      )}
                    </h3>
                    <p className="course-board__post-preview">{post.content}</p>
                    {post.poll && (
                      <div className="course-board__post-poll-preview">
                        <BarChart3 size={14} />
                        <span>{post.poll.question}</span>
                        {post.poll.total_votes && post.poll.total_votes > 0 && (
                          <span className="course-board__post-poll-count">{post.poll.total_votes}명 투표</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="course-board__post-footer">
                    <div className="course-board__post-actions">
                      <button
                        className="course-board__post-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikePost(post.id);
                        }}
                      >
                        <Heart size={14} fill={post.isLiked ? "currentColor" : "none"} />
                        <span>좋아요 {post.likes}</span>
                      </button>
                      <button className="course-board__post-action">
                        <MessageCircle size={14} />
                        <span>댓글 {post.comments_count || 0}</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

        </main>
      </div>

      {/* 플로팅 게시글 작성 버튼 */}
      {!(activeTab === "공지" && user?.user_type === "student") && (
        <button
          className="course-board__floating-add-button"
          onClick={() => activeTab === "모집" ? setIsCreateRecruitmentOpen(true) : setIsCreatePostOpen(true)}
          aria-label={activeTab === "모집" ? "모집 작성" : "게시글 작성"}
        >
          <Plus size={24} />
        </button>
      )}

      {/* 게시글 작성 모달 */}
      {isCreatePostOpen && (
        <div className="course-board__modal-overlay">
          <div className="course-board__modal" onClick={(e) => e.stopPropagation()}>
            <div className="course-board__modal-header">
              <h2>게시글 작성</h2>
              <button onClick={() => {
                setPostFiles([]);
                setNewPostPoll(null);
                setIsCreatePostOpen(false);
              }}>
                <X size={20} />
              </button>
            </div>
            <div className="course-board__modal-body">
              <input
                type="text"
                placeholder="제목을 입력하세요"
                className="course-board__modal-input"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
              />
              <textarea
                placeholder="내용을 입력하세요"
                className="course-board__modal-textarea"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={10}
              />
              
              {/* 파일 업로드 영역 */}
              <div 
                className={`course-board__file-upload-area ${isDragging ? 'course-board__file-upload-area--dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, false)}
              >
                <div className="course-board__file-upload-buttons">
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e, 'image', false)}
                    multiple
                  />
                  <input
                    type="file"
                    id="video-upload"
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e, 'video', false)}
                    multiple
                  />
                  <input
                    type="file"
                    id="file-upload"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e, 'file', false)}
                    multiple
                  />
                  
                  <button
                    type="button"
                    className="course-board__file-upload-button"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    title="사진 추가"
                  >
                    <Image size={20} />
                    <span>사진</span>
                  </button>
                  <button
                    type="button"
                    className="course-board__file-upload-button"
                    onClick={() => document.getElementById('video-upload')?.click()}
                    title="동영상 추가"
                  >
                    <Video size={20} />
                    <span>동영상</span>
                  </button>
                  <button
                    type="button"
                    className="course-board__file-upload-button"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    title="파일 추가"
                  >
                    <File size={20} />
                    <span>파일</span>
                  </button>
                  <button
                    type="button"
                    className={`course-board__file-upload-button ${newPostPoll ? 'course-board__file-upload-button--active' : ''}`}
                    onClick={() => {
                      if (!newPostPoll) {
                        setNewPostPoll({
                          question: "",
                          options: [
                            { text: "", votes: 0 },
                            { text: "", votes: 0 }
                          ],
                          total_votes: 0
                        });
                      } else {
                        setNewPostPoll(null);
                      }
                    }}
                    title="투표 추가"
                  >
                    <BarChart3 size={20} />
                    <span>투표</span>
                  </button>
                </div>
              </div>

              {/* 업로드된 파일 미리보기 */}
              {postFiles.length > 0 && (
                <div className="course-board__file-preview-list">
                  {postFiles.map((file, index) => (
                    <div key={index} className="course-board__file-preview-item">
                      {file.type === 'image' && file.preview && (
                        <img 
                          src={file.preview} 
                          alt={file.original_name}
                          className="course-board__file-preview-image"
                        />
                      )}
                      {file.type === 'video' && (
                        <div className="course-board__file-preview-video">
                          <Video size={24} />
                        </div>
                      )}
                      {file.type === 'file' && (
                        <div className="course-board__file-preview-file">
                          <File size={24} />
                        </div>
                      )}
                      <div className="course-board__file-preview-info">
                        <span className="course-board__file-preview-name">{file.original_name}</span>
                        <span className="course-board__file-preview-size">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <button
                        type="button"
                        className="course-board__file-preview-remove"
                        onClick={() => handleRemoveFile(index)}
                        title="삭제"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 투표 설정 UI */}
              {newPostPoll && (
                <div className="course-board__poll-editor">
                  <div className="course-board__poll-editor-header">
                    <h4>투표 추가</h4>
                    <button
                      type="button"
                      className="course-board__poll-editor-remove"
                      onClick={() => setNewPostPoll(null)}
                      title="투표 제거"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="투표 질문을 입력하세요"
                    className="course-board__poll-question-input"
                    value={newPostPoll.question}
                    onChange={(e) => setNewPostPoll({
                      ...newPostPoll,
                      question: e.target.value
                    })}
                  />
                  <div className="course-board__poll-options">
                    {newPostPoll.options.map((option, index) => (
                      <div key={index} className="course-board__poll-option-input-wrapper">
                        <input
                          type="text"
                          placeholder={`옵션 ${index + 1}`}
                          className="course-board__poll-option-input"
                          value={option.text}
                          onChange={(e) => {
                            const newOptions = [...newPostPoll.options];
                            newOptions[index] = { ...option, text: e.target.value };
                            setNewPostPoll({ ...newPostPoll, options: newOptions });
                          }}
                        />
                        {newPostPoll.options.length > 2 && (
                          <button
                            type="button"
                            className="course-board__poll-option-remove"
                            onClick={() => {
                              const newOptions = newPostPoll.options.filter((_, i) => i !== index);
                              setNewPostPoll({ ...newPostPoll, options: newOptions });
                            }}
                            title="옵션 제거"
                          >
                            <Minus size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    {newPostPoll.options.length < 10 && (
                      <button
                        type="button"
                        className="course-board__poll-add-option"
                        onClick={() => {
                          setNewPostPoll({
                            ...newPostPoll,
                            options: [...newPostPoll.options, { text: "", votes: 0 }]
                          });
                        }}
                      >
                        <Plus size={16} />
                        <span>옵션 추가</span>
                      </button>
                    )}
                  </div>
                  
                  {/* 마감 날짜 및 시간 설정 */}
                  <div className="course-board__poll-deadline">
                    <label className="course-board__poll-deadline-label">
                      <Clock size={16} />
                      <span>마감 날짜 및 시간</span>
                    </label>
                    <div className="course-board__poll-deadline-inputs">
                      <input
                        type="date"
                        className="course-board__poll-deadline-date"
                        value={newPostPoll.expires_at ? newPostPoll.expires_at.split('T')[0] : ''}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => {
                          const selectedDate = e.target.value;
                          if (selectedDate) {
                            const currentTime = newPostPoll.expires_at 
                              ? newPostPoll.expires_at.split('T')[1]?.split(':')[0] || '23'
                              : '23';
                            setNewPostPoll({
                              ...newPostPoll,
                              expires_at: `${selectedDate}T${currentTime}:00:00`
                            });
                          } else {
                            setNewPostPoll({
                              ...newPostPoll,
                              expires_at: null
                            });
                          }
                        }}
                      />
                      <select
                        className="course-board__poll-deadline-time"
                        value={newPostPoll.expires_at ? newPostPoll.expires_at.split('T')[1]?.split(':')[0] || '23' : ''}
                        onChange={(e) => {
                          const selectedTime = e.target.value;
                          if (selectedTime) {
                            const currentDate = newPostPoll.expires_at 
                              ? newPostPoll.expires_at.split('T')[0] 
                              : new Date().toISOString().split('T')[0];
                            setNewPostPoll({
                              ...newPostPoll,
                              expires_at: `${currentDate}T${selectedTime}:00:00`
                            });
                          }
                        }}
                      >
                        <option value="">시간 선택</option>
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={String(i).padStart(2, '0')}>
                            {i}시
                          </option>
                        ))}
                      </select>
                      {(newPostPoll.expires_at || '').includes('T') && (
                        <button
                          type="button"
                          className="course-board__poll-deadline-remove"
                          onClick={() => {
                            setNewPostPoll({
                              ...newPostPoll,
                              expires_at: null
                            });
                          }}
                          title="마감 시간 제거"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="course-board__modal-footer">
              <button
                className="course-board__modal-button course-board__modal-button--cancel"
                onClick={() => {
                  setPostFiles([]);
                  setNewPostPoll(null);
                  setIsCreatePostOpen(false);
                }}
              >
                취소
              </button>
              <button
                className="course-board__modal-button course-board__modal-button--submit"
                onClick={handleCreatePost}
              >
                작성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게시글 수정 모달 */}
      {isEditPostOpen && editingPost && (
        <div className="course-board__modal-overlay">
          <div className="course-board__modal" onClick={(e) => e.stopPropagation()}>
            <div className="course-board__modal-header">
              <h2>게시글 수정</h2>
              <button onClick={() => {
                setEditPostFiles([]);
                setIsEditPostOpen(false);
                setEditingPost(null);
              }}>
                <X size={20} />
              </button>
            </div>
            <div className="course-board__modal-body">
              <input
                type="text"
                placeholder="제목을 입력하세요"
                className="course-board__modal-input"
                value={editPostTitle}
                onChange={(e) => setEditPostTitle(e.target.value)}
              />
              <textarea
                placeholder="내용을 입력하세요"
                className="course-board__modal-textarea"
                value={editPostContent}
                onChange={(e) => setEditPostContent(e.target.value)}
                rows={10}
              />
              
              {/* 파일 업로드 영역 */}
              <div 
                className={`course-board__file-upload-area ${isDragging ? 'course-board__file-upload-area--dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, true)}
              >
                <div className="course-board__file-upload-buttons">
                  <input
                    type="file"
                    id="image-upload-edit"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e, 'image', true)}
                    multiple
                  />
                  <input
                    type="file"
                    id="video-upload-edit"
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e, 'video', true)}
                    multiple
                  />
                  <input
                    type="file"
                    id="file-upload-edit"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e, 'file', true)}
                    multiple
                  />
                  
                  <button
                    type="button"
                    className="course-board__file-upload-button"
                    onClick={() => document.getElementById('image-upload-edit')?.click()}
                    title="사진 추가"
                  >
                    <Image size={20} />
                    <span>사진</span>
                  </button>
                  <button
                    type="button"
                    className="course-board__file-upload-button"
                    onClick={() => document.getElementById('video-upload-edit')?.click()}
                    title="동영상 추가"
                  >
                    <Video size={20} />
                    <span>동영상</span>
                  </button>
                  <button
                    type="button"
                    className="course-board__file-upload-button"
                    onClick={() => document.getElementById('file-upload-edit')?.click()}
                    title="파일 추가"
                  >
                    <File size={20} />
                    <span>파일</span>
                  </button>
                  <button
                    type="button"
                    className={`course-board__file-upload-button ${editPostPoll ? 'course-board__file-upload-button--active' : ''}`}
                    onClick={() => {
                      if (!editPostPoll) {
                        setEditPostPoll({
                          question: "",
                          options: [
                            { text: "", votes: 0 },
                            { text: "", votes: 0 }
                          ],
                          total_votes: 0
                        });
                      } else {
                        setEditPostPoll(null);
                      }
                    }}
                    title="투표 추가"
                  >
                    <BarChart3 size={20} />
                    <span>투표</span>
                  </button>
                </div>
              </div>

              {/* 업로드된 파일 미리보기 */}
              {editPostFiles.length > 0 && (
                <div className="course-board__file-preview-list">
                  {editPostFiles.map((file, index) => (
                    <div key={index} className="course-board__file-preview-item">
                      {file.type === 'image' && (file.preview || file.url) && (
                        <img 
                          src={file.preview || `http://127.0.0.1:5000${file.url}`} 
                          alt={file.original_name}
                          className="course-board__file-preview-image"
                        />
                      )}
                      {file.type === 'video' && (
                        <div className="course-board__file-preview-video">
                          <Video size={24} />
                        </div>
                      )}
                      {file.type === 'file' && (
                        <div className="course-board__file-preview-file">
                          <File size={24} />
                        </div>
                      )}
                      <div className="course-board__file-preview-info">
                        <span className="course-board__file-preview-name">{file.original_name}</span>
                        <span className="course-board__file-preview-size">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <button
                        type="button"
                        className="course-board__file-preview-remove"
                        onClick={() => {
                          setEditPostFiles(prev => {
                            const newFiles = [...prev];
                            if (newFiles[index].preview && newFiles[index].preview?.startsWith('blob:')) {
                              URL.revokeObjectURL(newFiles[index].preview!);
                            }
                            newFiles.splice(index, 1);
                            return newFiles;
                          });
                        }}
                        title="삭제"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 투표 설정 UI (수정 모달) */}
              {editPostPoll && (
                <div className="course-board__poll-editor">
                  <div className="course-board__poll-editor-header">
                    <h4>투표 수정</h4>
                    <button
                      type="button"
                      className="course-board__poll-editor-remove"
                      onClick={() => setEditPostPoll(null)}
                      title="투표 제거"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="투표 질문을 입력하세요"
                    className="course-board__poll-question-input"
                    value={editPostPoll.question}
                    onChange={(e) => setEditPostPoll({
                      ...editPostPoll,
                      question: e.target.value
                    })}
                  />
                  <div className="course-board__poll-options">
                    {editPostPoll.options.map((option, index) => (
                      <div key={index} className="course-board__poll-option-input-wrapper">
                        <input
                          type="text"
                          placeholder={`옵션 ${index + 1}`}
                          className="course-board__poll-option-input"
                          value={option.text}
                          onChange={(e) => {
                            const newOptions = [...editPostPoll.options];
                            newOptions[index] = { ...option, text: e.target.value };
                            setEditPostPoll({ ...editPostPoll, options: newOptions });
                          }}
                        />
                        {editPostPoll.options.length > 2 && (
                          <button
                            type="button"
                            className="course-board__poll-option-remove"
                            onClick={() => {
                              const newOptions = editPostPoll.options.filter((_, i) => i !== index);
                              setEditPostPoll({ ...editPostPoll, options: newOptions });
                            }}
                            title="옵션 제거"
                          >
                            <Minus size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    {editPostPoll.options.length < 10 && (
                      <button
                        type="button"
                        className="course-board__poll-add-option"
                        onClick={() => {
                          setEditPostPoll({
                            ...editPostPoll,
                            options: [...editPostPoll.options, { text: "", votes: 0 }]
                          });
                        }}
                      >
                        <Plus size={16} />
                        <span>옵션 추가</span>
                      </button>
                    )}
                  </div>
                  
                  {/* 마감 날짜 및 시간 설정 (수정 모달) */}
                  <div className="course-board__poll-deadline">
                    <label className="course-board__poll-deadline-label">
                      <Clock size={16} />
                      <span>마감 날짜 및 시간</span>
                    </label>
                    <div className="course-board__poll-deadline-inputs">
                      <input
                        type="date"
                        className="course-board__poll-deadline-date"
                        value={editPostPoll.expires_at ? editPostPoll.expires_at.split('T')[0] : ''}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => {
                          const selectedDate = e.target.value;
                          if (selectedDate) {
                            const currentTime = editPostPoll.expires_at 
                              ? editPostPoll.expires_at.split('T')[1]?.split(':')[0] || '23'
                              : '23';
                            setEditPostPoll({
                              ...editPostPoll,
                              expires_at: `${selectedDate}T${currentTime}:00:00`
                            });
                          } else {
                            setEditPostPoll({
                              ...editPostPoll,
                              expires_at: null
                            });
                          }
                        }}
                      />
                      <select
                        className="course-board__poll-deadline-time"
                        value={editPostPoll.expires_at ? editPostPoll.expires_at.split('T')[1]?.split(':')[0] || '23' : ''}
                        onChange={(e) => {
                          const selectedTime = e.target.value;
                          if (selectedTime) {
                            const currentDate = editPostPoll.expires_at 
                              ? editPostPoll.expires_at.split('T')[0] 
                              : new Date().toISOString().split('T')[0];
                            setEditPostPoll({
                              ...editPostPoll,
                              expires_at: `${currentDate}T${selectedTime}:00:00`
                            });
                          }
                        }}
                      >
                        <option value="">시간 선택</option>
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={String(i).padStart(2, '0')}>
                            {i}시
                          </option>
                        ))}
                      </select>
                      {(editPostPoll.expires_at || '').includes('T') && (
                        <button
                          type="button"
                          className="course-board__poll-deadline-remove"
                          onClick={() => {
                            setEditPostPoll({
                              ...editPostPoll,
                              expires_at: null
                            });
                          }}
                          title="마감 시간 제거"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="course-board__modal-footer">
              <button 
                className="course-board__modal-button course-board__modal-button--cancel"
                onClick={() => {
                  setEditPostFiles([]);
                  setEditPostPoll(null);
                  setIsEditPostOpen(false);
                  setEditingPost(null);
                }}
              >
                취소
              </button>
              <button 
                className="course-board__modal-button course-board__modal-button--submit"
                onClick={handleUpdatePost}
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게시글 상세보기 모달 */}
      {selectedPost && (
        <div className="course-board__modal-overlay">
          <div className="course-board__modal course-board__modal--large" onClick={(e) => e.stopPropagation()}>
            <div className="course-board__modal-header">
              <h2>게시글</h2>
              <button onClick={() => {
                setSelectedPost(null);
                setShowWarning(false);
                setWarningMessage("");
                setNotificationTargetCommentId(null);
              }}>
                <X size={20} />
              </button>
            </div>
            <div className="course-board__modal-body course-board__post-detail">
              {/* 게시글 헤더 */}
              <div className="course-board__detail-header">
                <div className="course-board__post-author">
                  <div 
                    className="course-board__post-avatar"
                    style={
                      profileImage && selectedPost.author_id === user?.id
                        ? (profileImage.startsWith('color:') 
                            ? { background: profileImage.replace('color:', '') }
                            : { background: 'transparent' })
                        : selectedPost.author_profile_image && selectedPost.author_profile_image.startsWith('color:')
                          ? { background: selectedPost.author_profile_image.replace('color:', '') }
                          : selectedPost.author_profile_image
                            ? { background: 'transparent' }
                            : {}
                    }
                  >
                    {renderProfileAvatar(selectedPost.author_id, selectedPost.author_profile_image, 24)}
                  </div>
                  <div className="course-board__post-meta">
                    <div className="course-board__post-author-row">
                      <span className="course-board__post-author-name">{selectedPost.author}</span>
                      {selectedPost.author_student_id && (
                        <span className="course-board__post-author-id">{selectedPost.author_student_id}</span>
                      )}
                      {selectedPost.is_professor && (
                        <span className="course-board__post-author-professor">교수</span>
                      )}
                    </div>
                    <span className="course-board__post-timestamp">{selectedPost.timestamp}</span>
                  </div>
                </div>
              </div>

              {/* 게시글 내용 */}
              <div className="course-board__detail-content">
                <h2>{selectedPost.title}</h2>
                <p>{selectedPost.content}</p>
                
                {/* 첨부 파일 표시 */}
                {selectedPost.files && selectedPost.files.length > 0 && (
                  <div className="course-board__post-files">
                    <h4 className="course-board__post-files-title">첨부 파일</h4>
                    <div className="course-board__post-files-list">
                      {selectedPost.files.map((file, index) => (
                        <div key={index} className="course-board__post-file-item">
                          {file.type === 'image' && (
                            <a 
                              href={`http://127.0.0.1:5000${file.url}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="course-board__post-file-link"
                            >
                              <img 
                                src={`http://127.0.0.1:5000${file.url}`} 
                                alt={file.original_name}
                                className="course-board__post-file-image"
                              />
                            </a>
                          )}
                          {file.type === 'video' && (
                            <div className="course-board__post-file-video-wrapper">
                              <video 
                                src={`http://127.0.0.1:5000${file.url}`}
                                controls
                                className="course-board__post-file-video"
                              />
                            </div>
                          )}
                          {file.type === 'file' && (
                            <a 
                              href={`http://127.0.0.1:5000${file.url}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="course-board__post-file-link"
                            >
                              <div className="course-board__post-file-download">
                                <File size={24} />
                                <span>{file.original_name}</span>
                                <span className="course-board__post-file-size">
                                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              </div>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 투표 표시 */}
                {selectedPost.poll && selectedPost.poll.question && (
                  <div className="course-board__poll-display">
                    <div className="course-board__poll-question">
                      <BarChart3 size={20} />
                      <h4>{selectedPost.poll.question}</h4>
                    </div>
                    <div className="course-board__poll-options-list">
                      {(selectedPost.poll.options || []).map((option, index) => {
                        const isSelected = selectedPost.poll?.user_vote === option.id;
                        const percentage = selectedPost.poll?.total_votes && selectedPost.poll.total_votes > 0
                          ? ((option.votes || 0) / selectedPost.poll.total_votes * 100).toFixed(1)
                          : 0;
                        const isExpired = Boolean(selectedPost.poll?.expires_at && new Date(selectedPost.poll.expires_at) <= new Date());
                        
                        const hasVotes = (option.votes || 0) > 0;
                        const showResults = selectedPost.poll?.total_votes && selectedPost.poll.total_votes > 0;
                        
                        return (
                          <button
                            key={option.id || index}
                            className={`course-board__poll-option ${isSelected ? 'course-board__poll-option--selected' : ''} ${showResults ? 'course-board__poll-option--voted' : ''}`}
                            onClick={() => {
                              if (!isExpired) {
                                handleVotePoll(selectedPost.id, option.id || index);
                              }
                            }}
                            disabled={isExpired}
                          >
                            <div className="course-board__poll-option-content">
                              <span className="course-board__poll-option-text">{option.text}</span>
                              {showResults && (
                                <span className="course-board__poll-option-percentage">{percentage}%</span>
                              )}
                            </div>
                            {showResults && hasVotes && (
                              <div 
                                className="course-board__poll-option-bar"
                                style={{ width: `${percentage}%` }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="course-board__poll-info">
                      {selectedPost.poll.expires_at && (
                        <div className="course-board__poll-deadline-display">
                          <Clock size={14} />
                          <span>
                            마감: {new Date(selectedPost.poll.expires_at).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: 'numeric',
                              hour12: false
                            }).replace('일', '일').replace('시', '시')}
                            {new Date(selectedPost.poll.expires_at) < new Date() && (
                              <span className="course-board__poll-deadline-expired"> (마감됨)</span>
                            )}
                          </span>
                        </div>
                      )}
                      {selectedPost.poll.total_votes !== undefined && selectedPost.poll.total_votes > 0 && (
                        <div className="course-board__poll-total-votes">
                          총 {selectedPost.poll.total_votes}명 투표
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 좋아요 버튼 */}
              <div className="course-board__detail-actions">
                <button
                  className={`course-board__detail-like ${selectedPost.isLiked ? 'course-board__detail-like--active' : ''}`}
                  onClick={() => handleLikePost(selectedPost.id)}
                >
                  <Heart size={20} fill={selectedPost.isLiked ? "currentColor" : "none"} />
                  <span>좋아요 {selectedPost.likes}</span>
                </button>
              </div>

              {/* 댓글 목록 */}
              <div className="course-board__comments">
                {(() => {
                  const countComments = (comments: Comment[]): number => {
                    return comments.reduce((count, comment) => {
                      return count + 1 + (comment.replies ? countComments(comment.replies) : 0);
                    }, 0);
                  };
                  const totalComments = countComments(selectedPost.comments);
                  return <h3>댓글 {totalComments}개</h3>;
                })()}
                <div className="course-board__comments-list">
                  {selectedPost.comments.map((comment) => {
                    const renderComment = (c: Comment, depth: number = 0) => {
                      const isReply = depth > 0;
                      const isNestedReply = depth > 1;
                      return (
                        <React.Fragment key={c.id}>
                          <div className={`course-board__comment ${isReply ? 'course-board__comment--reply' : ''} ${isNestedReply ? 'course-board__comment--reply-nested' : ''}`}>
                            <div 
                              className="course-board__comment-avatar"
                              style={
                                profileImage && c.author_id === user?.id
                                  ? (profileImage.startsWith('color:') 
                                      ? { background: profileImage.replace('color:', '') }
                                      : { background: 'transparent' })
                                  : c.author_profile_image && c.author_profile_image.startsWith('color:')
                                    ? { background: c.author_profile_image.replace('color:', '') }
                                    : c.author_profile_image
                                      ? { background: 'transparent' }
                                      : {}
                              }
                            >
                              {renderProfileAvatar(c.author_id, c.author_profile_image, 20)}
                            </div>
                            <div className="course-board__comment-content">
                              <div className="course-board__comment-header">
                                <div className="course-board__comment-author-row">
                                  <span className="course-board__comment-author">{c.author}</span>
                                  {c.author === selectedPost.author && (
                                    <span className="course-board__comment-author-badge">작성자</span>
                                  )}
                                  {c.author_student_id && (
                                    <span className="course-board__comment-author-id">{c.author_student_id}</span>
                                  )}
                                  {c.is_professor && (
                                    <span className="course-board__comment-author-professor">교수</span>
                                  )}
                                </div>
                                <span className="course-board__comment-timestamp">{c.timestamp}</span>
                              </div>
                              <p className="course-board__comment-text">{c.content}</p>
                              <div className="course-board__comment-actions">
                                <button 
                                  className={`course-board__comment-like ${c.isLiked ? 'active' : ''}`}
                                  onClick={() => handleCommentLike(c.id)}
                                >
                                  <Heart size={14} fill={c.isLiked ? "currentColor" : "none"} />
                                  <span>{c.likes || 0}</span>
                                </button>
                                <button
                                  className="course-board__comment-reply-button"
                                  onClick={() => {
                                    setReplyTo(c);
                                    setNewComment(`@${c.author} `);
                                  }}
                                >
                                  답글 달기
                                </button>
                                {c.author_id === user?.id && (
                                  <button
                                    className="course-board__comment-delete-button"
                                    onClick={() => handleDeleteComment(c.id)}
                                  >
                                    삭제
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          {c.replies && c.replies.map((reply) => renderComment(reply, depth + 1))}
                        </React.Fragment>
                      );
                    };
                    return renderComment(comment);
                  })}
                </div>
              </div>

              {/* 댓글 작성 */}
              <div className="course-board__comment-write">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                  <div 
                    className="course-board__comment-avatar"
                    style={
                      profileImage
                        ? (profileImage.startsWith('color:') 
                            ? { background: profileImage.replace('color:', '') }
                            : { background: 'transparent' })
                        : {}
                    }
                  >
                    {renderProfileAvatar(user?.id, profileImage, 20)}
                  </div>
                  <div className="course-board__comment-input-wrapper">
                    {replyTo ? (
                      <div className="course-board__comment-input-with-mention">
                        <span className="course-board__mention-prefix">@{replyTo.author}</span>
                        <input
                          type="text"
                          placeholder=""
                          className="course-board__comment-input-field-mention"
                          value={newComment.replace(`@${replyTo.author} `, '')}
                          onChange={(e) => setNewComment(`@${replyTo.author} ${e.target.value}`)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddComment();
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="댓글을 입력하세요"
                        className="course-board__comment-input-field"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddComment();
                          }
                        }}
                      />
                    )}
                  </div>
                  <button
                    className="course-board__comment-submit"
                    onClick={handleAddComment}
                  >
                    <Send size={18} />
                  </button>
                </div>
                {replyTo && (
                  <div className="course-board__reply-info">
                    <span>{replyTo.author} 답글</span>
                    <button
                      className="course-board__reply-cancel"
                      onClick={() => {
                        setReplyTo(null);
                        setNewComment("");
                      }}
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>

              {/* 게시글 관리 버튼 섹션 */}
              {(((user?.user_type === "professor" && (selectedPost.originalCategory === "notice" || selectedPost.originalCategory === "community")) ||
                 (user?.user_type === "student" && selectedPost.originalCategory === "team")) ||
                (selectedPost.author_id === user?.id)) && (
                <div className="post-detail-actions-section" style={{ 
                  marginTop: '24px', 
                  paddingTop: '20px', 
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  {/* 고정 버튼 (카테고리별 권한) */}
                  {((user?.user_type === "professor" && (selectedPost.originalCategory === "notice" || selectedPost.originalCategory === "community")) ||
                    (user?.user_type === "student" && selectedPost.originalCategory === "team")) && (
                    <button
                      className="post-detail-pin-button"
                      onClick={() => handleTogglePinPost(selectedPost.id)}
                      title={selectedPost.isPinned ? "고정 해제" : "게시글 고정"}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        backgroundColor: selectedPost.isPinned ? '#fef9e7' : '#fffbf0',
                        color: selectedPost.isPinned ? '#856404' : '#856404',
                        border: `1px solid ${selectedPost.isPinned ? '#ffeaa7' : '#ffeaa7'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        width: '100%',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = selectedPost.isPinned ? '#ffeaa7' : '#fef9e7';
                        e.currentTarget.style.borderColor = selectedPost.isPinned ? '#fdcb6e' : '#fdcb6e';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = selectedPost.isPinned ? '#fef9e7' : '#fffbf0';
                        e.currentTarget.style.borderColor = selectedPost.isPinned ? '#ffeaa7' : '#ffeaa7';
                      }}
                    >
                      <Pin size={16} fill={selectedPost.isPinned ? "currentColor" : "none"} />
                      <span>{selectedPost.isPinned ? "고정 해제" : "게시글 고정"}</span>
                    </button>
                  )}

                  {/* 수정/삭제 버튼 (본인 글인 경우만) */}
                  {selectedPost.author_id === user?.id && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="post-detail-edit-button"
                    onClick={() => handleEditPost(selectedPost)}
                    title="게시글 수정"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      backgroundColor: '#f3f4f6',
                      color: '#4b5563',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      flex: 1,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <Edit size={16} />
                    <span>게시글 수정</span>
                  </button>
                  <button
                    className="post-detail-delete-button"
                    onClick={() => handleDeletePost(selectedPost.id)}
                    title="게시글 삭제"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      background: 'transparent',
                      color: '#dc2626',
                      border: '2px solid #fecaca',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      flex: 1,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#fee2e2';
                      e.currentTarget.style.borderColor = '#fca5a5';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = '#fecaca';
                    }}
                  >
                      <Trash2 size={18} />
                      <span>게시글 삭제</span>
                    </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 모집 생성 모달 */}
      {isCreateRecruitmentOpen && (
        <div className="course-board__modal-overlay">
          <div className="course-board__modal" onClick={(e) => e.stopPropagation()}>
            <div className="course-board__modal-header">
              <h2>팀원 모집</h2>
              <button onClick={() => setIsCreateRecruitmentOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="course-board__modal-body">
              <input
                type="text"
                placeholder="팀 게시판 이름 (예: 알고리즘 스터디)"
                className="course-board__modal-input"
                value={newRecruitment.team_board_name}
                onChange={(e) => setNewRecruitment({ ...newRecruitment, team_board_name: e.target.value })}
              />
              <input
                type="text"
                placeholder="모집 제목 (예: 알고리즘 스터디 멤버 모집)"
                className="course-board__modal-input"
                value={newRecruitment.title}
                onChange={(e) => setNewRecruitment({ ...newRecruitment, title: e.target.value })}
              />
              <textarea
                placeholder="모집 내용을 입력하세요"
                className="course-board__modal-textarea"
                value={newRecruitment.description}
                onChange={(e) => setNewRecruitment({ ...newRecruitment, description: e.target.value })}
                rows={8}
              />
              <div className="recruitment-form-group">
                <label className="recruitment-form-label">
                  <Users size={18} />
                  인원수 (본인 포함)
                </label>
                <div className="recruitment-member-counter">
                  <button
                    type="button"
                    className="recruitment-member-counter__button"
                    onClick={() => setNewRecruitment({
                      ...newRecruitment,
                      maxMembers: Math.max(2, newRecruitment.maxMembers - 1)
                    })}
                    disabled={newRecruitment.maxMembers <= 2}
                  >
                    −
                  </button>
                  <span className="recruitment-member-counter__value">
                    {newRecruitment.maxMembers}명
                  </span>
                  <button
                    type="button"
                    className="recruitment-member-counter__button"
                    onClick={() => setNewRecruitment({
                      ...newRecruitment,
                      maxMembers: Math.min(10, newRecruitment.maxMembers + 1)
                    })}
                    disabled={newRecruitment.maxMembers >= 10}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className="course-board__modal-footer">
              <button
                className="course-board__modal-button course-board__modal-button--cancel"
                onClick={() => setIsCreateRecruitmentOpen(false)}
              >
                취소
              </button>
              <button
                className="course-board__modal-button course-board__modal-button--submit"
                onClick={handleCreateRecruitment}
              >
                작성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모집 상세보기 모달 */}
      {selectedRecruitment && (
        <div className="course-board__modal-overlay">
          <div className="course-board__modal course-board__modal--large" onClick={(e) => e.stopPropagation()}>
            <div className="course-board__modal-header">
              <h2>모집 상세</h2>
              <button onClick={() => {
                setSelectedRecruitment(null);
                setShowWarning(false);
                setWarningMessage("");
                setNotificationTargetCommentId(null);
              }}>
                <X size={20} />
              </button>
            </div>
            <div className="course-board__modal-body course-board__post-detail">
              {/* 모집 헤더 */}
              <div className="course-board__detail-header">
                <div className="course-board__post-author">
                  <div 
                    className="course-board__post-avatar"
                    style={
                      profileImage && selectedRecruitment.author_id === user?.id
                        ? (profileImage.startsWith('color:') 
                            ? { background: profileImage.replace('color:', '') }
                            : { background: 'transparent' })
                        : selectedRecruitment.author_profile_image && selectedRecruitment.author_profile_image.startsWith('color:')
                          ? { background: selectedRecruitment.author_profile_image.replace('color:', '') }
                          : selectedRecruitment.author_profile_image
                            ? { background: 'transparent' }
                            : {}
                    }
                  >
                    {renderProfileAvatar(selectedRecruitment.author_id, selectedRecruitment.author_profile_image ?? null, 24)}
                  </div>
                  <div className="course-board__post-meta">
                    <div className="course-board__post-author-row">
                      <span className="course-board__post-author-name">{selectedRecruitment.author}</span>
                      {selectedRecruitment.author_student_id && (
                        <span className="course-board__post-author-id">{selectedRecruitment.author_student_id}</span>
                      )}
                      {selectedRecruitment.is_professor && (
                        <span className="course-board__post-author-professor">교수</span>
                      )}
                    </div>
                    <span className="course-board__post-timestamp">{selectedRecruitment.timestamp}</span>
                  </div>
                </div>
              </div>

              {/* 모집 내용 */}
              <div className="course-board__detail-content">
                <h2>{selectedRecruitment.title}</h2>
                <p>{selectedRecruitment.description}</p>
              </div>

              {/* 인원 정보 */}
              <div className="recruitment-detail-members">
                <div className="recruitment-detail-members__header">
                  <Users size={20} />
                  <h3>참여 인원 ({selectedRecruitment.currentMembers} / {selectedRecruitment.maxMembers})</h3>
                </div>
                <div className="recruitment-detail-members__list">
                  {(selectedRecruitment.members || []).map((member, index) => (
                    <div key={index} className="recruitment-detail-member">
                      <div className="recruitment-detail-member__avatar">
                        {renderProfileAvatar(member.user_id ?? undefined, member.profile_image ?? null, 18)}
                      </div>
                      <div className="recruitment-detail-member__info">
                        <span className="recruitment-detail-member__name">{member.name}</span>
                        {member.student_id && (
                          <span className="recruitment-detail-member__id">{member.student_id}</span>
                        )}
                        {member.is_professor && (
                          <span className="recruitment-detail-member__professor">교수</span>
                        )}
                      </div>
                      {index === 0 && <span className="recruitment-detail-member__badge">리더</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* 참여 / 삭제 버튼 */}
              <div className="course-board__detail-actions">
                <div className="recruitment-detail-actions">
                  {selectedRecruitment.author_id !== user?.id && (
                    <button
                      className={`recruitment-detail-join-button ${selectedRecruitment.isJoined ? "recruitment-detail-join-button--joined" : ""
                        } ${(selectedRecruitment.currentMembers >= selectedRecruitment.maxMembers && !selectedRecruitment.isJoined) || selectedRecruitment.is_board_activated || (selectedRecruitment.isJoined && selectedRecruitment.is_board_activated) ? "recruitment-detail-join-button--disabled" : ""}`}
                      onClick={() => {
                        handleJoinRecruitment(selectedRecruitment.id);
                        // 상태 업데이트를 반영하기 위해 모달도 업데이트
                        const updated = recruitments.find(r => r.id === selectedRecruitment.id);
                        if (updated) setSelectedRecruitment(updated);
                      }}
                      disabled={(selectedRecruitment.currentMembers >= selectedRecruitment.maxMembers && !selectedRecruitment.isJoined) || selectedRecruitment.is_board_activated || (selectedRecruitment.isJoined && selectedRecruitment.is_board_activated)}
                    >
                      <Users size={20} />
                      <span>
                        {selectedRecruitment.is_board_activated
                          ? (selectedRecruitment.isJoined ? "참여중" : "마감")
                          : selectedRecruitment.isJoined
                            ? "참여 취소"
                            : selectedRecruitment.currentMembers >= selectedRecruitment.maxMembers
                              ? "마감"
                              : "참여하기"}
                      </span>
                    </button>
                  )}

                  {/* 삭제 버튼 및 팀 게시판 활성화 버튼 (본인 글인 경우만) */}
                  {selectedRecruitment.author_id === user?.id && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className={`recruitment-detail-activate-button ${selectedRecruitment.is_board_activated ? 'recruitment-detail-activate-button--completed' : ''}`}
                        onClick={() => !selectedRecruitment.is_board_activated && handleActivateTeamBoard(selectedRecruitment.id)}
                        title={selectedRecruitment.is_board_activated ? "팀 게시판 활성화 완료" : "팀 게시판 활성화"}
                        disabled={selectedRecruitment.is_board_activated}
                      >
                        <span>{selectedRecruitment.is_board_activated ? '✓ 팀 게시판 활성화 완료' : '팀 게시판 활성화'}</span>
                      </button>
                      <button
                        className="recruitment-detail-delete-button"
                        onClick={() => handleDeleteRecruitment(selectedRecruitment.id)}
                        title="모집글 삭제"
                      >
                        <Trash2 size={18} />
                        <span>삭제</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 가능한 시간 모달 */}
      {isAvailableTimeModalOpen && (
        <div className="course-board__modal-overlay">
          <div className="course-board__modal course-board__modal--available-time" onClick={(e) => e.stopPropagation()}>
            <div className="course-board__modal-header">
              <h2>
                <Clock size={24} />
                가능한 시간
              </h2>
              <button onClick={() => {
                setIsAvailableTimeModalOpen(false);
                // 모달을 닫을 때 상태 초기화 (다음에 다른 팀 모달을 열 때 이전 데이터가 나타나지 않도록)
                // 단, isResultView는 유지하지 않음 (다음에 열 때 teamSubmittedMap을 기반으로 다시 설정됨)
                setTeamMemberAvailabilities([]);
                setTeamSize(0);
                setTeamModalName(null);
                setMyAvailableTimes([]);
              }}>
                <X size={20} />
              </button>
            </div>

            <div className="course-board__modal-body">
              {!isResultView ? (
                /* 시간 입력 단계 */
                <>
                  <div className="available-time-info">
                    <p className="available-time-description">
                      팀원들과 만날 수 있는 시간을 선택해주세요.
                      미리 입력한 시간이 자동으로 불러와지며, 추가로 시간을 더 입력할 수 있습니다.
                    </p>
                  </div>
                  {teamModalName && (
                    <p className="available-time-team-meta">
                      {teamModalName} · 참여 인원 {teamSize}명
                    </p>
                  )}
                  {isTeamSlotsLoading && (
                    <p className="available-time-loading">팀원의 가능한 시간을 불러오는 중입니다...</p>
                  )}
                  {teamSlotsError && (
                    <p className="available-time-error">{teamSlotsError}</p>
                  )}

                  {/* 시간 추가 폼 */}
                  <div className="time-form">
                    <div className="time-form-group">
                      <label className="time-form-label">요일</label>
                      <div className="time-form-days-grid">
                        {["월", "화", "수", "목", "금", "토", "일"].map((dayShort, index) => {
                          const dayFull = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"][index];
                          return (
                            <button
                              key={dayFull}
                              type="button"
                              className={`time-form-day-button ${newTime.day === dayFull ? 'time-form-day-button--active' : ''}`}
                              onClick={() => {
                                setNewTime({ ...newTime, day: dayFull });
                                setTimeOverlapWarning("");
                              }}
                            >
                              {dayShort}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="time-form-row">
                      <div className="time-form-group">
                        <label className="time-form-label">시작 시간</label>
                        <div className="time-form-time-row">
                          <div className="time-form-select-wrapper">
                            <select
                              className="time-form-select-small"
                              value={newTime.startHour}
                              onChange={(e) => {
                                setNewTime({ ...newTime, startHour: e.target.value });
                                setTimeOverlapWarning("");
                              }}
                            >
                              {AVAILABLE_HOUR_OPTIONS.map((hour) => (
                                <option key={hour} value={hour}>{hour}</option>
                              ))}
                            </select>
                          </div>
                          <span className="time-form-separator">:</span>
                          <div className="time-form-select-wrapper">
                            <select
                              className="time-form-select-small"
                              value={newTime.startMinute}
                              onChange={(e) => {
                                setNewTime({ ...newTime, startMinute: e.target.value });
                                setTimeOverlapWarning("");
                              }}
                            >
                              {["00", "30"].map(min => (
                                <option key={min} value={min}>{min}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                      </div>

                      <div className="time-form-group">
                        <label className="time-form-label">종료 시간</label>
                        <div className="time-form-time-row">
                          <div className="time-form-select-wrapper">
                            <select
                              className="time-form-select-small"
                              value={newTime.endHour}
                              onChange={(e) => {
                                setNewTime({ ...newTime, endHour: e.target.value });
                                setTimeOverlapWarning("");
                              }}
                            >
                              {AVAILABLE_HOUR_OPTIONS.map((hour) => (
                                <option key={hour} value={hour}>{hour}</option>
                              ))}
                            </select>
                          </div>
                          <span className="time-form-separator">:</span>
                          <div className="time-form-select-wrapper">
                            <select
                              className="time-form-select-small"
                              value={newTime.endMinute}
                              onChange={(e) => {
                                setNewTime({ ...newTime, endMinute: e.target.value });
                                setTimeOverlapWarning("");
                              }}
                            >
                              {["00", "30"].map(min => (
                                <option key={min} value={min}>{min}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {timeOverlapWarning && (
                      <div className="time-form-warning">
                        {timeOverlapWarning}
                      </div>
                    )}

                    <button
                      className="time-form-add-button"
                      onClick={handleAddTime}
                    >
                      <Plus size={18} />
                      시간 추가
                    </button>
                  </div>

                  {/* 추가된 시간 목록 */}
                  {myAvailableTimes.length > 0 && (
                    <div className="time-list">
                      <h3 className="time-list-title">추가된 만남 가능 시간 ({myAvailableTimes.length}개)</h3>
                      <div className="time-list-items">
                        {myAvailableTimes.map((time) => (
                          <div key={time.id} className="time-list-item">
                            <div className="time-list-item-info">
                              <span className="time-list-item-day">{time.day}</span>
                              <span className="time-list-item-time">
                                {time.startTime} - {time.endTime}
                              </span>
                            </div>
                            <button
                              className="time-list-item-remove"
                              onClick={() => handleRemoveTime(time.id)}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* 결과 보기 단계 */
                <>
                    <div className="result-header">
                      <h3 className="result-title">✨ 팀 미팅 가능 시간 분석 결과</h3>
                      <p className="result-description">
                        {teamSize > 0
                          ? `팀원 모두 가능한 시간 총 ${formatDurationLabel(optimalDurationMinutes)}을 찾았습니다.`
                          : "팀원이 아직 시간 정보를 등록하지 않아 공통 시간을 찾을 수 없습니다."}
                      </p>
                    {optimalSlots.size === 0 && teamSize > 0 && (
                      <p className="result-empty">
                        아직 모든 팀원이 겹치는 시간이 없어요. 시간을 다시 조율해주세요.
                      </p>
                    )}
                  </div>

                  {/* 주간 시간표 그리드 - 결과 단계 */}
                  <div className="time-schedule time-schedule--result">
                    <div className="time-schedule__header">
                      <div className="time-schedule__corner"></div>
                      {["월", "화", "수", "목", "금", "토", "일"].map((day, index) => (
                        <div key={index} className="time-schedule__day-header time-schedule__day-header--result">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="time-schedule__body">
                      {Array.from({ length: SCHEDULE_ROW_COUNT }, (_, hourIndex) => {
                        const rowHour = SCHEDULE_START_HOUR + hourIndex;
                        return (
                          <div key={rowHour} className="time-schedule__row">
                            <div className="time-schedule__time-label time-schedule__time-label--result">
                              {rowHour.toString().padStart(2, '0')}:00
                            </div>
                            {["월", "화", "수", "목", "금", "토", "일"].map((_, dayIndex) => {
                              const hourSlotKeys = getHourSlotKeys(dayIndex, rowHour);
                              const activeSlots = hourSlotKeys.filter((key) => optimalSlots.has(key)).length;
                              const coverage = (activeSlots / hourSlotKeys.length) * 100;
                              const isOptimal = activeSlots === hourSlotKeys.length;
                              const availableMembers = hourSlotKeys.reduce((acc, key, idx) => {
                                const count = slotCounts[key] ?? 0;
                                return idx === 0 ? count : Math.min(acc, count);
                              }, 0);
                              const availabilityTitle = teamSize > 0
                                ? `${availableMembers}/${teamSize}명 가능`
                                : `${availableMembers}명 가능`;

                              return (
                                <div
                                  key={`${dayIndex}-${rowHour}`}
                                  className={`time-schedule__cell time-schedule__cell--result ${isOptimal ? 'time-schedule__cell--optimal-result' : activeSlots > 0 ? 'time-schedule__cell--partial-result' : 'time-schedule__cell--unavailable-result'}`}
                                  title={availabilityTitle}
                                >
                                  {coverage > 0 && (
                                    <div 
                                      className="time-schedule__cell-fill" 
                                      style={{ height: `${coverage}%` }}
                                    />
                                  )}
                                  {isOptimal && <span className="time-schedule__optimal-icon">✓</span>}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 범례 - 결과 단계 */}
                  <div className="time-schedule__legend time-schedule__legend--result">
                    <div className="time-schedule__legend-item">
                      <div className="time-schedule__legend-box time-schedule__legend-box--optimal-result">
                        <span className="legend-check">✓</span>
                      </div>
                      <span><strong>모든 팀원 만남 가능</strong> - 이 시간에 미팅을 잡으세요!</span>
                    </div>
                    <div className="time-schedule__legend-item">
                      <div className="time-schedule__legend-box time-schedule__legend-box--unavailable-result"></div>
                      <span>일부 팀원 불가능</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="course-board__modal-footer">
              {!isResultView ? (
                <>
                  <button
                    className="course-board__modal-button course-board__modal-button--cancel"
                    onClick={() => {
                      setIsAvailableTimeModalOpen(false);
                      // 모달을 닫을 때 상태 초기화
                      // 단, isResultView는 유지하지 않음 (다음에 열 때 teamSubmittedMap을 기반으로 다시 설정됨)
                      setTeamMemberAvailabilities([]);
                      setTeamSize(0);
                      setTeamModalName(null);
                      setMyAvailableTimes([]);
                    }}
                  >
                    취소
                  </button>
                  <button
                    className="course-board__modal-button course-board__modal-button--submit"
                    onClick={handleSubmitAvailableTime}
                  >
                    제출
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="course-board__modal-button course-board__modal-button--secondary"
                    onClick={() => setIsResultView(false)}
                  >
                    다시 선택
                  </button>
                  <button
                    className="course-board__modal-button course-board__modal-button--primary"
                    onClick={() => {
                      setIsAvailableTimeModalOpen(false);
                      // 모달을 닫을 때 상태 초기화
                      // 단, isResultView는 유지하지 않음 (다음에 열 때 teamSubmittedMap을 기반으로 다시 설정됨)
                      setTeamMemberAvailabilities([]);
                      setTeamSize(0);
                      setTeamModalName(null);
                      setMyAvailableTimes([]);
                    }}
                  >
                    확인
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 확인 다이얼로그 */}
      <ConfirmDialog
        message={confirmMessage}
        show={showConfirm}
        onConfirm={() => {
          setShowConfirm(false);
          if (confirmCallback) {
            confirmCallback();
          }
        }}
        onCancel={() => setShowConfirm(false)}
      />
      
      {/* 성공 알림 */}
      <SuccessAlert
        message={successMessage}
        show={showSuccess}
        onClose={() => setShowSuccess(false)}
        autoCloseDelay={1500}
      />
      
      {/* 경고 알림 */}
      <WarningAlert
        message={warningMessage}
        show={showWarning}
        onClose={() => setShowWarning(false)}
        autoCloseDelay={3000}
      />
    </div>
  );
}



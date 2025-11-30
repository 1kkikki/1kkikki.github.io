import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getBoardPosts, createBoardPost, deleteBoardPost, getComments, createComment, deleteComment, toggleLike, toggleCommentLike, uploadFile } from "../../api/board";
import { getRecruitments, createRecruitment, toggleRecruitmentJoin, deleteRecruitment, activateTeamBoard, getTeamBoards } from "../../api/recruit";
import { getNotifications, markAsRead, markAllAsRead } from "../../api/notification";
import ConfirmDialog from "../../components/ConfirmDialog";
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
  X,
  Plus,
  Link,
  Check,
  Trash2,
  Image,
  Video,
  File,
  FileText
} from "lucide-react";
import "./professor-courseboard.css";
import "../StudentCourseBoardPage/student-courseboard.css";
import {
  readProfileImageFromStorage,
  PROFILE_IMAGE_UPDATED_EVENT,
  ProfileImageEventDetail,
} from "../../utils/profileImage";
import { onNotificationUpdated, notifyNotificationUpdated } from "../../utils/notificationSync";
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
  category: string;
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

export default function CourseBoardPage({ course, onBack, onNavigate }: CourseBoardPageProps) {
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(() =>
    readProfileImageFromStorage(user?.id)
  );
  const [activeTab, setActiveTab] = useState("공지");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [postFiles, setPostFiles] = useState<Array<{
    filename: string;
    original_name: string;
    type: 'image' | 'video' | 'file';
    size: number;
    url: string;
    preview?: string;
  }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  
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

  // 강의 초대 링크 생성 (해시 라우팅 대신 일반 라우팅 사용)
  const inviteLink = `${window.location.origin}/course/${course.id}/${encodeURIComponent(course.title)}/${encodeURIComponent(course.code)}`;
  
  // 모집 데이터 (서버에서 불러옴)
  const [recruitments, setRecruitments] = useState<TeamRecruitment[]>([]);
  
  // 팀 게시판 목록 (활성화된 팀 게시판들)
  const [teamBoards, setTeamBoards] = useState<TeamRecruitment[]>([]);
  
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

  // 서버에서 게시글 목록 가져오기
  async function loadPosts() {
    try {
      const data = await getBoardPosts(course.code);

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
        tags: [],
        likes: p.likes || 0,
        comments: [],
        comments_count: p.comments_count || 0,
        isPinned: false,
        isLiked: p.is_liked || false,
        files: p.files || [],
        team_board_name: p.team_board_name || null,
      }));

      setPosts(mapped);
    } catch (err) {
      console.error("게시글 불러오기 실패:", err);
    }
  }

  // 서버에서 모집글 목록 가져오기
  async function loadRecruitments() {
    try {
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
    } catch (err) {
      console.error("모집글 불러오기 실패:", err);
    }
  }

  // 탭이 바뀔 때마다, 처음 렌더링 할 때 서버에서 게시글 다시 불러오기
  useEffect(() => {
    loadPosts();
  }, [activeTab, course.id]);
  
  // 강의가 변경되면 탭을 "공지"로 초기화
  useEffect(() => {
    setActiveTab("공지");
  }, [course.id]);
  
  // 팀 게시판 탭이 사라졌을 때 activeTab 조정
  useEffect(() => {
    const tabExists = tabs.some(tab => tab.name === activeTab);
    if (!tabExists) {
      setActiveTab("공지");
    }
  }, [tabs, activeTab]);

  // 게시글이 변경될 때 댓글 입력창 초기화
  useEffect(() => {
    setNewComment("");
    setReplyTo(null);
  }, [selectedPost?.id]);

  // 강의가 바뀔 때 모집글 및 팀 게시판 불러오기
  useEffect(() => {
    loadRecruitments();
    loadTeamBoards();
  }, [course.id]);
  
  // 팀 게시판 목록 불러오기
  async function loadTeamBoards() {
    try {
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
    } catch (err) {
      console.error("팀 게시판 목록 불러오기 실패:", err);
    }
  }

  // 알림 데이터
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationTargetPostId, setNotificationTargetPostId] = useState<number | null>(null);
  const [notificationTargetCommentId, setNotificationTargetCommentId] = useState<number | null>(null);
  const [notificationTargetRecruitmentId, setNotificationTargetRecruitmentId] = useState<number | null>(null);

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
        const matchesTeamBoard = post.category === "팀 게시판" && 
                                 post.team_board_name === currentTeamBoard.team_board_name;
        const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             post.content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTeamBoard && matchesSearch;
      }
      return false;
    }
    
    // 일반 탭인 경우
    const matchesTab = post.category === activeTab;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
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
    if (!posts || posts.length === 0) return;

    const targetPost = posts.find((p) => p.id === notificationTargetPostId);
    if (!targetPost) {
      console.log("게시글을 찾을 수 없음:", notificationTargetPostId);
      setWarningMessage("삭제된 게시글입니다.");
      setShowWarning(true);
      setNotificationTargetPostId(null);
      setNotificationTargetCommentId(null);
      return;
    }

    console.log("알림 게시글:", targetPost.category, targetPost.team_board_name, "현재 탭:", activeTab);

    // 게시글을 찾았으므로 이전 경고 메시지 초기화
    setShowWarning(false);
    setWarningMessage("");

    // 해당 게시글이 있는 탭으로 전환
    let targetTab = targetPost.category;
    if (targetPost.category === "팀 게시판" && targetPost.team_board_name) {
      targetTab = `팀 게시판: ${targetPost.team_board_name}`;
    }
    
    console.log("목표 탭:", targetTab);
    
    // notificationTargetPostId를 먼저 null로 설정 (useEffect 중복 실행 방지)
    setNotificationTargetPostId(null);
    
    // 이미 올바른 탭에 있으면 바로 게시글 열기
    if (activeTab === targetTab) {
      console.log("이미 올바른 탭에 있음, 바로 게시글 열기");
      handlePostClick(targetPost);
      return;
    }
    
    // 탭이 다르면 전환하고, setTimeout으로 게시글 열기
    console.log("탭 전환 후 게시글 열기");
    setActiveTab(targetTab);
    setTimeout(() => {
      handlePostClick(targetPost);
    }, 200);
  }, [notificationTargetPostId, posts]);

  // 알림으로 지정된 모집 자동 선택
  useEffect(() => {
    if (!notificationTargetRecruitmentId) return;
    if (!recruitments || recruitments.length === 0) return;

    const targetRecruitment = recruitments.find(r => r.id === notificationTargetRecruitmentId);
    if (targetRecruitment) {
      // 모집을 찾았으므로 이전 경고 메시지 초기화
      setShowWarning(false);
      setWarningMessage("");
      // 모집 탭으로 전환하고 모집 선택 (모달이 바로 열림)
      setActiveTab("모집");
      setSelectedRecruitment(targetRecruitment);
    } else {
      setWarningMessage("삭제된 모집입니다.");
      setShowWarning(true);
    }
    setNotificationTargetRecruitmentId(null);
  }, [notificationTargetRecruitmentId, recruitments]);

  // 댓글/답글 알림에서 댓글이 삭제되었는지 확인
  useEffect(() => {
    if (!notificationTargetCommentId) return;
    if (!selectedPost) return;
    
    // selectedPost.comments에서 해당 댓글이 있는지 확인 (답글 포함)
    const findComment = (comments: Comment[]): boolean => {
      for (const comment of comments) {
        if (comment.id === notificationTargetCommentId) return true;
        if (comment.replies && findComment(comment.replies)) return true;
      }
      return false;
    };
    
    const commentExists = findComment(selectedPost.comments);
    if (!commentExists) {
      console.log("댓글을 찾을 수 없음:", notificationTargetCommentId);
      setWarningMessage("삭제된 댓글입니다.");
      setShowWarning(true);
    } else {
      // 댓글을 찾았으므로 이전 경고 메시지 초기화
      setShowWarning(false);
      setWarningMessage("");
    }
    
    setNotificationTargetCommentId(null);
  }, [notificationTargetCommentId, selectedPost]);

  // 대시보드/다른 화면에서 온 알림 타겟 처리
  useEffect(() => {
    const stored = localStorage.getItem("notificationTarget");
    if (!stored) return;

    try {
      const target = JSON.parse(stored);
      if (target.courseCode === course.code) {
        // 게시글 관련 알림
        if (typeof target.postId === "number") {
          // 댓글 ID가 있으면 저장
          if (target.commentId) {
            setNotificationTargetCommentId(target.commentId);
          }
          
          // 팀게시판 알림인 경우 먼저 탭 전환 후 게시글 ID 설정
          if (target.teamBoardName) {
            console.log("대시보드→강의: 팀게시판 탭 전환:", target.teamBoardName);
            setActiveTab(`팀 게시판: ${target.teamBoardName}`);
            // 탭 전환 완료 후 게시글 ID 설정 (다음 렌더 사이클에서)
            setTimeout(() => {
              console.log("대시보드→강의: 게시글 ID 설정:", target.postId);
              setNotificationTargetPostId(target.postId);
            }, 150);
          } else {
            // 일반 게시판은 바로 설정
            console.log("대시보드→강의: 일반 게시판, 게시글 ID:", target.postId);
            setNotificationTargetPostId(target.postId);
          }
        }
        // 강의 참여 알림 - 이미 해당 강의 게시판에 있으므로 아무것도 하지 않음
        else if (target.type === 'enrollment') {
          // 이미 해당 강의 게시판에 있으므로 아무것도 하지 않음
        }
        // 팀 모집 참여 알림 - 모집 상세 모달 바로 열기
        else if (target.type === 'recruitment_join') {
          // recruitmentId가 있으면 해당 모집을 선택 (recruitments가 로드된 후 처리)
          if (target.recruitmentId) {
            setNotificationTargetRecruitmentId(target.recruitmentId);
          }
        }
      }
    } catch (err) {
      console.error("알림 타겟 파싱 실패:", err);
    } finally {
      localStorage.removeItem("notificationTarget");
    }
  }, [course.code, recruitments]);

  // 알림 클릭 핸들러
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? {...n, is_read: true} : n)
        );
      } catch (err) {
        console.error("알림 읽음 처리 실패:", err);
      }
    }

    // 게시판 관련 알림이면 해당 게시글로 이동
    if (
      (notification.type === 'notice' || notification.type === 'comment' || notification.type === 'reply' || notification.type === 'team_post') &&
      notification.related_id
    ) {
      // 현재 강의에 대한 알림이면 바로 게시글 열기
      if (notification.course_id === course.code) {
        if (notification.comment_id) {
          setNotificationTargetCommentId(notification.comment_id);
        }
        setNotificationTargetPostId(notification.related_id);
      } else if (notification.course_id) {
        // 다른 강의 알림이면 대시보드에서 처리하도록 저장 후 돌아가기
        try {
          localStorage.setItem(
            "notificationTarget",
            JSON.stringify({
              courseCode: notification.course_id,
              postId: notification.related_id,
            })
          );
        } catch (e) {
          console.error("알림 타겟 저장 실패:", e);
        }

        // 대시보드(강의 목록 화면)로 이동
        onBack();
      }
    }

    // 강의 참여 알림이면 현재 강의에 있으므로 아무것도 하지 않음
    if (notification.type === 'enrollment' && notification.course_id === course.code) {
      // 이미 해당 강의 게시판에 있으므로 아무것도 하지 않음
    } else if (notification.type === 'enrollment' && notification.course_id) {
      // 다른 강의 참여 알림이면 대시보드에서 처리하도록 저장 후 돌아가기
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
      onBack();
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
        // 다른 강의 알림이면 대시보드에서 처리하도록 저장 후 돌아가기
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
        onBack();
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

  // 프로필 이미지 가져오기
  // 프로필 이미지 초기화 (localStorage에서만 읽기, API 호출 제거로 성능 개선)
  useEffect(() => {
    setProfileImage(readProfileImageFromStorage(user?.id) || null);
  }, [user?.id]);

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
    
    // 30초마다 알림 자동 새로고침 (성능 최적화)
    const interval = setInterval(loadNotifications, 30000);
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
      }
    });

    return unsubscribe;
  }, []);

  // 프로필 아바타 렌더링 함수
  const renderProfileAvatar = (authorId: number | undefined, authorProfileImage: string | null | undefined, size: number = 20) => {
    const isCurrentUser = authorId === user?.id;
    const profile = isCurrentUser ? profileImage : authorProfileImage;
    
    if (profile) {
      if (profile.startsWith('color:')) {
        const color = profile.replace('color:', '');
        return (
          <div 
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
  const handleFileUpload = async (file: File, fileType: 'image' | 'video' | 'file') => {
    try {
      const res = await uploadFile(file);
      if (res.file) {
        const fileData = {
          ...res.file,
          preview: fileType === 'image' ? URL.createObjectURL(file) : undefined
        };
        setPostFiles(prev => [...prev, fileData]);
      } else {
        alert(res.message || "파일 업로드에 실패했습니다.");
      }
    } catch (err) {
      console.error("파일 업로드 실패:", err);
      alert("파일 업로드 중 오류가 발생했습니다.");
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video' | 'file') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      // 파일 크기 확인 (50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} 파일 크기는 50MB를 초과할 수 없습니다.`);
        return;
      }
      handleFileUpload(file, fileType);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files.length) return;

    Array.from(files).forEach(file => {
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} 파일 크기는 50MB를 초과할 수 없습니다.`);
        return;
      }
      const fileType = getFileType(file.name);
      handleFileUpload(file, fileType);
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
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    try {
      // 탭(공지/모집/커뮤니티/팀 게시판)을 백엔드 category 값으로 변환
      const categoryForApi = tabNameToCategory(activeTab);
      
      // 팀 게시판인 경우 team_board_name 전달
      const teamBoardName = activeTab.startsWith("팀 게시판:") 
        ? activeTab.replace("팀 게시판: ", "")
        : null;

      // 파일 정보 준비
      const filesData = postFiles.map(f => ({
        filename: f.filename,
        original_name: f.original_name,
        type: f.type,
        size: f.size,
        url: f.url
      }));

      // 서버에 글 생성 요청 보내기
      const res = await createBoardPost(
        course.code,
        newPostTitle,    
        newPostContent,  
        categoryForApi,
        filesData,
        teamBoardName
      );

      const p = res.post;

      // 서버에서 돌아온 데이터 → 화면에서 쓰는 Post 타입으로 변환
      const createdPost: Post = {
        id: p.id,
        title: p.title,
        content: p.content,
        author: p.author || (user?.name || "나"),
        author_id: p.author_id || user?.id,
        author_student_id: p.author_student_id || null,
        is_professor: p.is_professor || (user?.user_type === 'professor') || false,
        timestamp: p.created_at,
        category: categoryToTabName(p.category),
        tags: [],
        likes: 0,
        comments: [],
        isPinned: false,
        isLiked: false,
        files: p.files || [],
      };

      // 맨 앞에 추가
      setPosts((prev) => [createdPost, ...prev]);

      // 폼 초기화 & 모달 닫기
      setNewPostTitle("");
      setNewPostContent("");
      setPostFiles([]);
      setIsCreatePostOpen(false);
    } catch (err) {
      console.error("게시글 작성 실패:", err);
      alert("게시글 작성 중 오류가 발생했습니다.");
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
        author_student_id: (user?.user_type === 'professor') ? null : (res.comment.author_student_id || null),
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

      // 목록의 댓글 수/목록도 함께 업데이트
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
    } catch (err) {
      console.error("댓글 작성 실패:", err);
      alert("댓글 작성 중 오류가 발생했습니다.");
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
      alert("댓글 좋아요 중 오류가 발생했습니다.");
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

  // 모집 참여/취소 핸들러
  const handleJoinRecruitment = async (recruitmentId: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const recruitment = recruitments.find(r => r.id === recruitmentId);
    const isCurrentlyJoined = recruitment?.isJoined;
    
    // 팀 게시판이 활성화된 경우 참여 취소 불가
    if (isCurrentlyJoined && recruitment?.is_board_activated) {
      alert("팀 게시판이 활성화되어 참여 취소할 수 없습니다.");
      return;
    }

    // 참여 취소인 경우 확인 다이얼로그 표시
    if (isCurrentlyJoined) {
      setConfirmMessage("참여를 취소하시겠습니까?");
      setConfirmCallback(() => async () => {
        try {
          const res = await toggleRecruitmentJoin(recruitmentId);
          const r = res.recruitment;

          // 리스트 업데이트
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

          // 상세 모달 열려 있으면 동기화
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
        } catch (err) {
          console.error("모집 참여/취소 실패:", err);
          alert("모집 참여/취소 중 오류가 발생했습니다.");
        }
      });
      setShowConfirm(true);
      return;
    }

    // 참여하는 경우는 바로 실행
    try {
      const res = await toggleRecruitmentJoin(recruitmentId);
      const r = res.recruitment;

      // 리스트 업데이트
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

      // 상세 모달 열려 있으면 동기화
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
    } catch (err) {
      console.error("모집 참여/취소 실패:", err);
      alert("모집 참여/취소 중 오류가 발생했습니다.");
    }
  };

  // 모집 생성 핸들러
  const handleCreateRecruitment = async () => {
    if (!newRecruitment.team_board_name?.trim()) {
      alert("팀게시판 이름을 입력해주세요.");
      return;
    }
    if (!newRecruitment.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!newRecruitment.description.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }
    if (newRecruitment.maxMembers < 2) {
      alert("인원수는 최소 2명 이상이어야 합니다.");
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
      alert("모집글 작성 중 오류가 발생했습니다.");
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
        alert("모집글 삭제 중 오류가 발생했습니다.");
      }
    });
    setShowConfirm(true);
  };

  // 팀 게시판 활성화 핸들러
  const handleActivateTeamBoard = async (recruitmentId: number) => {
    setConfirmMessage("팀 게시판을 활성화하시겠습니까?\n\n⚠️ 팀 게시판 활성화 시 자동으로 마감 처리되며, 참여 취소가 불가능합니다.");
    setConfirmCallback(() => async () => {
      try {
        const res = await activateTeamBoard(recruitmentId);
        
        // 에러 응답 처리
        if (res.message && res.message.includes("이미 활성화")) {
          alert(res.message);
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
        } else if (res.message) {
          // 에러 메시지만 있는 경우
          alert(res.message);
        }
      } catch (err: any) {
        console.error("팀 게시판 활성화 실패:", err);
        const errorMessage = err.message || err.response?.data?.message || "팀 게시판 활성화 중 오류가 발생했습니다.";
        alert(errorMessage);
      }
    });
    setShowConfirm(true);
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
        
        // 성공 메시지 표시
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      alert("링크 복사에 실패했습니다.");
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
            <div className="course-board__title-row">
              <h1 className="course-board__course-title">
                {course.title} ({course.code})
              </h1>
              <button 
                className="course-board__invite-link-button"
                onClick={handleCopyLink}
                title="초대 링크 복사"
              >
                {copiedLink ? (
                  <>
                    <Check size={16} />
                    <span>복사됨!</span>
                  </>
                ) : (
                  <>
                    <Link size={16} />
                    <span>초대 링크</span>
                  </>
                )}
              </button>
            </div>
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
                            width: 16, 
                            height: 16, 
                            borderRadius: "50%", 
                            overflow: "hidden", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            background: recruitment.author_profile_image && recruitment.author_profile_image.startsWith('color:') 
                              ? recruitment.author_profile_image.replace('color:', '')
                              : recruitment.author_profile_image 
                                ? 'transparent' 
                                : '#e5e7eb'
                          }}>
                            {renderProfileAvatar(recruitment.author_id, recruitment.author_profile_image, 16)}
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
                            className={`recruitment-card__join-button ${
                              recruitment.isJoined ? "recruitment-card__join-button--joined" : ""
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
                  <h3 className="course-board__post-title">{post.title}</h3>
                  <p className="course-board__post-preview">{post.content}</p>
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

      {/* 플로팅 게시글 작성 버튼 (모집 탭에서는 교수는 작성 불가) */}
      {activeTab !== "모집" && (
        <button 
          className="course-board__floating-add-button"
          onClick={() => setIsCreatePostOpen(true)}
          aria-label="게시글 작성"
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
                onDrop={handleDrop}
              >
                <div className="course-board__file-upload-buttons">
                  <input
                    type="file"
                    id="image-upload-professor"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e, 'image')}
                    multiple
                  />
                  <input
                    type="file"
                    id="video-upload-professor"
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e, 'video')}
                    multiple
                  />
                  <input
                    type="file"
                    id="file-upload-professor"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e, 'file')}
                    multiple
                  />
                  
                  <button
                    type="button"
                    className="course-board__file-upload-button"
                    onClick={() => document.getElementById('image-upload-professor')?.click()}
                    title="사진 추가"
                  >
                    <Image size={20} />
                    <span>사진</span>
                  </button>
                  <button
                    type="button"
                    className="course-board__file-upload-button"
                    onClick={() => document.getElementById('video-upload-professor')?.click()}
                    title="동영상 추가"
                  >
                    <Video size={20} />
                    <span>동영상</span>
                  </button>
                  <button
                    type="button"
                    className="course-board__file-upload-button"
                    onClick={() => document.getElementById('file-upload-professor')?.click()}
                    title="파일 추가"
                  >
                    <File size={20} />
                    <span>파일</span>
                  </button>
                </div>
                <p className="course-board__file-upload-hint">
                  또는 파일을 여기에 드래그하세요
                </p>
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
            </div>
            <div className="course-board__modal-footer">
              <button 
                className="course-board__modal-button course-board__modal-button--cancel"
                onClick={() => {
                  setPostFiles([]);
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
              
              {/* 삭제 버튼 (본인 글인 경우만) */}
              {selectedPost.author_id === user?.id && (
                <div className="post-detail-delete-section">
                  <button 
                    className="post-detail-delete-button"
                    onClick={() => handleDeletePost(selectedPost.id)}
                    title="게시글 삭제"
                  >
                    <Trash2 size={18} />
                    <span>게시글 삭제</span>
                  </button>
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
                placeholder="팀게시판 이름 (예: 알고리즘 스터디 팀)"
                className="course-board__modal-input"
                value={newRecruitment.team_board_name}
                onChange={(e) => setNewRecruitment({...newRecruitment, team_board_name: e.target.value})}
              />
              <input
                type="text"
                placeholder="모집 제목 (예: 알고리즘 스터디 멤버 모집)"
                className="course-board__modal-input"
                value={newRecruitment.title}
                onChange={(e) => setNewRecruitment({...newRecruitment, title: e.target.value})}
              />
              <textarea
                placeholder="모집 내용을 입력하세요"
                className="course-board__modal-textarea"
                value={newRecruitment.description}
                onChange={(e) => setNewRecruitment({...newRecruitment, description: e.target.value})}
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
                      className={`recruitment-detail-join-button ${
                        selectedRecruitment.isJoined ? "recruitment-detail-join-button--joined" : ""
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
        autoCloseDelay={1500}
      />
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getBoardPosts, createBoardPost, deleteBoardPost, getComments, createComment, deleteComment, toggleLike, toggleCommentLike, uploadFile } from "../../api/board";
import { getRecruitments, createRecruitment, toggleRecruitmentJoin, deleteRecruitment } from "../../api/recruit";
import { 
  Home, 
  Bell, 
  Users, 
  Calendar, 
  Settings, 
  Search, 
  Filter, 
  Menu, 
  Send,
  User,
  Hash,
  ChevronDown,
  Pin,
  Heart,
  MessageCircle,
  X,
  Plus,
  Link,
  Copy,
  Check,
  Trash2,
  Image,
  Video,
  File
} from "lucide-react";
import { getProfile } from "../../api/profile";
import "./professor-courseboard.css";
import "../StudentCourseBoardPage/student-courseboard.css";
import {
  readProfileImageFromStorage,
  writeProfileImageToStorage,
  PROFILE_IMAGE_UPDATED_EVENT,
  ProfileImageEventDetail,
} from "../../utils/profileImage";

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
  author_profile_image?: string | null;
  timestamp: string;
  category: string;
  tags: string[];
  likes: number;
  comments: Comment[];
  comments_count?: number;
  isPinned?: boolean;
  isLiked?: boolean;
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
  content: string;
  course: string;
  time: string;
  isRead: boolean;
}

interface RecruitmentMember {
  user_id?: number | null;
  name: string;
  student_id?: string | null;
  profile_image?: string | null;
}

interface TeamRecruitment {
  id: number;
  title: string;
  description: string;
  author: string;
  author_id?: number;
  author_student_id?: string | null;
  author_profile_image?: string | null;
  timestamp: string;
  maxMembers: number;
  currentMembers: number;
  membersList: string[];
  members?: RecruitmentMember[];
  isJoined: boolean;
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
    title: "",
    description: "",
    maxMembers: 3
  });

  // 강의 초대 링크 생성
  const inviteLink = `${window.location.origin}/#/course/${course.id}/${encodeURIComponent(course.title)}/${encodeURIComponent(course.code)}`;
  
  // 모집 데이터 (서버에서 불러옴)
  const [recruitments, setRecruitments] = useState<TeamRecruitment[]>([]);

  // 상단 탭 메뉴
  const tabs = [
    { id: "notice", name: "공지", icon: Bell },
    { id: "community", name: "커뮤니티", icon: MessageCircle },
    { id: "recruit", name: "모집", icon: Users },
  ];

  // 매핑 함수
  function tabNameToCategory(tab: string): string {
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
        author: r.author,
        author_id: r.author_id,
        author_student_id: r.author_student_id || null,
        author_profile_image: r.author_profile_image || null,
        timestamp: r.created_at,
        maxMembers: r.max_members,
        currentMembers: r.current_members,
        membersList: r.members_list || [],
        members: r.members || [],
        isJoined: r.is_joined,
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

  // 강의가 바뀔 때 모집글 불러오기
  useEffect(() => {
    loadRecruitments();
  }, [course.id]);

  // 알림 데이터
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, content: "새로운 공지사항이 등록되었습니다", course: course.title, time: "5분 전", isRead: false },
    { id: 2, content: "댓글이 달렸습니다", course: course.title, time: "1시간 전", isRead: false },
    { id: 3, content: "팀 프로젝트 회의 일정이 확정되었습니다", course: course.title, time: "3시간 전", isRead: true },
  ]);

  // 필터링된 게시글
  const filteredPosts = posts.filter(post => {
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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // 프로필 이미지 가져오기
  useEffect(() => {
    setProfileImage(readProfileImageFromStorage(user?.id) || null);
  }, [user?.id]);

  useEffect(() => {
    async function fetchProfile() {
      const data = await getProfile();
      if (data.profile && data.profile.profile_image) {
        setProfileImage(data.profile.profile_image);
        writeProfileImageToStorage(user?.id, data.profile.profile_image);
      } else if (data.profile && !data.profile.profile_image) {
        setProfileImage(null);
        writeProfileImageToStorage(user?.id, null);
      }
    }
    fetchProfile();
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

  const formatDateTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}. ${month}. ${day}. ${hours}:${minutes}`;
  };

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
      // 탭(공지/모집/커뮤니티)을 백엔드 category 값으로 변환
      const categoryForApi = tabNameToCategory(activeTab);

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
        filesData
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
      const res = await createComment(selectedPost.id, newComment, replyTo?.id as any);
      const newCommentData: Comment = {
        id: res.comment.id,
        author: res.comment.author,
        author_id: res.comment.author_id ?? undefined,
        author_student_id: res.comment.author_student_id || null,
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
    if (!confirm("댓글을 삭제하시겠습니까?")) return;

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
    } catch (err) {
      console.error("댓글 삭제 실패:", err);
      alert("댓글 삭제 중 오류가 발생했습니다.");
    }
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
    try {
      // 댓글 불러오기
      const comments = await getComments(post.id);
      const flat: Comment[] = comments.map((c: any) => ({
        id: c.id,
        author: c.author,
        author_id: c.author_id,
        author_student_id: c.author_student_id || null,
        author_profile_image: c.author_profile_image || null,
        parent_comment_id: c.parent_comment_id || null,
        content: c.content,
        timestamp: c.created_at,
        likes: c.likes || 0,
        isLiked: c.is_liked || false,
        replies: [],
      }));

      const byId = new Map<number, Comment>();
      flat.forEach(c => byId.set(c.id, c));

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
        newRecruitment.maxMembers
      );

      const r = res.recruitment;

      const recruitment: TeamRecruitment = {
        id: r.id,
        title: r.title,
        description: r.description,
        author: r.author,
        author_id: r.author_id,
        author_student_id: r.author_student_id || user?.student_id || null,
        timestamp: r.created_at,
        maxMembers: r.max_members,
        currentMembers: r.current_members,
        membersList: r.members_list || [],
        members: r.members || [],
        isJoined: r.is_joined,
      };

      setRecruitments(prev => [recruitment, ...prev]);
      setNewRecruitment({ title: "", description: "", maxMembers: 3 });
      setIsCreateRecruitmentOpen(false);
    } catch (err) {
      console.error("모집글 작성 실패:", err);
      alert("모집글 작성 중 오류가 발생했습니다.");
    }
  };

  // 모집 삭제 핸들러
  const handleDeleteRecruitment = async (recruitmentId: number) => {
    const ok = confirm("이 모집글을 삭제하시겠습니까?");
    if (!ok) return;

    try {
      await deleteRecruitment(recruitmentId);
      setRecruitments(prev => prev.filter(r => r.id !== recruitmentId));
      setSelectedRecruitment(null);
    } catch (err) {
      console.error("모집글 삭제 실패:", err);
      alert("모집글 삭제 중 오류가 발생했습니다.");
    }
  };

  // 게시글 삭제 핸들러
  const handleDeletePost = async (postId: number) => {
    const ok = confirm("이 게시글을 삭제하시겠습니까?");
    if (!ok) return;

    try {
      await deleteBoardPost(postId);
      // 성공하면 프론트에서도 제거
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSelectedPost(null);
    } catch (err) {
      console.error("게시글 삭제 실패:", err);
      alert("게시글 삭제 중 오류가 발생했습니다.");
    }
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
                    <button onClick={() => setIsNotificationOpen(false)}>
                      <X size={18} />
                    </button>
                  </div>
                  <div className="course-board__notification-list">
                    {notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`course-board__notification-item ${!notif.isRead ? 'course-board__notification-item--unread' : ''}`}
                      >
                        <div className="course-board__notification-content">
                          <p>{notif.content}</p>
                          <span className="course-board__notification-time">{notif.time}</span>
                        </div>
                      </div>
                    ))}
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
              onClick={() => setActiveTab(tab.name)}
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

          {/* 게시글 목록 또는 모집 카드 */}
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
                          </div>
                        </div>
                      </div>
                      
                      <div className="recruitment-card__content">
                        <p className="recruitment-card__description">{recruitment.description}</p>
                      </div>
                      
                      <div className="recruitment-card__footer">
                        <div className="recruitment-card__members">
                          <Users size={18} />
                          <span className={isFull ? "recruitment-card__members-full" : ""}>
                            {recruitment.currentMembers} / {recruitment.maxMembers}명
                          </span>
                          {isFull && <span className="recruitment-card__full-badge">마감</span>}
                        </div>
                        
                        <button 
                          className={`recruitment-card__join-button ${
                            recruitment.isJoined ? "recruitment-card__join-button--joined" : ""
                          } ${isFull && !recruitment.isJoined ? "recruitment-card__join-button--disabled" : ""}`}
                          onClick={(e) => handleJoinRecruitment(recruitment.id, e)}
                          disabled={isFull && !recruitment.isJoined}
                        >
                          {recruitment.isJoined ? "참여 취소" : isFull ? "마감" : "참여하기"}
                        </button>
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

      {/* 플로팅 게시글 작성 버튼 */}
      <button 
        className="course-board__floating-add-button"
        onClick={() => activeTab === "모집" ? setIsCreateRecruitmentOpen(true) : setIsCreatePostOpen(true)}
        aria-label={activeTab === "모집" ? "모집 작성" : "게시글 작성"}
      >
        <Plus size={24} />
      </button>

      {/* 게시글 작성 모달 */}
      {isCreatePostOpen && (
        <div className="course-board__modal-overlay" onClick={() => {
          setPostFiles([]);
          setIsCreatePostOpen(false);
        }}>
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
        <div className="course-board__modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="course-board__modal course-board__modal--large" onClick={(e) => e.stopPropagation()}>
            <div className="course-board__modal-header">
              <h2>게시글</h2>
              <button onClick={() => setSelectedPost(null)}>
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
                <h3>댓글 {selectedPost.comments.length}개</h3>
                <div className="course-board__comments-list">
                  {selectedPost.comments.map((comment) => (
                    <React.Fragment key={comment.id}>
                      <div className="course-board__comment">
                        <div 
                          className="course-board__comment-avatar"
                          style={
                            profileImage && comment.author_id === user?.id
                              ? (profileImage.startsWith('color:') 
                                  ? { background: profileImage.replace('color:', '') }
                                  : { background: 'transparent' })
                              : comment.author_profile_image && comment.author_profile_image.startsWith('color:')
                                ? { background: comment.author_profile_image.replace('color:', '') }
                                : comment.author_profile_image
                                  ? { background: 'transparent' }
                                  : {}
                          }
                        >
                          {renderProfileAvatar(comment.author_id, comment.author_profile_image, 20)}
                        </div>
                        <div className="course-board__comment-content">
                          <div className="course-board__comment-header">
                            <div className="course-board__comment-author-row">
                              <span className="course-board__comment-author">{comment.author}</span>
                              {comment.author === selectedPost.author && (
                                <span className="course-board__comment-author-badge">작성자</span>
                              )}
                              {comment.author_student_id && (
                                <span className="course-board__comment-author-id">{comment.author_student_id}</span>
                              )}
                            </div>
                            <span className="course-board__comment-timestamp">{comment.timestamp}</span>
                          </div>
                          <p className="course-board__comment-text">{comment.content}</p>
                          <div className="course-board__comment-actions">
                            <button 
                              className={`course-board__comment-like ${comment.isLiked ? 'active' : ''}`}
                              onClick={() => handleCommentLike(comment.id)}
                            >
                              <Heart size={14} fill={comment.isLiked ? "currentColor" : "none"} />
                              <span>{comment.likes || 0}</span>
                            </button>
                            <button
                              className="course-board__comment-reply-button"
                              onClick={() => {
                                setReplyTo(comment);
                                setNewComment("");
                              }}
                            >
                              답글 달기
                            </button>
                            {comment.author_id === user?.id && (
                              <button
                                className="course-board__comment-delete-button"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {comment.replies && comment.replies.map((reply) => (
                        <React.Fragment key={reply.id}>
                        <div className="course-board__comment course-board__comment--reply">
                          <div 
                            className="course-board__comment-avatar"
                            style={
                              profileImage && reply.author_id === user?.id
                                ? (profileImage.startsWith('color:') 
                                    ? { background: profileImage.replace('color:', '') }
                                    : { background: 'transparent' })
                                : reply.author_profile_image && reply.author_profile_image.startsWith('color:')
                                  ? { background: reply.author_profile_image.replace('color:', '') }
                                  : reply.author_profile_image
                                    ? { background: 'transparent' }
                                    : {}
                            }
                          >
                            {renderProfileAvatar(reply.author_id, reply.author_profile_image, 20)}
                          </div>
                          <div className="course-board__comment-content">
                            <div className="course-board__comment-header">
                              <div className="course-board__comment-author-row">
                                <span className="course-board__comment-author">{reply.author}</span>
                                {reply.author === selectedPost.author && (
                                  <span className="course-board__comment-author-badge">작성자</span>
                                )}
                                {reply.author_student_id && (
                                  <span className="course-board__comment-author-id">{reply.author_student_id}</span>
                                )}
                              </div>
                              <span className="course-board__comment-timestamp">{reply.timestamp}</span>
                            </div>
                            <p className="course-board__comment-text">{reply.content}</p>
                            <div className="course-board__comment-actions">
                              <button 
                                className={`course-board__comment-like ${reply.isLiked ? 'active' : ''}`}
                                onClick={() => handleCommentLike(reply.id)}
                              >
                                <Heart size={14} fill={reply.isLiked ? "currentColor" : "none"} />
                                <span>{reply.likes || 0}</span>
                              </button>
                              {reply.author_id === user?.id && (
                                <button
                                  className="course-board__comment-delete-button"
                                  onClick={() => handleDeleteComment(reply.id)}
                                >
                                  삭제
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* 댓글 작성 */}
              <div className="course-board__comment-write">
                {replyTo && (
                  <div className="course-board__reply-info">
                    <span>{replyTo.author} 답글</span>
                    <button
                      className="course-board__reply-cancel"
                      onClick={() => setReplyTo(null)}
                    >
                      취소
                    </button>
                  </div>
                )}
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
                    {replyTo && (
                      <span className="course-board__mention-tag">@{replyTo.author}</span>
                    )}
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
                  </div>
                  <button 
                    className="course-board__comment-submit"
                    onClick={handleAddComment}
                  >
                    <Send size={18} />
                  </button>
                </div>
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
        <div className="course-board__modal-overlay" onClick={() => setIsCreateRecruitmentOpen(false)}>
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
        <div className="course-board__modal-overlay" onClick={() => setSelectedRecruitment(null)}>
          <div className="course-board__modal course-board__modal--large" onClick={(e) => e.stopPropagation()}>
            <div className="course-board__modal-header">
              <h2>모집 상세</h2>
              <button onClick={() => setSelectedRecruitment(null)}>
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
                    <span className="course-board__post-author-name">{selectedRecruitment.author}</span>
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
                      </div>
                      {index === 0 && <span className="recruitment-detail-member__badge">리더</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* 참여 / 삭제 버튼 */}
              <div className="course-board__detail-actions">
                <div className="recruitment-detail-actions">
                  <button 
                    className={`recruitment-detail-join-button ${
                      selectedRecruitment.isJoined ? "recruitment-detail-join-button--joined" : ""
                    } ${selectedRecruitment.currentMembers >= selectedRecruitment.maxMembers && !selectedRecruitment.isJoined ? "recruitment-detail-join-button--disabled" : ""}`}
                    onClick={() => {
                      handleJoinRecruitment(selectedRecruitment.id);
                      // 상태 업데이트를 반영하기 위해 모달도 업데이트
                      const updated = recruitments.find(r => r.id === selectedRecruitment.id);
                      if (updated) setSelectedRecruitment(updated);
                    }}
                    disabled={selectedRecruitment.currentMembers >= selectedRecruitment.maxMembers && !selectedRecruitment.isJoined}
                  >
                    <Users size={20} />
                    <span>
                      {selectedRecruitment.isJoined 
                        ? "참여 취소" 
                        : selectedRecruitment.currentMembers >= selectedRecruitment.maxMembers 
                          ? "마감" 
                          : "참여하기"}
                    </span>
                  </button>
                  
                  {/* 삭제 버튼 (본인 글인 경우만) */}
                  {selectedRecruitment.author_id === user?.id && (
                    <button 
                      className="recruitment-detail-delete-button"
                      onClick={() => handleDeleteRecruitment(selectedRecruitment.id)}
                      title="모집글 삭제"
                    >
                      <Trash2 size={18} />
                      <span>삭제</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
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
  Trash2
} from "lucide-react";
import "./professor-courseboard.css";
import "../StudentCourseBoardPage/student-courseboard.css";

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
  timestamp: string;
  category: string;
  tags: string[];
  likes: number;
  comments: Comment[];
  isPinned?: boolean;
  isLiked?: boolean;
}

interface Comment {
  id: number;
  author: string;
  content: string;
  timestamp: string;
}

interface Notification {
  id: number;
  content: string;
  course: string;
  time: string;
  isRead: boolean;
}

interface TeamRecruitment {
  id: number;
  title: string;
  description: string;
  author: string;
  timestamp: string;
  maxMembers: number;
  currentMembers: number;
  membersList: string[];
  isJoined: boolean;
}

export default function CourseBoardPage({ course, onBack, onNavigate }: CourseBoardPageProps) {
  const [activeTab, setActiveTab] = useState("공지");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newComment, setNewComment] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  
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
  
  // 모집 데이터
  const [recruitments, setRecruitments] = useState<TeamRecruitment[]>([
    {
      id: 1,
      title: "알고리즘 스터디 멤버 모집",
      description: "매주 금요일 저녁 7시에 모여서 알고리즘 문제를 풀이합니다. 백준, 프로그래머스 등의 플랫폼을 활용하며, 함께 성장하실 분들을 모집합니다!",
      author: "김민수",
      timestamp: "2025. 10. 24. 16:00",
      maxMembers: 4,
      currentMembers: 2,
      membersList: ["김민수", "이지은"],
      isJoined: false
    },
    {
      id: 2,
      title: "프로젝트 팀원 모집 (웹 개발)",
      description: "웹 프로그래밍 팀 프로젝트를 함께할 팀원을 모집합니다. React, Node.js 경험자 우대하며, 열정적으로 참여해주실 분들을 기다립니다.",
      author: "박서준",
      timestamp: "2025. 10. 25. 10:30",
      maxMembers: 5,
      currentMembers: 3,
      membersList: ["박서준", "최수연", "정민호"],
      isJoined: false
    },
    {
      id: 3,
      title: "데이터베이스 과제 스터디",
      description: "데이터베이스 과목 과제를 함께 공부할 팀원을 찾습니다. SQL 쿼리 작성과 ERD 설계를 중점적으로 다룹니다.",
      author: "이준호",
      timestamp: "2025. 10. 26. 09:15",
      maxMembers: 4,
      currentMembers: 2,
      membersList: ["이준호", "김지수"],
      isJoined: false
    },
    {
      id: 4,
      title: "운영체제 스터디원 모집",
      description: "운영체제 과목 중간고사 대비 스터디를 진행합니다. 주 2회(화, 목) 만나서 개념 정리 및 문제 풀이를 진행할 예정입니다.",
      author: "최수연",
      timestamp: "2025. 10. 26. 14:20",
      maxMembers: 3,
      currentMembers: 3,
      membersList: ["최수연", "강민지", "박민준"],
      isJoined: false
    }
  ]);

  // 상단 탭 메뉴
  const tabs = [
    { id: "notice", name: "공지", icon: Bell },
    { id: "recruit", name: "모집", icon: Users },
    { id: "community", name: "커뮤니티", icon: MessageCircle },
  ];

  // 샘플 게시글 데이터
  const [posts, setPosts] = useState<Post[]>([
    {
      id: 1,
      title: "이번 SMS, 이메일로 공지를 한꺼번에, 여러 분산 앱은 팀별로 분산된 일을 팀 공지시키 상태를 현지화니다. 스마트하드도 중요시키 밀집으로 만들니다 만집과도 밀집으로",
      content: "중요한 공지사항입니다. 모든 학생들은 이 내용을 숙지해 주시기 바랍니다. 다음 주 월요일까지 관련 서류를 제출해 주세요.",
      author: "박선생",
      timestamp: "2025. 10. 27. 14:30",
      category: "공지",
      tags: ["공지", "중요공지"],
      likes: 0,
      comments: [],
      isPinned: true,
      isLiked: false
    },
    {
      id: 2,
      title: "팀 프로젝트 회의 일정 투표",
      content: "이번 주 회의 일정을 투표로 정하겠습니다. 가능한 시간을 댓글로 남겨주세요.",
      author: "김민수",
      timestamp: "2025. 10. 26. 09:15",
      category: "커뮤니티",
      tags: ["팀활동", "회의"],
      likes: 5,
      comments: [
        { id: 1, author: "이지은", content: "화요일 2시 가능합니다!", timestamp: "2025. 10. 26. 14:30" },
        { id: 2, author: "최수연", content: "수요일 3시 좋아요", timestamp: "2025. 10. 26. 15:20" }
      ],
      isLiked: false
    },
    {
      id: 3,
      title: "과제 관련 질문있습니다",
      content: "3번 문제 어떻게 푸셨나요? 힌트 좀 주실 수 있을까요?",
      author: "이지은",
      timestamp: "2025. 10. 25. 18:45",
      category: "커뮤니티",
      tags: ["과제", "질문"],
      likes: 3,
      comments: [
        { id: 1, author: "박민준", content: "먼저 배열을 정렬해보세요", timestamp: "2025. 10. 25. 19:10" }
      ],
      isLiked: false
    },
    {
      id: 4,
      title: "스터디 그룹 멤버 모집",
      content: "알고리즘 스터디 멤버 2명 더 구합니다. 매주 금요일 저녁 7시에 모여서 문제 풀이합니다!",
      author: "최수연",
      timestamp: "2025. 10. 24. 16:00",
      category: "모집",
      tags: ["모집", "스터디"],
      likes: 7,
      comments: [],
      isLiked: false
    },
  ]);

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

  const formatDateTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}. ${month}. ${day}. ${hours}:${minutes}`;
  };

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    const newPost: Post = {
      id: posts.length + 1,
      title: newPostTitle,
      content: newPostContent,
      author: "나",
      timestamp: formatDateTime(new Date()),
      category: activeTab,
      tags: [],
      likes: 0,
      comments: [],
      isLiked: false
    };

    setPosts([newPost, ...posts]);
    setNewPostTitle("");
    setNewPostContent("");
    setIsCreatePostOpen(false);
  };

  const handleLikePost = (postId: number) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1,
          isLiked: !post.isLiked
        };
      }
      return post;
    }));

    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost({
        ...selectedPost,
        likes: selectedPost.isLiked ? selectedPost.likes - 1 : selectedPost.likes + 1,
        isLiked: !selectedPost.isLiked
      });
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedPost) return;

    const comment: Comment = {
      id: selectedPost.comments.length + 1,
      author: "나",
      content: newComment,
      timestamp: formatDateTime(new Date())
    };

    const updatedPosts = posts.map(post => {
      if (post.id === selectedPost.id) {
        return {
          ...post,
          comments: [...post.comments, comment]
        };
      }
      return post;
    });

    setPosts(updatedPosts);
    setSelectedPost({
      ...selectedPost,
      comments: [...selectedPost.comments, comment]
    });
    setNewComment("");
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  // 모집 참여/취소 핸들러
  const handleJoinRecruitment = (recruitmentId: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setRecruitments(recruitments.map(recruitment => {
      if (recruitment.id === recruitmentId) {
        if (recruitment.isJoined) {
          // 참여 취소
          return {
            ...recruitment,
            currentMembers: recruitment.currentMembers - 1,
            membersList: recruitment.membersList.filter(name => name !== "나"),
            isJoined: false
          };
        } else {
          // 참여하기
          if (recruitment.currentMembers >= recruitment.maxMembers) {
            alert("이미 인원이 가득 찼습니다.");
            return recruitment;
          }
          return {
            ...recruitment,
            currentMembers: recruitment.currentMembers + 1,
            membersList: [...recruitment.membersList, "나"],
            isJoined: true
          };
        }
      }
      return recruitment;
    }));
  };

  // 모집 생성 핸들러
  const handleCreateRecruitment = () => {
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

    const recruitment: TeamRecruitment = {
      id: recruitments.length + 1,
      title: newRecruitment.title,
      description: newRecruitment.description,
      author: "나",
      timestamp: formatDateTime(new Date()),
      maxMembers: newRecruitment.maxMembers,
      currentMembers: 1,
      membersList: ["나"],
      isJoined: true
    };

    setRecruitments([recruitment, ...recruitments]);
    setNewRecruitment({ title: "", description: "", maxMembers: 3 });
    setIsCreateRecruitmentOpen(false);
  };

  // 모집 삭제 핸들러
  const handleDeleteRecruitment = (recruitmentId: number) => {
    if (confirm("이 모집글을 삭제하시겠습니까?")) {
      setRecruitments(recruitments.filter(r => r.id !== recruitmentId));
      setSelectedRecruitment(null);
    }
  };

  // 게시글 삭제 핸들러
  const handleDeletePost = (postId: number) => {
    if (confirm("이 게시글을 삭제하시겠습니까?")) {
      setPosts(posts.filter(p => p.id !== postId));
      setSelectedPost(null);
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
            onClick={() => onNavigate('mypage')}
          >
            <User size={20} />
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
                          <User size={16} />
                          <span>{recruitment.author}</span>
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
                    <div className="course-board__post-avatar">
                      <User size={20} />
                    </div>
                    <div className="course-board__post-meta">
                      <span className="course-board__post-author-name">{post.author}</span>
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
                      <span>댓글 {post.comments.length}</span>
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
        <div className="course-board__modal-overlay" onClick={() => setIsCreatePostOpen(false)}>
          <div className="course-board__modal" onClick={(e) => e.stopPropagation()}>
            <div className="course-board__modal-header">
              <h2>게시글 작성</h2>
              <button onClick={() => setIsCreatePostOpen(false)}>
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
            </div>
            <div className="course-board__modal-footer">
              <button 
                className="course-board__modal-button course-board__modal-button--cancel"
                onClick={() => setIsCreatePostOpen(false)}
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
                  <div className="course-board__post-avatar">
                    <User size={24} />
                  </div>
                  <div className="course-board__post-meta">
                    <span className="course-board__post-author-name">{selectedPost.author}</span>
                    <span className="course-board__post-timestamp">{selectedPost.timestamp}</span>
                  </div>
                </div>
              </div>

              {/* 게시글 내용 */}
              <div className="course-board__detail-content">
                <h2>{selectedPost.title}</h2>
                <p>{selectedPost.content}</p>
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
                    <div key={comment.id} className="course-board__comment">
                      <div className="course-board__comment-avatar">
                        <User size={20} />
                      </div>
                      <div className="course-board__comment-content">
                        <div className="course-board__comment-header">
                          <span className="course-board__comment-author">{comment.author}</span>
                          <span className="course-board__comment-timestamp">{comment.timestamp}</span>
                        </div>
                        <p className="course-board__comment-text">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 댓글 작성 */}
              <div className="course-board__comment-write">
                <div className="course-board__comment-avatar">
                  <User size={20} />
                </div>
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
                <button 
                  className="course-board__comment-submit"
                  onClick={handleAddComment}
                >
                  <Send size={18} />
                </button>
              </div>
              
              {/* 삭제 버튼 (본인 글인 경우만) */}
              {selectedPost.author === "나" && (
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
                  <div className="course-board__post-avatar">
                    <User size={24} />
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
                  {selectedRecruitment.membersList.map((member, index) => (
                    <div key={index} className="recruitment-detail-member">
                      <div className="recruitment-detail-member__avatar">
                        <User size={18} />
                      </div>
                      <span className="recruitment-detail-member__name">{member}</span>
                      {index === 0 && <span className="recruitment-detail-member__badge">리더</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* 참여 버튼 */}
              <div className="course-board__detail-actions">
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
                {selectedRecruitment.author === "나" && (
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
      )}
    </div>
  );
}

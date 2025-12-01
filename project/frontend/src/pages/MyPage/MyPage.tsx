import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Bell, Camera, Save, ArrowLeft, Check, Lock, Palette, Shield, FileText, Eye, EyeOff, UserX, X } from "lucide-react";
import "./my-page.css";
import { getProfile, updateProfile, changePassword, deleteAccount } from "../../api/profile";
import { useAuth } from "../../contexts/AuthContext";
import AlertDialog from "../Alert/AlertDialog";
import SuccessAlert from "../Alert/SuccessAlert";
import {
  writeProfileImageToStorage,
  readProfileImageFromStorage,
  notifyProfileImageUpdated,
} from "../../utils/profileImage";

interface MyPageProps {
  onNavigate: (page: string, type?: 'student' | 'professor') => void;
}

type MenuSection = 'profile' | 'security' | 'notifications' | 'appearance' | 'legal';

export default function MyPage({ onNavigate }: MyPageProps) {
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<MenuSection>('profile');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  // profileColor는 현재 사용되지 않지만 향후 사용을 위해 유지
  const [, setProfileColor] = useState("#a855f7");
  const [customColor, setCustomColor] = useState("#a855f7");
  const [name, setName] = useState("홍길동");
  const [email, setEmail] = useState("hong@example.com");
  const [studentId, setStudentId] = useState("20231234");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    teamActivity: true,
    announcements: true,
    scheduleChanges: true
  });
  // appearance는 향후 사용을 위해 주석 처리
  // const [appearance, setAppearance] = useState({
  //   compactView: false,
  //   showAvatars: true
  // });
  const [isSaved, setIsSaved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIdentifier, setDeleteIdentifier] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    setProfileImage(readProfileImageFromStorage(user?.id) || null);
  }, [user?.id]);

  // 초기 프로필 정보 설정 (useAuth의 user로 즉시 표시, 깜빡임 방지)
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setStudentId(user.student_id || "");
    }
  }, [user]);

  // 프로필 상세 정보 로드 (초기 마운트 시에만)
  useEffect(() => {
    let isMounted = true;

    async function fetchProfile() {
      // AuthContext가 로딩 중이면 대기
      if (authLoading) {
        return;
      }

      // 회원탈퇴 진행 중이면 리다이렉트 방지
      if (isDeletingAccount) {
        return;
      }

      // user가 없으면 로그인 필요
      if (!user) {
        if (isMounted) {
          setAlertMessage("로그인이 필요합니다.");
          setShowAlert(true);
          setTimeout(() => onNavigate("login"), 1500);
        }
        return;
      }

      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      
      if (!token) {
        if (isMounted) {
          setAlertMessage("로그인이 필요합니다.");
          setShowAlert(true);
          setTimeout(() => onNavigate("login"), 1500);
        }
        return;
      }

      try {
        const data = await getProfile();
        if (!isMounted) return; // 컴포넌트 unmount되면 중단

        if (data.profile) {
          // 서버에서 받은 최신 정보로 업데이트
          setName(data.profile.name);
          setEmail(data.profile.email);
          setStudentId(data.profile.student_id || "");
          
          if (data.profile.profile_image) {
            setProfileImage(data.profile.profile_image);
            writeProfileImageToStorage(user.id, data.profile.profile_image);
            notifyProfileImageUpdated({
              userId: user.id,
              profileImage: data.profile.profile_image,
            });
          } else {
            setProfileImage(null);
            writeProfileImageToStorage(user.id, null);
            notifyProfileImageUpdated({ userId: user.id, profileImage: null });
          }
        } else if (data.error === "UNAUTHORIZED" || data.status === 401 || data.status === 422) {
          localStorage.removeItem("token");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          localStorage.removeItem("currentUser");
          setAlertMessage("로그인이 필요합니다.");
          setShowAlert(true);
          setTimeout(() => onNavigate("login"), 1500);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("프로필 로드 오류:", error);
        setAlertMessage("프로필을 불러오는 중 오류가 발생했습니다.");
        setShowAlert(true);
      }
    }
    
    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, []); // 빈 배열 - 초기 마운트 시에만 실행


  const presetAvatars = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Princess",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasmine",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucy",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma"
  ];

  const solidColors = [
    "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", 
    "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16", "#f97316"
  ];

  const handleImageSelect = (imageUrl: string) => {
    setProfileImage(imageUrl);
  };

  const handleColorSelect = (color: string) => {
    setProfileColor(color);
    setProfileImage(`color:${color}`);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    setProfileColor(color);
    setProfileImage(`color:${color}`);
  };

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key]
    });
  };

  // handleAppearanceToggle 함수는 현재 사용되지 않음
  // const handleAppearanceToggle = (key: keyof typeof appearance) => {
  //   setAppearance({
  //     ...appearance,
  //     [key]: !appearance[key]
  //   });
  // };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setAlertMessage("새 비밀번호가 일치하지 않습니다.");
      setShowAlert(true);
      return;
    }
    if (newPassword.length < 8) {
      setAlertMessage("비밀번호는 8자 이상이어야 합니다.");
      setShowAlert(true);
      return;
    }
    try {
    const res = await changePassword(currentPassword, newPassword);
    if (res.message) {
      setAlertMessage(res.message);
      setShowAlert(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setAlertMessage(res.error || "비밀번호 변경 실패");
      setShowAlert(true);
    }
  } catch (error) {
    setAlertMessage("서버 오류가 발생했습니다.");
    setShowAlert(true);
    console.error(error);
  }
  };

  const handleSave = async () => {
  try {
    // 백엔드에서 처리하는 필드만 전송
    const updateData = {
      name,
      email,
      profileImage,
    };

    console.log("서버로 전송할 데이터:", updateData);

    const res = await updateProfile(updateData);
    if (res.message && res.profile) {
      // 프로필 저장 후 localStorage에 저장하여 다른 페이지에서 즉시 사용할 수 있도록 함
      writeProfileImageToStorage(user?.id, profileImage);
      notifyProfileImageUpdated({ userId: user?.id, profileImage });
      
      // currentUser 업데이트
      const currentUser = localStorage.getItem("currentUser");
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          const updatedUser = { ...userData, ...res.profile };
          localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        } catch (e) {
          console.error("currentUser 업데이트 오류:", e);
        }
      }
      
      setAlertMessage(res.message);
      setShowAlert(true);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } else {
      setAlertMessage("프로필 저장 실패");
      setShowAlert(true);
    }
  } catch (error) {
    console.error("프로필 업데이트 오류:", error);
    setAlertMessage("서버 오류가 발생했습니다.");
    setShowAlert(true);
  }
  };

  const handleDeleteAccount = async () => {
    if (!deleteIdentifier.trim()) {
      setAlertMessage("아이디 또는 이메일을 입력해주세요.");
      setShowAlert(true);
      return;
    }
    if (!deletePassword.trim()) {
      setAlertMessage("비밀번호를 입력해주세요.");
      setShowAlert(true);
      return;
    }

    try {
      const res = await deleteAccount(deleteIdentifier, deletePassword);
      console.log("회원탈퇴 응답:", res);
      if (res.message) {
        // 회원탈퇴 진행 중 플래그 설정
        setIsDeletingAccount(true);
        setShowDeleteModal(false);
        // 성공 메시지 표시
        setSuccessMessage(res.message || "회원 탈퇴가 완료되었습니다.");
        setShowSuccess(true);
      } else {
        setAlertMessage(res.error || "회원탈퇴 실패");
        setShowAlert(true);
      }
    } catch (error) {
      setAlertMessage("서버 오류가 발생했습니다.");
      setShowAlert(true);
      console.error(error);
    }
  };


  const menuItems = [
    { id: 'profile' as MenuSection, label: '프로필 정보', icon: User },
    { id: 'security' as MenuSection, label: '보안', icon: Lock },
    { id: 'notifications' as MenuSection, label: '알림 설정', icon: Bell },
    { id: 'legal' as MenuSection, label: '약관 및 정책', icon: FileText }
  ];

  // AuthContext가 로딩 중이면 로딩 표시
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f9fafb'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #a855f7',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div className="mypage">
      {/* 헤더 */}
      <header className="mypage__header">
        <div className="mypage__header-content">
          <button 
            className="mypage__back-button"
            onClick={() => {
              // courseboard에서 온 경우 확인
              const returnToCourseboard = localStorage.getItem('returnToCourseboard');
              if (returnToCourseboard) {
                try {
                  const courseInfo = JSON.parse(returnToCourseboard);
                  localStorage.removeItem('returnToCourseboard');
                  
                  // React Router로 부드럽게 이동 (replace로 대시보드 히스토리 건너뛰기)
                  if (user?.user_type === 'student') {
                    navigate(`/student-dashboard/course/${courseInfo.courseId}`, { replace: true });
                  } else if (user?.user_type === 'professor') {
                    navigate(`/professor-dashboard/course/${courseInfo.courseId}`, { replace: true });
                  }
                  return;
                } catch (e) {
                  console.error('returnToCourseboard 파싱 오류:', e);
                  localStorage.removeItem('returnToCourseboard');
                }
              }
              
              // 일반적인 경우 - Dashboard로 이동
              if (user?.user_type === 'student') {
                navigate('/student-dashboard', { replace: true });
              } else if (user?.user_type === 'professor') {
                navigate('/professor-dashboard', { replace: true });
              } else {
                navigate('/', { replace: true });
              }
            }}
            title="뒤로가기"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      </header>

      <div className="mypage__container">
        {/* 사이드바 */}
        <aside className="mypage__sidebar">
          {/* 프로필 카드 */}
          <div className="mypage__profile-card">
            <div className="mypage__profile-avatar">
              {profileImage ? (
                profileImage.startsWith('color:') ? (
                  <div 
                    className="mypage__profile-avatar-solid"
                    style={{ background: profileImage.replace('color:', '') }}
                  >
                    <User size={40} color="white" />
                  </div>
                ) : (
                  <img src={profileImage} alt="Profile" />
                )
              ) : (
                <div className="mypage__profile-avatar-placeholder">
                  <User size={40} />
                </div>
              )}
            </div>
            <div className="mypage__profile-info">
              <h2>{name}</h2>
              <p>{email}</p>
              <span className="mypage__profile-badge">{studentId}</span>
            </div>
          </div>

          {/* 메뉴 */}
          <nav className="mypage__menu">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`mypage__menu-item ${activeSection === item.id ? 'mypage__menu-item--active' : ''}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className="mypage__content">
          {/* 프로필 정보 섹션 */}
          {activeSection === 'profile' && (
            <div className="mypage__section">
              <div className="mypage__section-header">
                <User size={24} />
                <div>
                  <h2>프로필 정보</h2>
                  <p>개인 정보를 관리하고 프로필 사진을 변경하세요</p>
                </div>
              </div>

              <div className="mypage__section-content">
                {/* 프로필 사진 변경 */}
                <div className="mypage__content-block">
                  <h3 className="mypage__block-title">
                    <Camera size={18} />
                    캐릭터 프로필 사진
                  </h3>
                  <div className="mypage__avatar-grid">
                    {presetAvatars.map((avatar, index) => (
                      <button
                        key={index}
                        className={`mypage__avatar-option ${profileImage === avatar ? 'mypage__avatar-option--active' : ''}`}
                        onClick={() => handleImageSelect(avatar)}
                      >
                        <img src={avatar} alt={`Avatar ${index + 1}`} />
                        {profileImage === avatar && (
                          <div className="mypage__avatar-check">
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 단색 프로필 사진 */}
                <div className="mypage__content-block">
                  <h3 className="mypage__block-title">
                    <Palette size={18} />
                    단색 프로필 사진
                  </h3>
                  <div className="mypage__color-section">
                    <div className="mypage__color-grid">
                      {solidColors.map((color, index) => (
                        <button
                          key={index}
                          className={`mypage__color-option ${profileImage === `color:${color}` ? 'mypage__color-option--active' : ''}`}
                          onClick={() => handleColorSelect(color)}
                          style={{ background: color }}
                        >
                          {profileImage === `color:${color}` && (
                            <div className="mypage__color-check">
                              <Check size={14} color="white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="mypage__color-picker-wrapper">
                      <label className="mypage__color-picker-label">
                        <Palette size={16} />
                        커스텀 색상 선택
                      </label>
                      <div className="mypage__color-picker">
                        <input
                          type="color"
                          value={customColor}
                          onChange={handleCustomColorChange}
                          className="mypage__color-input"
                        />
                        <span className="mypage__color-value">{customColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 기본 정보 */}
                <div className="mypage__content-block">
                  <h3 className="mypage__block-title">기본 정보</h3>
                  <div className="mypage__form">
                    <div className="mypage__form-row">
                      <label>학번</label>
                      <input
                        type="text"
                        value={studentId}
                        disabled
                        className="mypage__input mypage__input--disabled"
                      />
                    </div>
                    <div className="mypage__form-row">
                      <label>이름</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mypage__input"
                        placeholder="이름을 입력하세요"
                      />
                    </div>
                    <div className="mypage__form-row">
                      <label>
                        <Mail size={14} />
                        이메일
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mypage__input"
                        placeholder="이메일을 입력하세요"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 알림 설정 섹션 */}
          {activeSection === 'notifications' && (
            <div className="mypage__section">
              <div className="mypage__section-header">
                <Bell size={24} />
                <div>
                  <h2>알림 설정</h2>
                  <p>받고 싶은 알림을 선택하세요</p>
                </div>
              </div>

              <div className="mypage__section-content">
                <div className="mypage__content-block">
                  <div className="mypage__notification-list">
                    <div className="mypage__notification-item">
                      <div className="mypage__notification-info">
                        <h4>팀 활동 알림</h4>
                        <p>팀 게시판의 새 글과 댓글 알림을 받습니다</p>
                      </div>
                      <label className="mypage__switch">
                        <input
                          type="checkbox"
                          checked={notifications.teamActivity}
                          onChange={() => handleNotificationToggle('teamActivity')}
                        />
                        <span className="mypage__switch-slider"></span>
                      </label>
                    </div>

                    <div className="mypage__notification-item">
                      <div className="mypage__notification-info">
                        <h4>공지사항 알림</h4>
                        <p>강의 공지사항이 올라오면 알림을 받습니다</p>
                      </div>
                      <label className="mypage__switch">
                        <input
                          type="checkbox"
                          checked={notifications.announcements}
                          onChange={() => handleNotificationToggle('announcements')}
                        />
                        <span className="mypage__switch-slider"></span>
                      </label>
                    </div>

                    <div className="mypage__notification-item">
                      <div className="mypage__notification-info">
                        <h4>일정 변경 알림</h4>
                        <p>회의 일정이 변경되면 알림을 받습니다</p>
                      </div>
                      <label className="mypage__switch">
                        <input
                          type="checkbox"
                          checked={notifications.scheduleChanges}
                          onChange={() => handleNotificationToggle('scheduleChanges')}
                        />
                        <span className="mypage__switch-slider"></span>
                      </label>
                    </div>


                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 보안 섹션 */}
          {activeSection === 'security' && (
            <div className="mypage__section">
              <div className="mypage__section-header">
                <Lock size={24} />
                <div>
                  <h2>보안</h2>
                  <p>비밀번호를 변경하여 계정을 안전하게 보호하세요</p>
                </div>
              </div>

              <div className="mypage__section-content">
                <div className="mypage__content-block">
                  <h3 className="mypage__block-title">
                    <Lock size={18} />
                    비밀번호 변경
                  </h3>
                  <div className="mypage__form">
                    <div className="mypage__form-row">
                      <label>현재 비밀번호</label>
                      <div className="mypage__password-wrapper">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="mypage__input"
                          placeholder="현재 비밀번호를 입력하세요"
                        />
                        <button
                          type="button"
                          className="mypage__password-toggle"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="mypage__form-row">
                      <label>새 비밀번호</label>
                      <div className="mypage__password-wrapper">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="mypage__input"
                          placeholder="새 비밀번호를 입력하세요 (8자 이상)"
                        />
                        <button
                          type="button"
                          className="mypage__password-toggle"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="mypage__form-row">
                      <label>새 비밀번호 확인</label>
                      <div className="mypage__password-wrapper">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="mypage__input"
                          placeholder="새 비밀번호를 다시 입력하세요"
                        />
                        <button
                          type="button"
                          className="mypage__password-toggle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <button 
                      className="mypage__password-change-button"
                      onClick={handlePasswordChange}
                    >
                      <Lock size={18} />
                      비밀번호 변경
                    </button>
                  </div>
                </div>

                {/* 회원탈퇴 */}
                <div className="mypage__content-block">
                  <h3 className="mypage__block-title">
                    <UserX size={18} />
                    회원탈퇴
                  </h3>
                  <div className="mypage__delete-section">
                    <p className="mypage__delete-warning">
                      회원탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
                    </p>
                    <button 
                      className="mypage__delete-button"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      <UserX size={18} />
                      회원탈퇴
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* 약관 및 정책 섹션 */}
          {activeSection === 'legal' && (
            <div className="mypage__section">
              <div className="mypage__section-header">
                <FileText size={24} />
                <div>
                  <h2>약관 및 정책</h2>
                  <p>서비스 이용약관과 개인정보 처리방침을 확인하세요</p>
                </div>
              </div>

              <div className="mypage__section-content">
                <div className="mypage__content-block">
                  <div className="mypage__legal-list">
                    <div className="mypage__legal-item">
                      <div className="mypage__legal-info">
                        <Shield size={20} />
                        <div>
                          <h4>서비스 이용약관</h4>
                          <p>All Meet 서비스 이용에 관한 약관입니다</p>
                        </div>
                      </div>
                      <button className="mypage__legal-button">
                        보기
                      </button>
                    </div>

                    <div className="mypage__legal-item">
                      <div className="mypage__legal-info">
                        <Shield size={20} />
                        <div>
                          <h4>개인정보 처리방침</h4>
                          <p>개인정보의 수집, 이용, 제공에 관한 방침입니다</p>
                        </div>
                      </div>
                      <button className="mypage__legal-button">
                        보기
                      </button>
                    </div>

                    <div className="mypage__legal-item">
                      <div className="mypage__legal-info">
                        <FileText size={20} />
                        <div>
                          <h4>오픈소스 라이선스</h4>
                          <p>사용된 오픈소스 라이브러리의 라이선스 정보입니다</p>
                        </div>
                      </div>
                      <button className="mypage__legal-button">
                        보기
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mypage__content-block">
                  <div className="mypage__app-info">
                    <h4>웹 정보</h4>
                    <div className="mypage__info-row">
                      <span>버전</span>
                      <span>1.0.0</span>
                    </div>
                    <div className="mypage__info-row">
                      <span>최종 업데이트</span>
                      <span>2025년 1월 10일</span>
                    </div>
                    <div className="mypage__info-row">
                      <span>개발팀</span>
                      <span>All Meet Team</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 저장 버튼 */}
          <div className="mypage__footer">
            <button 
              className={`mypage__save-button ${isSaved ? 'mypage__save-button--saved' : ''}`}
              onClick={handleSave}
              disabled={isSaved}
            >
              {isSaved ? (
                <>
                  <Check size={20} />
                  저장되었습니다
                </>
              ) : (
                <>
                  <Save size={20} />
                  변경사항 저장
                </>
              )}
            </button>
          </div>
        </main>
      </div>

      {/* 회원탈퇴 모달 */}
      {showDeleteModal && (
        <div className="mypage__modal-overlay">
          <div className="mypage__modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="mypage__modal-header">
              <h3>회원탈퇴</h3>
              <button 
                className="mypage__modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="mypage__modal-body">
              <p className="mypage__modal-warning">
                회원탈퇴를 진행하려면 아이디 또는 이메일과 비밀번호를 입력해주세요.
                <br />
                <strong>이 작업은 되돌릴 수 없습니다.</strong>
              </p>
              <div className="mypage__form">
                <div className="mypage__form-row">
                  <label>
                    <Mail size={14} />
                    아이디 또는 이메일
                  </label>
                  <input
                    type="text"
                    value={deleteIdentifier}
                    onChange={(e) => setDeleteIdentifier(e.target.value)}
                    className="mypage__input"
                    placeholder="아이디 또는 이메일을 입력하세요"
                  />
                </div>
                <div className="mypage__form-row">
                  <label>
                    <Lock size={14} />
                    비밀번호
                  </label>
                  <div className="mypage__password-wrapper">
                    <input
                      type={showDeletePassword ? "text" : "password"}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="mypage__input"
                      placeholder="비밀번호를 입력하세요"
                    />
                    <button
                      type="button"
                      className="mypage__password-toggle"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                    >
                      {showDeletePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mypage__modal-footer">
              <button 
                className="mypage__modal-cancel"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteIdentifier("");
                  setDeletePassword("");
                }}
              >
                취소
              </button>
              <button 
                className="mypage__modal-delete"
                onClick={handleDeleteAccount}
              >
                <UserX size={18} />
                회원탈퇴
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 성공 알림 */}
      <SuccessAlert
        message={successMessage}
        show={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          // 메시지가 닫힌 후 로그아웃 및 홈페이지로 이동
          logout();
          navigate('/');
        }}
        autoCloseDelay={2000}
      />

      {/* 안내창 */}
      <AlertDialog
        message={alertMessage}
        show={showAlert}
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
}

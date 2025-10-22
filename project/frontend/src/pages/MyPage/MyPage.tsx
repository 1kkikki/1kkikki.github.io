import React, { useState } from "react";
import { User, Mail, Bell, Camera, Save, ArrowLeft, Check, Settings, Lock, Palette, Shield, FileText, Eye, EyeOff } from "lucide-react";
import "./my-page.css";

interface MyPageProps {
  onNavigate: (page: string) => void;
}

type MenuSection = 'profile' | 'security' | 'notifications' | 'appearance' | 'legal';

export default function MyPage({ onNavigate }: MyPageProps) {
  const [activeSection, setActiveSection] = useState<MenuSection>('profile');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileColor, setProfileColor] = useState("#a855f7");
  const [customColor, setCustomColor] = useState("#a855f7");
  const [name, setName] = useState("홍길동");
  const [email, setEmail] = useState("hong@example.com");
  const [studentId] = useState("20231234");
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
  const [appearance, setAppearance] = useState({
    compactView: false,
    showAvatars: true
  });
  const [isSaved, setIsSaved] = useState(false);

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

  const handleAppearanceToggle = (key: keyof typeof appearance) => {
    setAppearance({
      ...appearance,
      [key]: !appearance[key]
    });
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      alert("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 8) {
      alert("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    console.log("비밀번호 변경:", { currentPassword, newPassword });
    alert("비밀번호가 변경되었습니다.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSave = () => {
    console.log("Saving profile:", { name, email, notifications, appearance, profileImage });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const menuItems = [
    { id: 'profile' as MenuSection, label: '프로필 정보', icon: User },
    { id: 'security' as MenuSection, label: '보안', icon: Lock },
    { id: 'notifications' as MenuSection, label: '알림 설정', icon: Bell },
    { id: 'legal' as MenuSection, label: '약관 및 정책', icon: FileText }
  ];

  return (
    <div className="mypage">
      {/* 헤더 */}
      <header className="mypage__header">
        <div className="mypage__header-content">
          <button 
            className="mypage__back-button"
            onClick={() => onNavigate('dashboard')}
            title="대시보드로 돌아가기"
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
    </div>
  );
}

import { useState, useEffect } from "react";
import { Clock, Calendar, Users, Bell, CheckCircle, ArrowRight, Sparkles, Layout, Clock3 } from "lucide-react";
import "./home-page.css";
import { ImageWithFallback } from "../../../components/figma/ImageWithFallback";

import homepage1 from "../../assets/homepage1.png";
import homepage2 from "../../assets/homepage2.png";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="home-page">
      {/* Background */}
      <div className="home-page__background"></div>
      <div className="home-page__gradient-orb home-page__gradient-orb--1"></div>
      <div className="home-page__gradient-orb home-page__gradient-orb--2"></div>
      <div className="home-page__gradient-orb home-page__gradient-orb--3"></div>
      
      {/* Header */}
      <header className={`home-page__header ${isLoaded ? "home-page__header--loaded" : ""} ${isScrolled ? "home-page__header--scrolled" : ""}`}>
        <div className="home-page__header-content">
          {/* Logo */}
          <div className="home-page__logo-wrapper">
            <div className="home-page__logo-icon-wrapper">
              <Clock className="home-page__logo-icon" size={22} />
            </div>
            <p className="home-page__logo">All Meet</p>
          </div>
          
        </div>
      </header>
      
      {/* Main Content */}
      <main className="home-page__main">
        {/* Hero Section */}
        <section className={`home-page__hero ${isLoaded ? "home-page__hero--loaded" : ""}`}>
          <div className="home-page__hero-content">
            <div className="home-page__hero-badge">
              <Sparkles size={16} />
              <span>팀 일정 관리의 새로운 기준</span>
            </div>
            <h1 className="home-page__hero-title">
              All Meet에서<br />모든 일정을 한눈에
            </h1>
            <p className="home-page__hero-description">
              강의별 팀 활동, 개인 일정, 팀원들의 가능한 시간까지<br />
              하나의 플랫폼에서 효율적으로 관리하세요
            </p>
            <div className="home-page__hero-buttons">
              <button className="home-page__hero-cta" onClick={() => onNavigate("signup")}>
                회원가입
                <ArrowRight size={20} />
              </button>
              <button className="home-page__hero-cta-secondary" onClick={() => onNavigate("login")}>
                로그인
              </button>
            </div>
          </div>

          {/* ✅ 이미지 1 (homepage1.png) */}
          <div className="home-page__hero-image">
            <ImageWithFallback
              src={homepage1}
              alt="Team collaboration"
            />
          </div>
        </section>

        {/* Features Section */}
        <section className="home-page__features">
          <div className="home-page__section-header">
            <h2 className="home-page__section-title">주요 기능</h2>
            <p className="home-page__section-subtitle">
              All Meet이 제공하는 강력한 팀 일정 관리 도구
            </p>
          </div>
          
          <div className="home-page__features-grid">
            <div className="home-page__feature-card">
              <div className="home-page__feature-icon home-page__feature-icon--purple">
                <Calendar size={28} />
              </div>
              <h3 className="home-page__feature-title">통합 캘린더</h3>
              <p className="home-page__feature-description">
                개인 일정과 팀 일정을 하나의 캘린더에서 관리하고, 일정 유형별로 색상을 구분하여 한눈에 파악하세요
              </p>
            </div>

            <div className="home-page__feature-card">
              <div className="home-page__feature-icon home-page__feature-icon--blue">
                <Users size={28} />
              </div>
              <h3 className="home-page__feature-title">강의별 팀 관리</h3>
              <p className="home-page__feature-description">
                수강 중인 강의별로 팀을 구성하고, 각 팀의 활동과 일정을 체계적으로 관리할 수 있습니다
              </p>
            </div>

            <div className="home-page__feature-card">
              <div className="home-page__feature-icon home-page__feature-icon--green">
                <Clock3 size={28} />
              </div>
              <h3 className="home-page__feature-title">가능한 시간 공유</h3>
              <p className="home-page__feature-description">
                팀원들과 각자의 가능한 시간을 공유하여, 모두가 참여 가능한 최적의 미팅 시간을 쉽게 찾으세요
              </p>
            </div>

            <div className="home-page__feature-card">
              <div className="home-page__feature-icon home-page__feature-icon--orange">
                <Bell size={28} />
              </div>
              <h3 className="home-page__feature-title">실시간 알림</h3>
              <p className="home-page__feature-description">
                팀 활동 게시판의 새 글, 일정 변경사항, 공지사항을 실시간으로 알림받아 놓치지 마세요
              </p>
            </div>

            <div className="home-page__feature-card">
              <div className="home-page__feature-icon home-page__feature-icon--pink">
                <Layout size={28} />
              </div>
              <h3 className="home-page__feature-title">직관적인 대시보드</h3>
              <p className="home-page__feature-description">
                강의 목록, 월간 캘린더, 팀 활동 알림을 하나의 화면에서 확인하는 효율적인 레이아웃
              </p>
            </div>

            <div className="home-page__feature-card">
              <div className="home-page__feature-icon home-page__feature-icon--indigo">
                <CheckCircle size={28} />
              </div>
              <h3 className="home-page__feature-title">간편한 일정 추가</h3>
              <p className="home-page__feature-description">
                캘린더 날짜 클릭만으로 즉시 일정을 추가하고, 일정 유형을 자유롭게 커스터마이징하세요
              </p>
            </div>
          </div>
        </section>

        {/* ✅ Benefits Section - 이미지 2 (homepage2.png) */}
        <section className="home-page__benefits">
          <div className="home-page__benefits-content">
            <div className="home-page__benefits-text">
              <h2 className="home-page__benefits-title">
                왜 All Meet을<br />선택해야 할까요?
              </h2>
              <div className="home-page__benefits-list">
                <div className="home-page__benefit-item">
                  <CheckCircle size={24} className="home-page__benefit-icon" />
                  <div>
                    <h4 className="home-page__benefit-heading">시간 절약</h4>
                    <p className="home-page__benefit-text">
                      팀원들과 일정을 조율하는 시간을 대폭 줄이고, 프로젝트에 집중하세요
                    </p>
                  </div>
                </div>
                <div className="home-page__benefit-item">
                  <CheckCircle size={24} className="home-page__benefit-icon" />
                  <div>
                    <h4 className="home-page__benefit-heading">체계적인 관리</h4>
                    <p className="home-page__benefit-text">
                      강의별, 팀별로 분류된 일정으로 복잡한 학업 스케줄을 깔끔하게 정리
                    </p>
                  </div>
                </div>
                <div className="home-page__benefit-item">
                  <CheckCircle size={24} className="home-page__benefit-icon" />
                  <div>
                    <h4 className="home-page__benefit-heading">원활한 협업</h4>
                    <p className="home-page__benefit-text">
                      팀 활동 게시판과 실시간 알림으로 팀원들과의 소통을 더욱 원활하게
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="home-page__benefits-image">
              <ImageWithFallback
                src={homepage2}
                alt="Calendar planning"
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="home-page__footer">
          <div className="home-page__footer-content">
            <div className="home-page__footer-logo">
              <Clock size={20} />
              <span>teem kkikki</span>
            </div>
            <p className="home-page__footer-text">
              © 2025 All Meet. 팀 일정 관리를 더 쉽고 효율적으로.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

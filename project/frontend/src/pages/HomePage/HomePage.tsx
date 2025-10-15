import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import "./home-page.css";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(1); // Start at 1 (first real image)
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);
  
  // Placeholder images - replace with your own images
  const originalImages = [
    "https://via.placeholder.com/1200x600/e5e7eb/6b7280?text=Image+1",
    "https://via.placeholder.com/1200x600/e5e7eb/6b7280?text=Image+2",
    "https://via.placeholder.com/1200x600/e5e7eb/6b7280?text=Image+3",
    "https://via.placeholder.com/1200x600/e5e7eb/6b7280?text=Image+4"
  ];

  // Create infinite loop by adding clones at both ends
  const images = [
    originalImages[originalImages.length - 1], // Clone of last image
    ...originalImages,
    originalImages[0] // Clone of first image
  ];

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Handle transition end for infinite loop
  const handleTransitionEnd = () => {
    if (currentImageIndex === 0) {
      // We're at the cloned last image, jump to real last image
      setIsTransitioning(false);
      setCurrentImageIndex(originalImages.length);
    } else if (currentImageIndex === images.length - 1) {
      // We're at the cloned first image, jump to real first image
      setIsTransitioning(false);
      setCurrentImageIndex(1);
    }
  };

  // Re-enable transition after jump
  useEffect(() => {
    if (!isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  // Auto-slide effect
  useEffect(() => {
    const autoSlideInterval = setInterval(() => {
      handleNext();
    }, 4000); // 4초마다 자동 슬라이드

    return () => clearInterval(autoSlideInterval);
  }, [currentImageIndex]);

  const handlePrevious = () => {
    if (isTransitioning) {
      setCurrentImageIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (isTransitioning) {
      setCurrentImageIndex((prev) => prev + 1);
    }
  };

  const goToSlide = (index: number) => {
    if (isTransitioning) {
      setCurrentImageIndex(index + 1); // +1 because of the cloned image at start
    }
  };

  return (
    <div className="home-page">
      {/* Background */}
      <div className="home-page__background"></div>
      <div className="home-page__gradient-orb home-page__gradient-orb--1"></div>
      <div className="home-page__gradient-orb home-page__gradient-orb--2"></div>
      <div className="home-page__gradient-orb home-page__gradient-orb--3"></div>
      
      {/* Header */}
      <header className={`home-page__header ${isLoaded ? 'home-page__header--loaded' : ''}`}>
        <div className="home-page__header-content">
          {/* Logo */}
          <div className="home-page__logo-wrapper">
            <Clock className="home-page__logo-icon" size={24} />
            <p className="home-page__logo">teem kkikki</p>
          </div>
          
          {/* Navigation */}
          <nav className="home-page__nav">
            <button
              onClick={() => onNavigate('login')}
              className="home-page__nav-link"
            >
              login
            </button>
            <div className="home-page__divider"></div>
            <button
              onClick={() => onNavigate('signup')}
              className="home-page__nav-link"
            >
              sign up
            </button>
          </nav>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="home-page__main">
        {/* Title */}
        <div className={`home-page__title-section ${isLoaded ? 'home-page__title-section--loaded' : ''}`}>
          <Clock className="home-page__title-icon" size={40} />
          <h1 className="home-page__title">All Meet</h1>
        </div>
        
        {/* Hero Carousel */}
        <div className={`home-page__carousel ${isLoaded ? 'home-page__carousel--loaded' : ''}`}>
          <div className="home-page__carousel-frame">
            <div 
              className="home-page__carousel-slider"
              style={{
                transform: `translateX(-${currentImageIndex * 100}%)`,
                transition: isTransitioning ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
              }}
              onTransitionEnd={handleTransitionEnd}
            >
              {images.map((img, index) => (
                <img 
                  key={index}
                  alt="Beautiful landscape" 
                  className="home-page__carousel-image"
                  src={img}
                  style={{
                    minWidth: '100%',
                    width: '100%'
                  }}
                />
              ))}
            </div>
            <div className="home-page__carousel-overlay"></div>
          </div>
          
          {/* Previous Button */}
          <button 
            className="home-page__carousel-button home-page__carousel-button--prev"
            onClick={handlePrevious}
            aria-label="Previous image"
          >
            <ChevronLeft size={50} strokeWidth={2.5} />
          </button>
          
          {/* Next Button */}
          <button 
            className="home-page__carousel-button home-page__carousel-button--next"
            onClick={handleNext}
            aria-label="Next image"
          >
            <ChevronRight size={50} strokeWidth={2.5} />
          </button>
          
          {/* Image Indicators */}
          <div className="home-page__carousel-indicators">
            {originalImages.map((_, index) => (
              <button
                key={index}
                className={`home-page__carousel-indicator ${
                  currentImageIndex === index + 1 || 
                  (currentImageIndex === 0 && index === originalImages.length - 1) ||
                  (currentImageIndex === images.length - 1 && index === 0)
                    ? "home-page__carousel-indicator--active" : ""
                }`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

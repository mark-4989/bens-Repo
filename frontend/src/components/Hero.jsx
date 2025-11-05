import React, { useState, useEffect } from 'react';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import './Hero.css';

// Featured carousel items - replace these with your actual featured products
const featuredItems = [
  {
    id: 1,
    title: "Summer Collection 2025",
    description: "Discover our amazing collection of premium products. Shop the latest trends and exclusive deals.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop",
    buttonText: "Shop Now"
  },
  {
    id: 2,
    title: "New Arrivals",
    description: "Explore the latest trends in fashion and style. Limited time offers available now.",
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&h=600&fit=crop",
    buttonText: "Explore Collection"
  },
  {
    id: 3,
    title: "Best Sellers",
    description: "Quality products that make a difference. Join thousands of satisfied customers.",
    image: "https://images.unsplash.com/photo-1555529902-5261145633bf?w=1200&h=600&fit=crop",
    buttonText: "View Best Sellers"
  }
];

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredItems.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredItems.length) % featuredItems.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className="hero-carousel-container">
      <div className="hero-carousel-wrapper">
        {featuredItems.map((item, index) => (
          <div
            key={item.id}
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
          >
            <div className="hero-overlay" />
            <img
              src={item.image}
              alt={item.title}
              className="hero-slide-image"
            />
            <div className="hero-content-wrapper">
              <div className="hero-content">
                <h1 className="hero-title">{item.title}</h1>
                <p className="hero-description">{item.description}</p>
                <div className="hero-buttons">
                  <button className="hero-btn hero-btn-primary">
                    <Play className="hero-btn-icon" size={20} fill="currentColor" />
                    {item.buttonText}
                  </button>
                  <button className="hero-btn hero-btn-secondary">
                    <Info className="hero-btn-icon" size={20} />
                    More Info
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={prevSlide} className="hero-nav-btn hero-nav-left">
        <ChevronLeft size={32} />
      </button>
      <button onClick={nextSlide} className="hero-nav-btn hero-nav-right">
        <ChevronRight size={32} />
      </button>

      <div className="hero-indicators">
        {featuredItems.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`hero-indicator ${index === currentSlide ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Hero;
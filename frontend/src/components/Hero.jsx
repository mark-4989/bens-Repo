import React from 'react';
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero-banner">
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">
            FRESH & FAST
            <br />
            <span className="hero-title-highlight">DELIVERY</span>
          </h1>
          <p className="hero-subtitle">Your Local Supermarket, Delivered</p>
        </div>
        
        <div className="hero-image">
          <img 
            src="/images/hero-fruits.png" 
            alt="Fresh fruits and vegetables" 
            className="hero-product-image"
          />
        </div>
      </div>
      
      <button className="hero-cta-btn">
        SHOP NOW
      </button>
    </section>
  );
};

export default Hero;
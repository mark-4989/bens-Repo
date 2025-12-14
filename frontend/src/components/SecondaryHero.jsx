import React from 'react';
import './SecondaryHero.css';

const SecondaryHero = () => {
  return (
    <section className="secondary-hero">
      <div className="secondary-hero-content">
        <div className="secondary-hero-text">
          <h2 className="secondary-hero-title">
            Fresh Groceries
            <br />
            <span className="secondary-hero-highlight">Delivered</span>
          </h2>
          <p className="secondary-hero-subtitle">Handpicked from local farms</p>
          
          <div className="feature-grid">
            <div className="feature-item">
              <div className="feature-icon">🌱</div>
              <span>Farm to table</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🕐</div>
              <span>24/7 ordering</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🚚</div>
              <span>Fast delivery</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🏆</div>
              <span>Quality guarantee</span>
            </div>
          </div>
        </div>
        
        <div className="secondary-hero-image">
          <img 
            src="/images/fresh-vegetables.png" 
            alt="Fresh vegetables and fruits" 
            className="groceries-image"
          />
        </div>
      </div>
      
      <button className="secondary-hero-btn">
        Shop Now
      </button>
    </section>
  );
};

export default SecondaryHero;
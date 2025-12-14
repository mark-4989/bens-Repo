import React from 'react';
import './PromoBanner.css';

const PromoBanner = () => {
  return (
    <section className="promo-banner">
      <div className="promo-content">
        <div className="promo-left">
          <h2 className="promo-discount">
            50%
            <br />
            OFF
          </h2>
        </div>
        
        <div className="promo-center">
          <div className="promo-fruit-arc">
            <img 
              src="/images/watermelon-slice.png" 
              alt="Watermelon" 
              className="fruit-item watermelon-left"
            />
            <img 
              src="/images/strawberry.png" 
              alt="Strawberry" 
              className="fruit-item strawberry"
            />
            <img 
              src="/images/mint.png" 
              alt="Mint" 
              className="fruit-item mint"
            />
            <img 
              src="/images/watermelon-slice.png" 
              alt="Watermelon" 
              className="fruit-item watermelon-right"
            />
          </div>
          
          <h3 className="promo-title">
            Summer
            <br />
            <span className="promo-title-bold">Fresh Sale</span>
          </h3>
        </div>
        
        <div className="promo-right">
          <p className="promo-validity">
            Valid Until
            <br />
            <span className="promo-date">August 31st</span>
          </p>
        </div>
      </div>
      
      <button className="promo-cta-btn">
        Shop Now
      </button>
    </section>
  );
};

export default PromoBanner;
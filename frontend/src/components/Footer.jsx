import React from "react";
import { assets } from "../assets/frontend_assets/assets";
import "./Footer.css";

const Footer = () => {
  return (
    <div className="Footer-container">
      {/* Brand Section */}
      <div className="footer-starter">
        <img src={assets.logo} alt="Logo" />
        <p id="footer-text">
          We are a residential interior design firm located in Portland. Our boutique-studio offers more than just design services.
        </p>
      </div>
      
      {/* Services Column */}
      <div className="Footer-middle">
        <h2>Services</h2>
        <p>Bonus program</p>
        <p>Gift cards</p>
        <p>Credit and payment</p>
        <p>Service contracts</p>
        <p>Non-cash account</p>
        <p>Payment</p>
      </div>
      
      {/* Assistance Column */}
      <div className="Footer-finish">
        <h2>Assistance to the buyer</h2>
        <p>Find an order</p>
        <p>Terms of delivery</p>
        <p>Exchange and return of goods</p>
        <p>Guarantee</p>
        <p>Frequently asked questions</p>
        <p>Terms of use of the site</p>
      </div>
      
      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p>© 2024 Cyber. All rights reserved.</p>
        <div className="social-links">
          <a href="#" aria-label="Twitter">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
            </svg>
          </a>
          <a href="#" aria-label="Facebook">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
            </svg>
          </a>
          <a href="#" aria-label="TikTok">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
            </svg>
          </a>
          <a href="#" aria-label="Instagram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="#000"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="#000" strokeWidth="2"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Footer;
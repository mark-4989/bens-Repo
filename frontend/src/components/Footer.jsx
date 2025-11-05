import React from "react";
import { assets } from "../assets/frontend_assets/assets";
import "./Footer.css";

const Footer = () => {
  return (
    <div className="Footer-container">
      <div className="Footer-starter">
        <img src={assets.logo} alt="" />
        <p>© 2024 ShopMate. All rights reserved.</p>
        <p id="footer-text">
          Lorem, ipsum dolor sit amet consectetur adipisicing elit. Ipsam neque
          eum maiores cupiditate dolores quidem asperiores tenetur molestias, a
          eveniet! Hic odit eveniet saepe quisquam commodi. Totam veritatis
          delectus a?
        </p>
      </div>
      <div className="Footer-middle">
        <h2>COMPANY</h2>
        <p>Home</p>
        <p>About Us</p>
        <p>Delivery</p>
        <p>Privacy policy</p>
      </div>
      <div className="Footer-finish">
        <h2>GET IN TOUCH</h2>
        <p>malikndirangu9256@gmail.com</p>
        <p>254-0112-7324-196</p>
        <p>instagram</p>
      </div>
    </div>
  );
};

export default Footer;

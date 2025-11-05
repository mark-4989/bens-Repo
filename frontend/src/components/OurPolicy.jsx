import React from "react";
import { assets } from "../assets/frontend_assets/assets";
import "./OurPolicy.css";

const OurPolicy = () => {
  return (
    <div className="policy-container">
      <div className="policy-item">
        <img className="policy-img" src={assets.exchange_icon} alt="" />
        <p className="big-text">Easy Exchange Policy</p>
        <p className="small-text">We offer hassle free exchange policies</p>
      </div>
      <div className="policy-item">
        <img className="policy-img" src={assets.quality_icon} alt="" />
        <p className="big-text">7 days Return Policy</p>
        <p className="small-text">We offer 7 day return policies</p>
      </div>
      <div className="policy-item">
        <img className="policy-img" src={assets.support_img} alt="" />
        <p className="big-text">Best Customer Support</p>
        <p className="small-text">We offer 24hr customer support</p>
      </div>
    </div>
  );
};

export default OurPolicy;

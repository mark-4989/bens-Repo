import React from "react";
import "./Newsletter.css";

const Newsletter = () => {

  const onSubmitHandler = (event) => {
    event.preventDefault()
  }
  return (
    <div className="newsletter-container"> 
      <p className="big-text">Subscribe now & get 20% off</p>
      <p className="small-text">
        Lorem ipsum dolor, sit amet consectetur adipisicing elit. Dignissimos,
        velit eius blanditiis.
      </p>
      <form onSubmit={onSubmitHandler} className="newsletter-form">
        <input type="email" placeholder="Enter your email" />
        <button type="submit">Subscribe</button>
      </form>
    </div>
  );
};

export default Newsletter;

import React from 'react';
import "./Title.css";

const Title = ({ text1, text2, icon: Icon }) => {
  return (
    <div className='title-container'>
      {Icon && <Icon className="title-icon" sx={{ fontSize: 40 }} />}
      <b>{text1}</b>
      <p>{text2}</p>
    </div>
  );
}

export default Title;
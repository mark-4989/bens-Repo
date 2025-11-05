import React from 'react'
import "./Title.css"

const Title = ({text1,text2}) => {
  return (
    <div className='title-container'>
        <b>{text1}</b>
        <p>{text2}</p>
        
    </div>
  )
}

export default Title
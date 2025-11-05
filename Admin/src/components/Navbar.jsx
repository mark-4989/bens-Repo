import React from 'react'
import {assets} from '../assets/assets'
import './Navbar.css'

const Navbar = () => {
  return (
    <div className='navbar-container'>
        <img className='adminlogo' src={assets.logo} alt="" />
        <button className='admin-logout-btn'>Logout</button>
    </div>
  )
}

export default Navbar
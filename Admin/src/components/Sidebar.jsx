import React from 'react'
import './Sidebar.css'
import { assets } from '../assets/assets'
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className='sidebar-container'>
        <div className="nav-link-container">

            <NavLink  to="/add"  className={'admin-nav'}>
                <img className='navlink-img' src={assets.add_icon} alt="" />
                <p className='navlink-text'>Add Item</p>
            </NavLink>
            <NavLink  to = "/list"  className={'admin-nav'}>
                <img className='navlink-img' src={assets.order_icon} alt="" />
                <p className='navlink-text'>List Products</p>
            </NavLink>
            <NavLink  to = "/orders"  className={'admin-nav'}>
                <img className='navlink-img' src={assets.order_icon} alt="" />
                <p className='navlink-text'>Orders</p>
            </NavLink>
        
        </div>
    </div>
  )
}

export default Sidebar
import React, { useState } from 'react'
import './Sidebar.css'
import { assets } from '../assets/assets'
import { NavLink } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { Menu, X, Plus, List, ShoppingBag, LogOut } from 'lucide-react'

const NAV_LINKS = [
  { to: '/add',    label: 'Add Item',       Icon: Plus },
  { to: '/list',   label: 'List Products',  Icon: List },
  { to: '/orders', label: 'Orders',         Icon: ShoppingBag },
]

const Sidebar = () => {
  const { user, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?'

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className='sidebar-container'>
      {/* ── Top Bar ── */}
      <div className='sidebar-inner'>

        {/* Brand */}
        <div className='sidebar-brand'>
          <div className='sidebar-brand-text'>cyber</div>
          <div className='sidebar-brand-sub'>Admin Panel</div>
        </div>

        {/* Desktop: vertical divider + nav */}
        <div className='sidebar-divider-v' />

        <div className='nav-link-container'>
          {NAV_LINKS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `admin-nav${isActive ? ' active' : ''}`}
            >
              <div className='navlink-icon-wrap'>
                <Icon size={13} strokeWidth={2} color='currentColor' style={{ color: 'inherit' }} />
              </div>
              <p className='navlink-text'>{label}</p>
            </NavLink>
          ))}
        </div>

        {/* Desktop: user section */}
        {isSignedIn && (
          <div className='sidebar-user-section'>
            <div className='sidebar-user-card'>
              <div className='sidebar-user-avatar'>
                {user?.imageUrl
                  ? <img src={user.imageUrl} alt='avatar' />
                  : initials}
              </div>
              <div className='sidebar-user-info'>
                <div className='sidebar-user-name'>{user?.firstName} {user?.lastName}</div>
                <div className='sidebar-user-role'>Admin</div>
              </div>
            </div>
            <button className='sidebar-signout-btn' onClick={() => signOut()}>
              <LogOut size={13} strokeWidth={2} />
              Sign Out
            </button>
          </div>
        )}

        {/* Mobile: hamburger */}
        <button
          className='mobile-menu-btn'
          onClick={() => setMenuOpen((o) => !o)}
          aria-label='Toggle menu'
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* ── Mobile Drawer ── */}
      <div className={`mobile-drawer${menuOpen ? ' open' : ''}`}>

        {/* Nav links */}
        <div className='mobile-nav-links'>
          {NAV_LINKS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMenu}
              className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
            >
              <div className='navlink-icon-wrap'>
                <Icon size={14} strokeWidth={2} />
              </div>
              <p className='navlink-text'>{label}</p>
            </NavLink>
          ))}
        </div>

        {/* User + sign out */}
        {isSignedIn && (
          <div className='mobile-user-section'>
            <div className='mobile-user-info'>
              <div className='sidebar-user-avatar' style={{ width: 32, height: 32, fontSize: 12 }}>
                {user?.imageUrl
                  ? <img src={user.imageUrl} alt='avatar' />
                  : initials}
              </div>
              <div>
                <div className='sidebar-user-name'>{user?.firstName} {user?.lastName}</div>
                <div className='sidebar-user-role'>Admin</div>
              </div>
            </div>
            <button className='mobile-signout-btn' onClick={() => { signOut(); closeMenu(); }}>
              <LogOut size={13} strokeWidth={2} />
              Sign Out
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default Sidebar
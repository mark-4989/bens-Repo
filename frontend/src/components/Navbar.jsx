import React, { useContext, useState, useEffect } from 'react';
import { assets } from '../assets/frontend_assets/assets';
import { Link, NavLink } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import { SignInButton, SignedIn, SignedOut, UserButton, useAuth, useUser } from '@clerk/clerk-react';
import { backendUrl } from '../config';
import './Navbar.css';

const Navbar = () => {
  const [visible, setVisible] = useState(false);
  const [hasOrders, setHasOrders] = useState(false);
  const [ordersCount, setOrdersCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const { setShowSearch, getCartCount } = useContext(ShopContext);
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if user has orders
  useEffect(() => {
    const checkUserOrders = async () => {
      if (!isSignedIn) {
        setHasOrders(false);
        setOrdersCount(0);
        return;
      }

      try {
        const token = await getToken({ template: 'MilikiAPI' });
        const response = await fetch(`${backendUrl}/api/orders/user`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.orders && data.orders.length > 0) {
            setHasOrders(true);
            setOrdersCount(data.orders.length);
          } else {
            setHasOrders(false);
            setOrdersCount(0);
          }
        }
      } catch (error) {
        console.error('Error checking orders:', error);
        setHasOrders(false);
      }
    };

    checkUserOrders();
    
    // Check every 30 seconds for new orders
    const interval = setInterval(checkUserOrders, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn, getToken]);

  return (
    <div className={`navbar-container ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-content">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <img src={assets.logo} alt="Logo" />
        </Link>

        {/* Desktop Navigation */}
        <ul className="navbar-links">
          <NavLink to="/" className="nav-link">
            <p>HOME</p>
            <hr className="nav-underline" />
          </NavLink>
          
          <NavLink to="/collection" className="nav-link">
            <p>COLLECTION</p>
            <hr className="nav-underline" />
          </NavLink>
          
          <NavLink to="/about" className="nav-link">
            <p>ABOUT</p>
            <hr className="nav-underline" />
          </NavLink>
          
          <NavLink to="/contact" className="nav-link">
            <p>CONTACT</p>
            <hr className="nav-underline" />
          </NavLink>

          {/* Dynamic Orders Link */}
          {hasOrders && (
            <NavLink to="/Orders1" className="nav-link orders-nav-link">
              <div className="orders-link-content">
                <p className="orders-text">
                  <span className="orders-icon">📦</span>
                  MY ORDERS
                </p>
                {ordersCount > 0 && (
                  <span className="orders-badge">{ordersCount}</span>
                )}
              </div>
              <hr className="nav-underline" />
            </NavLink>
          )}
        </ul>

        {/* Right Side Icons */}
        <div className="navbar-actions">
          {/* Search */}
          <div className="nav-icon-wrapper" onClick={() => setShowSearch(true)}>
            <img src={assets.search_icon} alt="Search" className="nav-icon" />
          </div>

          {/* Profile */}
          <div className="nav-icon-wrapper profile-wrapper">
            <SignedOut>
              <SignInButton mode="modal">
                {/* <img id='user-image' src={assets.profile_icon} alt="Profile" className="nav-icon" /> */}
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

          {/* Cart */}
          <Link to="/cart" className="nav-icon-wrapper cart-wrapper">
            <img src={assets.cart_icon} alt="Cart" className="nav-icon" />
            {getCartCount() > 0 && (
              <span className="cart-badge">{getCartCount()}</span>
            )}
          </Link>

          {/* Mobile Menu Toggle */}
          <div className="nav-icon-wrapper menu-toggle" onClick={() => setVisible(true)}>
            <img src={assets.menu_icon} alt="Menu" className="nav-icon" />
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`mobile-sidebar ${visible ? 'visible' : ''}`}>
        <div className="sidebar-content">
          {/* Back Button */}
          <div className="sidebar-header" onClick={() => setVisible(false)}>
            <img src={assets.dropdown_icon} alt="Back" className="back-icon" />
            <p>Back</p>
          </div>

          {/* Mobile Links */}
          <NavLink to="/" className="sidebar-link" onClick={() => setVisible(false)}>
            <span className="link-icon">🏠</span>
            HOME
          </NavLink>
          
          <NavLink to="/collection" className="sidebar-link" onClick={() => setVisible(false)}>
            <span className="link-icon">👕</span>
            COLLECTION
          </NavLink>
          
          <NavLink to="/about" className="sidebar-link" onClick={() => setVisible(false)}>
            <span className="link-icon">ℹ️</span>
            ABOUT
          </NavLink>
          
          <NavLink to="/contact" className="sidebar-link" onClick={() => setVisible(false)}>
            <span className="link-icon">📧</span>
            CONTACT
          </NavLink>

          {/* Mobile Orders Link */}
          {hasOrders && (
            <NavLink to="/Orders1" className="sidebar-link orders-sidebar-link" onClick={() => setVisible(false)}>
              <div className="sidebar-orders-content">
                <div>
                  <span className="link-icon">📦</span>
                  MY ORDERS
                </div>
                {ordersCount > 0 && (
                  <span className="sidebar-orders-badge">{ordersCount}</span>
                )}
              </div>
            </NavLink>
          )}
        </div>
      </div>

      {/* Overlay */}
      {visible && <div className="sidebar-overlay" onClick={() => setVisible(false)} />}
    </div>
  );
};

export default Navbar;
// UnifiedSidebar.jsx - Modern Combined Navigation + Categories Sidebar
import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { SignInButton, SignedIn, SignedOut, UserButton, useAuth, useUser } from '@clerk/clerk-react';
import { 
  Home,
  ShoppingBag,
  Info,
  Mail,
  Package,
  Search,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  User,
  X,
  Menu,
  Apple,
  Baby,
  Zap,
  Wine,
  Coffee,
  Tag,
  ChevronDown
} from 'lucide-react';
import { ShopContext } from '../context/ShopContext';
import { backendUrl } from '../config';
import gsap from 'gsap';
import './UnifiedSidebar.css';

const UnifiedSidebar = ({ isExpanded, setIsExpanded }) => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hasOrders, setHasOrders] = useState(false);
  const [ordersCount, setOrdersCount] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { setShowSearch, getCartCount } = useContext(ShopContext);
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);
  const categoryRefs = useRef({});

  // Close mobile menu when clicking outside (desktop clicks only, no touch to prevent scroll conflicts)
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only on mobile
      if (window.innerWidth > 768) return;
      
      if (
        mobileOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        !event.target.closest('.unified-mobile-toggle')
      ) {
        setMobileOpen(false);
      }
    };

    if (mobileOpen) {
      // Only mousedown - touchstart conflicts with scrolling
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileOpen]);

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
    const interval = setInterval(checkUserOrders, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn, getToken]);

  // GSAP Animation on mount - DESKTOP ONLY (prevents conflict with mobile CSS transforms)
  useEffect(() => {
    if (sidebarRef.current && window.innerWidth > 768) {
      gsap.from(sidebarRef.current, {
        x: -100,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out'
      });
    }
  }, []);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
    
    // GSAP animation for toggle
    gsap.to(sidebarRef.current, {
      width: !isExpanded ? '320px' : '80px',
      duration: 0.4,
      ease: 'power2.inOut'
    });
  };

  const toggleCategory = (categoryId) => {
    const newExpanded = expandedCategory === categoryId ? null : categoryId;
    setExpandedCategory(newExpanded);

    // GSAP animation for category expansion
    if (categoryRefs.current[categoryId]) {
      if (newExpanded === categoryId) {
        gsap.to(categoryRefs.current[categoryId], {
          height: 'auto',
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out'
        });
      } else {
        gsap.to(categoryRefs.current[categoryId], {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in'
        });
      }
    }
  };

  const handleCategoryClick = (path) => {
    navigate(path);
    if (window.innerWidth < 768) {
      setMobileOpen(false);
    }
  };

  const handleSubcategoryClick = (path) => {
    navigate(path);
    if (window.innerWidth < 768) {
      setMobileOpen(false);
    }
  };

  // Main navigation items
  const navItems = [
    { id: 'home', path: '/', icon: Home, label: 'Home' },
    { id: 'collection', path: '/collection', icon: ShoppingBag, label: 'Collection' },
    { id: 'about', path: '/about', icon: Info, label: 'About' },
    { id: 'contact', path: '/contact', icon: Mail, label: 'Contact' },
  ];

  if (hasOrders) {
    navItems.push({ 
      id: 'orders', 
      path: '/Orders1', 
      icon: Package, 
      label: 'My Orders',
      badge: ordersCount
    });
  }

  // Category structure
  const categories = [
    {
      id: 'fresh-foods',
      name: 'Fresh Foods',
      icon: Apple,
      path: '/category/fresh-foods',
      subcategories: [
        { name: 'Fruits & Vegetables', path: '/category/fresh-foods/fruits-vegetables' },
        { name: 'Meat & Poultry', path: '/category/fresh-foods/meat-poultry' },
        { name: 'Fish & Seafood', path: '/category/fresh-foods/fish-seafood' },
        { name: 'Dairy Products', path: '/category/fresh-foods/dairy-products' },
        { name: 'Bakery', path: '/category/fresh-foods/bakery' }
      ]
    },
    {
      id: 'baby-kids',
      name: 'Baby & Kids',
      icon: Baby,
      path: '/category/baby-kids',
      subcategories: [
        { name: 'Baby Food & Formula', path: '/category/baby-kids/baby-food-formula' },
        { name: 'Diapers & Wipes', path: '/category/baby-kids/diapers-wipes' },
        { name: 'Baby Care', path: '/category/baby-kids/baby-care' },
        { name: 'Toys & Games', path: '/category/baby-kids/toys-games' },
        { name: 'Kids Clothing', path: '/category/baby-kids/kids-clothing' }
      ]
    },
    {
      id: 'electronics',
      name: 'Electronics',
      icon: Zap,
      path: '/category/electronics',
      subcategories: [
        { name: 'Mobile Phones', path: '/category/electronics/mobile-phones' },
        { name: 'Computers & Laptops', path: '/category/electronics/computers-laptops' },
        { name: 'TVs & Audio', path: '/category/electronics/tvs-audio' },
        { name: 'Home Appliances', path: '/category/electronics/home-appliances' },
        { name: 'Gaming', path: '/category/electronics/gaming' }
      ]
    },
    {
      id: 'liquor-store',
      name: 'Liquor Store',
      icon: Wine,
      path: '/category/liquor-store',
      subcategories: [
        { name: 'Wines', path: '/category/liquor-store/wines' },
        { name: 'Spirits', path: '/category/liquor-store/spirits' },
        { name: 'Beer & Cider', path: '/category/liquor-store/beer-cider' },
        { name: 'Liqueurs', path: '/category/liquor-store/liqueurs' }
      ]
    },
    {
      id: 'food-cupboard',
      name: 'Food Cupboard',
      icon: Coffee,
      path: '/category/food-cupboard',
      subcategories: [
        { name: 'Grains & Cereals', path: '/category/food-cupboard/grains-cereals' },
        { name: 'Cooking Oils', path: '/category/food-cupboard/cooking-oils' },
        { name: 'Canned Foods', path: '/category/food-cupboard/canned-foods' },
        { name: 'Spices & Seasonings', path: '/category/food-cupboard/spices-seasonings' },
        { name: 'Beverages', path: '/category/food-cupboard/beverages' }
      ]
    },
    {
      id: 'promos',
      name: 'Promotions',
      icon: Tag,
      path: '/category/promos',
      subcategories: []
    }
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        className="unified-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Unified Sidebar */}
      <div 
        ref={sidebarRef}
        className={`unified-sidebar ${isExpanded ? 'expanded' : 'collapsed'} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        {/* Header */}
        <div className="unified-header">
          <div className="unified-logo-section">
            <div className="unified-logo-icon">
              <ShoppingBag size={28} strokeWidth={2.5} />
            </div>
            {isExpanded && (
              <div className="unified-logo-text">
                <h2>cyber</h2>
                <span>Premium Store</span>
              </div>
            )}
          </div>
          <button className="unified-toggle-btn" onClick={toggleSidebar}>
            {isExpanded ? <ChevronLeft size={20} strokeWidth={2.5} /> : <ChevronRight size={20} strokeWidth={2.5} />}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="unified-content">
          {/* Navigation Section */}
          <div className="unified-section">
            {isExpanded && <div className="unified-section-title">Navigation</div>}
            <nav className="unified-nav">
              {navItems.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) => 
                      `unified-nav-item ${isActive ? 'active' : ''}`
                    }
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={{ '--item-index': index }}
                    onClick={() => window.innerWidth < 768 && setMobileOpen(false)}
                  >
                    <div className="unified-nav-item-content">
                      <div className="unified-nav-icon">
                        <IconComponent size={22} strokeWidth={2.5} />
                      </div>
                      {isExpanded && (
                        <span className="unified-nav-label">{item.label}</span>
                      )}
                      {item.badge && (
                        <div className="unified-nav-badge">{item.badge}</div>
                      )}
                    </div>
                    
                    {!isExpanded && (
                      <div className="unified-tooltip">{item.label}</div>
                    )}
                  </NavLink>
                );
              })}

              {/* Divider */}
              <div className="unified-divider"></div>

              {/* Search */}
              <div
                className="unified-nav-item"
                onClick={() => {
                  setShowSearch(true);
                  window.innerWidth < 768 && setMobileOpen(false);
                }}
                onMouseEnter={() => setHoveredItem('search')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className="unified-nav-item-content">
                  <div className="unified-nav-icon">
                    <Search size={22} strokeWidth={2.5} />
                  </div>
                  {isExpanded && (
                    <span className="unified-nav-label">Search</span>
                  )}
                </div>
                {!isExpanded && (
                  <div className="unified-tooltip">Search</div>
                )}
              </div>

              {/* Cart */}
              <Link
                to="/cart"
                className="unified-nav-item"
                onMouseEnter={() => setHoveredItem('cart')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => window.innerWidth < 768 && setMobileOpen(false)}
              >
                <div className="unified-nav-item-content">
                  <div className="unified-nav-icon">
                    <ShoppingCart size={22} strokeWidth={2.5} />
                  </div>
                  {isExpanded && (
                    <span className="unified-nav-label">Cart</span>
                  )}
                  {getCartCount() > 0 && (
                    <div className="unified-nav-badge">{getCartCount()}</div>
                  )}
                </div>
                {!isExpanded && (
                  <div className="unified-tooltip">Cart ({getCartCount()})</div>
                )}
              </Link>
            </nav>
          </div>

          {/* Categories Section */}
          <div className="unified-section">
            {isExpanded && <div className="unified-section-title">Categories</div>}
            <div className="unified-categories">
              {categories.map((category, index) => {
                const IconComponent = category.icon;
                const isExpanded2 = expandedCategory === category.id;

                return (
                  <div 
                    key={category.id} 
                    className="unified-category"
                    style={{ '--category-index': index }}
                  >
                    <div 
                      className={`unified-category-header ${isExpanded2 ? 'expanded' : ''}`}
                      onClick={() => {
                        if (category.subcategories.length > 0 && isExpanded) {
                          toggleCategory(category.id);
                        } else {
                          handleCategoryClick(category.path);
                        }
                      }}
                    >
                      <div className="unified-category-main">
                        <div className="unified-category-icon">
                          <IconComponent size={20} strokeWidth={2.5} />
                        </div>
                        {isExpanded && (
                          <span className="unified-category-label">{category.name}</span>
                        )}
                      </div>
                      {isExpanded && category.subcategories.length > 0 && (
                        <ChevronDown 
                          size={18} 
                          className={`unified-category-arrow ${isExpanded2 ? 'rotated' : ''}`}
                        />
                      )}
                      
                      {!isExpanded && (
                        <div className="unified-tooltip">{category.name}</div>
                      )}
                    </div>

                    {/* Subcategories */}
                    {category.subcategories.length > 0 && isExpanded && (
                      <div 
                        ref={el => categoryRefs.current[category.id] = el}
                        className={`unified-subcategories ${isExpanded2 ? 'show' : ''}`}
                      >
                        {category.subcategories.map((sub) => (
                          <div
                            key={sub.path}
                            className="unified-subcategory"
                            onClick={() => handleSubcategoryClick(sub.path)}
                          >
                            {sub.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="unified-footer">
          <SignedOut>
            <SignInButton mode="modal">
              <button className={`unified-signin-btn ${!isExpanded ? 'collapsed' : ''}`}>
                <User size={20} strokeWidth={2.5} />
                {isExpanded && <span>Sign In</span>}
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <div className={`unified-user-profile ${!isExpanded ? 'collapsed' : ''}`}>
              <div className="unified-user-avatar">
                <UserButton afterSignOutUrl="/" />
              </div>
              {isExpanded && (
                <div className="unified-user-info">
                  <span className="unified-user-name">My Account</span>
                  <span className="unified-user-role">Customer</span>
                </div>
              )}
            </div>
          </SignedIn>
        </div>
      </div>
    </>
  );
};

export default UnifiedSidebar;
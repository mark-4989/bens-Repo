import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isOpen = true, onClose }) => {
  const [activeMenu, setActiveMenu] = useState(null);

  const menuData = [
    {
      id: 1,
      title: 'Categories',
      icon: '📂',
      link: '/categories',
      submenu: [
        { name: 'All Products', link: '/collection' },
        { name: 'New Arrivals', link: '/new-arrivals' },
        { name: 'Best Sellers', link: '/best-sellers' },
        { name: 'On Sale', link: '/on-sale' }
      ]
    },
    {
      id: 2,
      title: 'Promos',
      icon: '🎁',
      link: '/promos',
      badge: 'HOT',
      submenu: [
        { name: 'Weekly Deals', link: '/promos/weekly-deals' },
        { name: 'Flash Sales', link: '/promos/flash-sales' },
        { name: 'Clearance', link: '/promos/clearance' },
        { name: 'Bundle Offers', link: '/promos/bundles' }
      ]
    },
    {
      id: 3,
      title: 'Food Cupboard',
      icon: '🥫',
      link: '/food-cupboard',
      submenu: [
        { 
          name: 'Grains & Cereals',
          subcategories: [
            'Rice', 'Maize Flour', 'Wheat Flour', 'Oats', 'Pasta'
          ]
        },
        { 
          name: 'Cooking Oils',
          subcategories: [
            'Vegetable Oil', 'Sunflower Oil', 'Olive Oil', 'Palm Oil'
          ]
        },
        { 
          name: 'Canned Foods',
          subcategories: [
            'Canned Vegetables', 'Canned Fruits', 'Canned Fish', 'Canned Meat'
          ]
        },
        { 
          name: 'Spices & Seasonings',
          subcategories: [
            'Salt', 'Pepper', 'Curry', 'Mixed Spices', 'Herbs'
          ]
        },
        { 
          name: 'Beverages',
          subcategories: [
            'Tea', 'Coffee', 'Juice', 'Soda', 'Energy Drinks'
          ]
        }
      ]
    },
    {
      id: 4,
      title: 'Fresh Foods',
      icon: '🥗',
      link: '/fresh-foods',
      submenu: [
        { 
          name: 'Fruits & Vegetables',
          subcategories: [
            'Fresh Fruits', 'Leafy Greens', 'Root Vegetables', 'Exotic Fruits'
          ]
        },
        { 
          name: 'Meat & Poultry',
          subcategories: [
            'Beef', 'Chicken', 'Pork', 'Goat Meat', 'Processed Meat'
          ]
        },
        { 
          name: 'Fish & Seafood',
          subcategories: [
            'Fresh Fish', 'Frozen Fish', 'Prawns', 'Crab', 'Squid'
          ]
        },
        { 
          name: 'Dairy Products',
          subcategories: [
            'Milk', 'Cheese', 'Yogurt', 'Butter', 'Cream'
          ]
        },
        { 
          name: 'Bakery',
          subcategories: [
            'Bread', 'Cakes', 'Pastries', 'Cookies', 'Donuts'
          ]
        }
      ]
    },
    {
      id: 5,
      title: 'Baby & Kids',
      icon: '👶',
      link: '/baby-kids',
      submenu: [
        { 
          name: 'Baby Food & Formula',
          subcategories: [
            'Infant Formula', 'Baby Cereals', 'Baby Snacks', 'Baby Juice'
          ]
        },
        { 
          name: 'Diapers & Wipes',
          subcategories: [
            'Disposable Diapers', 'Cloth Diapers', 'Baby Wipes', 'Diaper Cream'
          ]
        },
        { 
          name: 'Baby Care',
          subcategories: [
            'Baby Shampoo', 'Baby Lotion', 'Baby Oil', 'Baby Powder'
          ]
        },
        { 
          name: 'Kids Clothing',
          subcategories: [
            'Boys Wear', 'Girls Wear', 'Shoes', 'Accessories'
          ]
        },
        { 
          name: 'Toys & Games',
          subcategories: [
            'Educational Toys', 'Action Figures', 'Dolls', 'Board Games'
          ]
        }
      ]
    },
    {
      id: 6,
      title: 'Electronics',
      icon: '📱',
      link: '/electronics',
      submenu: [
        { 
          name: 'Mobile Phones',
          subcategories: [
            'Smartphones', 'Feature Phones', 'Accessories', 'Power Banks'
          ]
        },
        { 
          name: 'Computers & Laptops',
          subcategories: [
            'Laptops', 'Desktops', 'Tablets', 'Computer Accessories'
          ]
        },
        { 
          name: 'TVs & Audio',
          subcategories: [
            'Smart TVs', 'LED TVs', 'Sound Systems', 'Headphones'
          ]
        },
        { 
          name: 'Home Appliances',
          subcategories: [
            'Refrigerators', 'Washing Machines', 'Microwaves', 'Blenders'
          ]
        },
        { 
          name: 'Gaming',
          subcategories: [
            'PlayStation', 'Xbox', 'Nintendo', 'PC Games', 'Gaming Accessories'
          ]
        }
      ]
    },
    {
      id: 7,
      title: 'Forever Liquor Store',
      icon: '🍷',
      link: '/liquor-store',
      badge: '21+',
      submenu: [
        { 
          name: 'Wines',
          subcategories: [
            'Red Wine', 'White Wine', 'Rosé Wine', 'Sparkling Wine', 'Dessert Wine'
          ]
        },
        { 
          name: 'Spirits',
          subcategories: [
            'Whiskey', 'Vodka', 'Gin', 'Rum', 'Tequila', 'Brandy'
          ]
        },
        { 
          name: 'Beer & Cider',
          subcategories: [
            'Local Beer', 'Imported Beer', 'Craft Beer', 'Cider'
          ]
        },
        { 
          name: 'Liqueurs',
          subcategories: [
            'Fruit Liqueurs', 'Cream Liqueurs', 'Herbal Liqueurs'
          ]
        },
        { 
          name: 'Bar Accessories',
          subcategories: [
            'Glasses', 'Cocktail Shakers', 'Wine Openers', 'Ice Buckets'
          ]
        }
      ]
    }
  ];

  const handleMouseEnter = (menuId) => {
    setActiveMenu(menuId);
  };

  const handleMouseLeave = () => {
    setActiveMenu(null);
  };

  const handleLinkClick = (e) => {
    // Don't stop propagation - let the link work
    // Close sidebar on mobile when a link is clicked
    if (onClose && window.innerWidth <= 768) {
      setTimeout(() => onClose(), 100);
    }
  };

  const handleSubmenuClick = (e) => {
    // Prevent submenu from closing when clicking inside it
    e.stopPropagation();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`sidebar-container ${isOpen ? 'open' : 'closed'}`}>
        {/* Mobile Close Button */}
        <div className="sidebar-mobile-header">
          <h3>Shop Categories</h3>
          <button className="sidebar-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="sidebar-main">
          {menuData.map((menu) => (
            <div
              key={menu.id}
              className="sidebar-item"
              onMouseEnter={() => handleMouseEnter(menu.id)}
              onMouseLeave={handleMouseLeave}
            >
              <Link 
                to={menu.link} 
                className="sidebar-link"
                onClick={handleLinkClick}
              >
                <span className="sidebar-icon">{menu.icon}</span>
                <span className="sidebar-title">{menu.title}</span>
                {menu.badge && <span className="sidebar-badge">{menu.badge}</span>}
                <span className="sidebar-arrow">›</span>
              </Link>

              {/* Submenu Panel */}
              {activeMenu === menu.id && menu.submenu && (
                <div className="submenu-panel">
                  <div className="submenu-header">
                    <h3>{menu.title}</h3>
                    <Link 
                      to={menu.link} 
                      className="view-all-link"
                      onClick={handleLinkClick}
                    >
                      View All →
                    </Link>
                  </div>
                  <div className="submenu-grid">
                    {menu.submenu.map((item, index) => (
                      <div key={index} className="submenu-section">
                        <h4 className="submenu-category-title">
                          {item.subcategories ? (
                            <span>{item.name}</span>
                          ) : (
                            <Link 
                              to={item.link}
                              onClick={handleLinkClick}
                            >
                              {item.name}
                            </Link>
                          )}
                        </h4>
                        {item.subcategories && (
                          <ul className="subcategory-list">
                            {item.subcategories.map((sub, subIndex) => (
                              <li key={subIndex}>
                                <Link 
                                  to={`${menu.link}/${item.name.toLowerCase().replace(/\s+/g, '-')}/${sub.toLowerCase().replace(/\s+/g, '-')}`}
                                  onClick={handleLinkClick}
                                >
                                  {sub}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
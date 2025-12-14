import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import WineBarIcon from '@mui/icons-material/WineBar';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import DinnerDiningIcon from '@mui/icons-material/DinnerDining';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const Sidebar = () => {
  const navigate = useNavigate();
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // NEW: Mobile sidebar state

  // Toggle sidebar on mobile/tablet
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Categories data
  const categories = [
    {
      id: 'fresh-foods',
      name: 'Fresh Food',
      icon: <RestaurantIcon/>,
      route: '/category/fresh-foods',
      subcategories: [
        {
          title: 'Fruits & Vegetables',
          route: '/category/fresh-foods/fruits-vegetables',
          items: [
            { name: 'Fresh Fruits', route: '/products/fresh-foods/fruits-vegetables?type=fruits' },
            { name: 'Fresh Vegetables', route: '/products/fresh-foods/fruits-vegetables?type=vegetables' },
            { name: 'Organic Produce', route: '/products/fresh-foods/fruits-vegetables?type=organic' },
            { name: 'Herbs & Spices', route: '/products/fresh-foods/fruits-vegetables?type=herbs' }
          ]
        },
        {
          title: 'Dairy Products',
          route: '/category/fresh-foods/dairy-products',
          items: [
            { name: 'Fresh Milk', route: '/products/fresh-foods/dairy-products?type=milk' },
            { name: 'Yoghurt', route: '/products/fresh-foods/dairy-products?type=yoghurt' },
            { name: 'Cheese', route: '/products/fresh-foods/dairy-products?type=cheese' },
            { name: 'Butter', route: '/products/fresh-foods/dairy-products?type=butter' }
          ]
        },
        {
          title: 'Meat & Poultry',
          route: '/category/fresh-foods/meat-poultry',
          items: [
            { name: 'Fresh Beef', route: '/products/fresh-foods/meat-poultry?type=beef' },
            { name: 'Chicken', route: '/products/fresh-foods/meat-poultry?type=chicken' },
            { name: 'Pork', route: '/products/fresh-foods/meat-poultry?type=pork' },
            { name: 'Lamb', route: '/products/fresh-foods/meat-poultry?type=lamb' }
          ]
        },
        {
          title: 'Fish & Seafood',
          route: '/category/fresh-foods/fish-seafood',
          items: [
            { name: 'Fresh Fish', route: '/products/fresh-foods/fish-seafood?type=fish' },
            { name: 'Frozen Fish', route: '/products/fresh-foods/fish-seafood?type=frozen' },
            { name: 'Prawns', route: '/products/fresh-foods/fish-seafood?type=prawns' },
            { name: 'Squid', route: '/products/fresh-foods/fish-seafood?type=squid' }
          ]
        },
        {
          title: 'Bakery',
          route: '/category/fresh-foods/bakery',
          items: [
            { name: 'Fresh Bread', route: '/products/fresh-foods/bakery?type=bread' },
            { name: 'Cakes', route: '/products/fresh-foods/bakery?type=cakes' },
            { name: 'Pastries', route: '/products/fresh-foods/bakery?type=pastries' },
            { name: 'Cookies', route: '/products/fresh-foods/bakery?type=cookies' }
          ]
        }
      ]
    },
    {
      id: 'baby-kids',
      name: 'Baby & Kids',
      icon: <ChildCareIcon/>,
      route: '/category/baby-kids',
      subcategories: [
        {
          title: 'Baby Food & Formula',
          route: '/category/baby-kids/baby-food-formula',
          items: [
            { name: 'Baby Formula', route: '/products/baby-kids/baby-food-formula?type=formula' },
            { name: 'Baby Food', route: '/products/baby-kids/baby-food-formula?type=food' },
            { name: 'Baby Cereals', route: '/products/baby-kids/baby-food-formula?type=cereals' }
          ]
        },
        {
          title: 'Diapers & Wipes',
          route: '/category/baby-kids/diapers-wipes',
          items: [
            { name: 'Disposable Diapers', route: '/products/baby-kids/diapers-wipes?type=diapers' },
            { name: 'Baby Wipes', route: '/products/baby-kids/diapers-wipes?type=wipes' },
            { name: 'Training Pants', route: '/products/baby-kids/diapers-wipes?type=training' }
          ]
        },
        {
          title: 'Baby Care',
          route: '/category/baby-kids/baby-care',
          items: [
            { name: 'Baby Bath', route: '/products/baby-kids/baby-care?type=bath' },
            { name: 'Baby Toiletries', route: '/products/baby-kids/baby-care?type=toiletries' },
            { name: 'Baby Health', route: '/products/baby-kids/baby-care?type=health' }
          ]
        },
        {
          title: 'Toys & Games',
          route: '/category/baby-kids/toys-games',
          items: [
            { name: 'Educational Toys', route: '/products/baby-kids/toys-games?type=educational' },
            { name: 'Action Figures', route: '/products/baby-kids/toys-games?type=action' },
            { name: 'Dolls', route: '/products/baby-kids/toys-games?type=dolls' },
            { name: 'Board Games', route: '/products/baby-kids/toys-games?type=board' }
          ]
        },
        {
          title: 'Kids Clothing',
          route: '/category/baby-kids/kids-clothing',
          items: [
            { name: 'Boys Clothing', route: '/products/baby-kids/kids-clothing?type=boys' },
            { name: 'Girls Clothing', route: '/products/baby-kids/kids-clothing?type=girls' },
            { name: 'School Uniforms', route: '/products/baby-kids/kids-clothing?type=uniforms' }
          ]
        }
      ]
    },
    {
      id: 'electronics',
      name: 'Electronics',
      icon: <ElectricBoltIcon/>,
      route: '/category/electronics',
      subcategories: [
        {
          title: 'Mobile Phones',
          route: '/category/electronics/mobile-phones',
          items: [
            { name: 'Smartphones', route: '/products/electronics/mobile-phones?type=smartphones' },
            { name: 'Phone Accessories', route: '/products/electronics/mobile-phones?type=accessories' },
            { name: 'Chargers', route: '/products/electronics/mobile-phones?type=chargers' }
          ]
        },
        {
          title: 'Computers & Laptops',
          route: '/category/electronics/computers-laptops',
          items: [
            { name: 'Laptops', route: '/products/electronics/computers-laptops?type=laptops' },
            { name: 'Desktops', route: '/products/electronics/computers-laptops?type=desktops' },
            { name: 'Monitors', route: '/products/electronics/computers-laptops?type=monitors' }
          ]
        },
        {
          title: 'TVs & Audio',
          route: '/category/electronics/tvs-audio',
          items: [
            { name: 'Televisions', route: '/products/electronics/tvs-audio?type=tvs' },
            { name: 'Sound Systems', route: '/products/electronics/tvs-audio?type=audio' },
            { name: 'Headphones', route: '/products/electronics/tvs-audio?type=headphones' }
          ]
        },
        {
          title: 'Home Appliances',
          route: '/category/electronics/home-appliances',
          items: [
            { name: 'Refrigerators', route: '/products/electronics/home-appliances?type=fridges' },
            { name: 'Washing Machines', route: '/products/electronics/home-appliances?type=washing' },
            { name: 'Microwaves', route: '/products/electronics/home-appliances?type=microwaves' }
          ]
        },
        {
          title: 'Gaming',
          route: '/category/electronics/gaming',
          items: [
            { name: 'Gaming Consoles', route: '/products/electronics/gaming?type=consoles' },
            { name: 'Video Games', route: '/products/electronics/gaming?type=games' },
            { name: 'Gaming Accessories', route: '/products/electronics/gaming?type=accessories' }
          ]
        }
      ]
    },
    {
      id: 'liquor-store',
      name: 'Naivas Liquor',
      icon: <WineBarIcon/>,
      route: '/category/liquor-store',
      subcategories: [
        {
          title: 'Wines',
          route: '/category/liquor-store/wines',
          items: [
            { name: 'Red Wine', route: '/products/liquor-store/wines?type=red' },
            { name: 'White Wine', route: '/products/liquor-store/wines?type=white' },
            { name: 'Champagne', route: '/products/liquor-store/wines?type=champagne' },
            { name: 'Rosé Wine', route: '/products/liquor-store/wines?type=rose' }
          ]
        },
        {
          title: 'Spirits',
          route: '/category/liquor-store/spirits',
          items: [
            { name: 'Whisky', route: '/products/liquor-store/spirits?type=whisky' },
            { name: 'Vodka', route: '/products/liquor-store/spirits?type=vodka' },
            { name: 'Gin', route: '/products/liquor-store/spirits?type=gin' },
            { name: 'Rum', route: '/products/liquor-store/spirits?type=rum' }
          ]
        },
        {
          title: 'Beer & Cider',
          route: '/category/liquor-store/beer-cider',
          items: [
            { name: 'Local Beer', route: '/products/liquor-store/beer-cider?type=local' },
            { name: 'Imported Beer', route: '/products/liquor-store/beer-cider?type=imported' },
            { name: 'Craft Beer', route: '/products/liquor-store/beer-cider?type=craft' }
          ]
        },
        {
          title: 'Liqueurs',
          route: '/category/liquor-store/liqueurs',
          items: [
            { name: 'Cream Liqueurs', route: '/products/liquor-store/liqueurs?type=cream' },
            { name: 'Fruit Liqueurs', route: '/products/liquor-store/liqueurs?type=fruit' },
            { name: 'Coffee Liqueurs', route: '/products/liquor-store/liqueurs?type=coffee' }
          ]
        },
        {
          title: 'Bar Accessories',
          route: '/category/liquor-store/bar-accessories',
          items: [
            { name: 'Glassware', route: '/products/liquor-store/bar-accessories?type=glassware' },
            { name: 'Bar Tools', route: '/products/liquor-store/bar-accessories?type=tools' },
            { name: 'Ice Buckets', route: '/products/liquor-store/bar-accessories?type=ice' }
          ]
        }
      ]
    },
    {
      id: 'food-cupboard',
      name: 'Food Cupboard',
      icon: <DinnerDiningIcon/>,
      route: '/category/food-cupboard',
      subcategories: [
        {
          title: 'Grains & Cereals',
          route: '/category/food-cupboard/grains-cereals',
          items: [
            { name: 'Rice', route: '/products/food-cupboard/grains-cereals?type=rice' },
            { name: 'Pasta', route: '/products/food-cupboard/grains-cereals?type=pasta' },
            { name: 'Breakfast Cereals', route: '/products/food-cupboard/grains-cereals?type=cereals' }
          ]
        },
        {
          title: 'Cooking Oils',
          route: '/category/food-cupboard/cooking-oils',
          items: [
            { name: 'Vegetable Oil', route: '/products/food-cupboard/cooking-oils?type=vegetable' },
            { name: 'Olive Oil', route: '/products/food-cupboard/cooking-oils?type=olive' },
            { name: 'Sunflower Oil', route: '/products/food-cupboard/cooking-oils?type=sunflower' }
          ]
        },
        {
          title: 'Canned Foods',
          route: '/category/food-cupboard/canned-foods',
          items: [
            { name: 'Canned Vegetables', route: '/products/food-cupboard/canned-foods?type=vegetables' },
            { name: 'Canned Fruits', route: '/products/food-cupboard/canned-foods?type=fruits' },
            { name: 'Soups', route: '/products/food-cupboard/canned-foods?type=soups' }
          ]
        },
        {
          title: 'Spices & Seasonings',
          route: '/category/food-cupboard/spices-seasonings',
          items: [
            { name: 'Herbs & Spices', route: '/products/food-cupboard/spices-seasonings?type=herbs' },
            { name: 'Salt & Pepper', route: '/products/food-cupboard/spices-seasonings?type=salt' },
            { name: 'Sauces', route: '/products/food-cupboard/spices-seasonings?type=sauces' }
          ]
        },
        {
          title: 'Beverages',
          route: '/category/food-cupboard/beverages',
          items: [
            { name: 'Coffee', route: '/products/food-cupboard/beverages?type=coffee' },
            { name: 'Tea', route: '/products/food-cupboard/beverages?type=tea' },
            { name: 'Soft Drinks', route: '/products/food-cupboard/beverages?type=soft-drinks' }
          ]
        }
      ]
    },
    {
      id: 'promos',
      name: 'Promotions',
      icon: <CardGiftcardIcon/>,
      route: '/category/promos',
      subcategories: [
        {
          title: 'Weekly Deals',
          route: '/category/promos/weekly-deals',
          items: [
            { name: 'Flash Sales', route: '/products/promos/weekly-deals?type=flash' },
            { name: 'Clearance', route: '/products/promos/weekly-deals?type=clearance' },
            { name: 'Bundles', route: '/products/promos/weekly-deals?type=bundles' }
          ]
        }
      ]
    }
  ];

  const handleMouseEnter = (categoryId) => {
    setHoveredCategory(categoryId);
  };

  const handleMouseLeave = () => {
    setHoveredCategory(null);
  };

  const handleCategoryClick = (route) => {
    navigate(route);
    setHoveredCategory(null);
    setIsSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  const handleSubcategoryClick = (route) => {
    navigate(route);
    setHoveredCategory(null);
    setIsSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  return (
    <>
      {/* Hamburger Toggle Button (Mobile/Tablet Only) */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Overlay for mobile (darkens background when sidebar is open) */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={toggleSidebar}
      />

      {/* Sidebar Container */}
      <div className={`sidebar-container ${isSidebarOpen ? 'active' : ''}`}>
        <div className="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-icon">🛍️</span>
            <h2 className="sidebar-title">Categories</h2>
          </div>

          <div className="category-list">
            {categories.map((category) => (
              <div
                key={category.id}
                className="category-item"
                onMouseEnter={() => handleMouseEnter(category.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button 
                  className="category-button"
                  onClick={() => handleCategoryClick(category.route)}
                >
                  <div className="category-content">
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-name">{category.name}</span>
                  </div>
                  <span className="category-arrow">›</span>
                </button>

                {hoveredCategory === category.id && (
                  <div 
                    className="mega-menu"
                    onMouseEnter={() => handleMouseEnter(category.id)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <h3 className="mega-menu-title">{category.name}</h3>
                    
                    <div className="mega-menu-grid">
                      {category.subcategories.map((sub, idx) => (
                        <div key={idx} className="subcategory">
                          <h4 
                            className="subcategory-title"
                            onClick={() => handleSubcategoryClick(sub.route)}
                            style={{ cursor: 'pointer' }}
                          >
                            {sub.title}
                          </h4>
                          <ul className="subcategory-list">
                            {sub.items.map((item, itemIdx) => (
                              <li key={itemIdx} className="subcategory-item">
                                <a 
                                  href="#" 
                                  className="subcategory-link"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleSubcategoryClick(item.route);
                                  }}
                                >
                                  {item.name}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
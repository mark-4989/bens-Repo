import React, { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from '../components/Title';
import ProductItem from '../components/ProductItem';
import './CategoryPage.css';

const CategoryPage = () => {
  const { category, subcategory } = useParams();
  const { products } = useContext(ShopContext);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [sortType, setSortType] = useState('relevant');

  // Category configurations
  const categoryConfig = {
    'food-cupboard': {
      title: 'Food Cupboard',
      icon: '🥫',
      description: 'Stock your pantry with essentials',
      categories: ['Grains', 'Oils', 'Canned Foods', 'Spices', 'Beverages']
    },
    'fresh-foods': {
      title: 'Fresh Foods',
      icon: '🥗',
      description: 'Fresh and quality foods delivered daily',
      categories: ['Fruits', 'Vegetables', 'Meat', 'Fish', 'Dairy', 'Bakery']
    },
    'baby-kids': {
      title: 'Baby & Kids',
      icon: '👶',
      description: 'Everything for your little ones',
      categories: ['Baby Food', 'Diapers', 'Baby Care', 'Clothing', 'Toys']
    },
    'electronics': {
      title: 'Electronics',
      icon: '📱',
      description: 'Latest tech and gadgets',
      categories: ['Phones', 'Computers', 'TVs', 'Appliances', 'Gaming']
    },
    'liquor-store': {
      title: 'Forever Liquor Store',
      icon: '🍷',
      description: 'Premium wines, spirits, and beers',
      categories: ['Wines', 'Spirits', 'Beer', 'Liqueurs', 'Accessories']
    },
    'promos': {
      title: 'Promotions',
      icon: '🎁',
      description: 'Amazing deals and discounts',
      categories: ['Weekly Deals', 'Flash Sales', 'Clearance', 'Bundles']
    }
  };

  const currentCategory = categoryConfig[category] || {
    title: 'Products',
    icon: '📦',
    description: 'Browse our collection',
    categories: []
  };

  useEffect(() => {
    // Filter products based on category and subcategory
    let filtered = products;

    if (category) {
      filtered = products.filter(item => 
        item.category?.toLowerCase().includes(category.toLowerCase()) ||
        item.subCategory?.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (subcategory) {
      filtered = filtered.filter(item =>
        item.subCategory?.toLowerCase().includes(subcategory.toLowerCase())
      );
    }

    // Apply sorting
    switch (sortType) {
      case 'low-high':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'high-low':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        // Relevant sorting (default order)
        break;
    }

    setFilteredProducts(filtered);
  }, [category, subcategory, products, sortType]);

  return (
    <div className="category-page">
      {/* Category Header */}
      <div className="category-header">
        <div className="category-header-content">
          <div className="category-icon">{currentCategory.icon}</div>
          <div className="category-info">
            <Title text1={currentCategory.title.split(' ')[0]} text2={currentCategory.title.split(' ').slice(1).join(' ')} />
            <p className="category-description">{currentCategory.description}</p>
          </div>
        </div>

        {/* Category Navigation */}
        <div className="category-nav">
          {currentCategory.categories.map((cat, index) => (
            <button key={index} className="category-nav-btn">
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="category-controls">
        <div className="products-count">
          <p>{filteredProducts.length} Products Found</p>
        </div>
        <div className="sort-controls">
          <select 
            value={sortType} 
            onChange={(e) => setSortType(e.target.value)}
            className="sort-select"
          >
            <option value="relevant">Sort by: Relevant</option>
            <option value="low-high">Price: Low to High</option>
            <option value="high-low">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="category-products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((item, index) => (
            <ProductItem
              key={index}
              id={item._id}
              image={item.image}
              name={item.name}
              price={item.price}
            />
          ))
        ) : (
          <div className="no-products">
            <div className="no-products-icon">📦</div>
            <h3>No Products Found</h3>
            <p>Try browsing other categories or check back later</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
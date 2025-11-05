import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Collection.css";
import { ShopContext } from "../context/ShopContext";
import Title from "./Title";

// Modern Product Card Component (MovieBox Style)
const ProductCard = ({ id, image, name, price }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { currency } = useContext(ShopContext);

  return (
    <Link to={`/product/${id}`} className="collection-product-card-link">
      <div
        className="collection-product-card"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="collection-product-card-image-wrapper">
          <img
            src={image[0]}
            alt={name}
            className={`collection-product-card-image ${isHovered ? 'hovered' : ''}`}
            onError={(e) => {
              e.target.src = "/placeholder.png";
            }}
          />
          <div className={`collection-product-card-overlay ${isHovered ? 'visible' : ''}`}>
            <div className="collection-product-card-info">
              <h3 className="collection-product-card-title">{name}</h3>
              <p className="collection-product-card-price">{currency} {price.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

const Collections = () => {
  const { products, search, showSearch, loading } = useContext(ShopContext);
  const [showFilter, setShowFilter] = useState(true);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [category, setCategory] = useState([]);
  const [subCategory, setSubCategory] = useState([]);
  const [sortType, setSortType] = useState("relevant");

  const toggleCategory = (e) => {
    if (category.includes(e.target.value)) {
      setCategory((prev) => prev.filter((item) => item !== e.target.value));
    } else {
      setCategory((prev) => [...prev, e.target.value]);
    }
  };

  const toggleSubCategory = (e) => {
    if (subCategory.includes(e.target.value)) {
      setSubCategory((prev) => prev.filter((item) => item !== e.target.value));
    } else {
      setSubCategory((prev) => [...prev, e.target.value]);
    }
  };

  const applyFilter = () => {
    let productsCopy = products.slice();

    if (showSearch && search) {
      productsCopy = productsCopy.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category.length > 0) {
      productsCopy = productsCopy.filter((item) =>
        category.includes(item.category)
      );
    }

    if (subCategory.length > 0) {
      productsCopy = productsCopy.filter((item) =>
        subCategory.includes(item.subCategory)
      );
    }

    setFilteredProducts(productsCopy);
  };

  const sortProducts = () => {
    let fpCopy = filteredProducts.slice();

    switch (sortType) {
      case "low-high":
        setFilteredProducts(fpCopy.sort((a, b) => a.price - b.price));
        break;
      case "high-low":
        setFilteredProducts(fpCopy.sort((a, b) => b.price - a.price));
        break;
      default:
        applyFilter();
        break;
    }
  };

  useEffect(() => {
    applyFilter();
  }, [category, subCategory, search, showSearch, products]);

  useEffect(() => {
    sortProducts();
  }, [sortType]);

  if (loading) {
    return (
      <div className="collection-loading">
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="modern-collection-container">
      {/* Sidebar Filters */}
      <aside className={`collection-sidebar ${!showFilter ? 'hidden' : ''}`}>
        <div className="filter-header">
          <h3>🔍 FILTERS</h3>
          <button 
            className="filter-toggle-btn"
            onClick={() => setShowFilter(!showFilter)}
          >
            {showFilter ? '✕' : '☰'}
          </button>
        </div>

        {/* Category Filter */}
        <div className="filter-section">
          <h4 className="filter-title">Category</h4>
          <div className="filter-options">
            <label className="filter-checkbox">
              <input type="checkbox" value="Men" onChange={toggleCategory} />
              <span>Men</span>
            </label>
            <label className="filter-checkbox">
              <input type="checkbox" value="Women" onChange={toggleCategory} />
              <span>Women</span>
            </label>
            <label className="filter-checkbox">
              <input type="checkbox" value="Kids" onChange={toggleCategory} />
              <span>Kids</span>
            </label>
          </div>
        </div>

        {/* Type Filter */}
        <div className="filter-section">
          <h4 className="filter-title">Type</h4>
          <div className="filter-options">
            <label className="filter-checkbox">
              <input type="checkbox" value="Topwear" onChange={toggleSubCategory} />
              <span>Topwear</span>
            </label>
            <label className="filter-checkbox">
              <input type="checkbox" value="Bottomwear" onChange={toggleSubCategory} />
              <span>Bottomwear</span>
            </label>
            <label className="filter-checkbox">
              <input type="checkbox" value="Winterwear" onChange={toggleSubCategory} />
              <span>Winterwear</span>
            </label>
          </div>
        </div>

        {/* Clear Filters */}
        {(category.length > 0 || subCategory.length > 0) && (
          <button
            className="clear-filters-btn"
            onClick={() => {
              setCategory([]);
              setSubCategory([]);
            }}
          >
            Clear All Filters
          </button>
        )}
      </aside>

      {/* Main Content */}
      <main className="collection-main">
        {/* Header with Title and Sort */}
        <div className="collection-header">
          <div className="collection-title-wrapper">
            <Title text1="ALL" text2="COLLECTIONS" />
            <p className="collection-count">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </p>
          </div>

          <div className="collection-controls">
            {/* Mobile Filter Toggle */}
            <button 
              className="mobile-filter-toggle"
              onClick={() => setShowFilter(!showFilter)}
            >
              🔍 Filters
            </button>

            {/* Sort Dropdown */}
            <select
              className="sort-select"
              onChange={(e) => setSortType(e.target.value)}
              value={sortType}
            >
              <option value="relevant">✨ Featured</option>
              <option value="low-high">💰 Price: Low to High</option>
              <option value="high-low">💎 Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(category.length > 0 || subCategory.length > 0) && (
          <div className="active-filters">
            <span className="active-filters-label">Active Filters:</span>
            {category.map((cat) => (
              <span key={cat} className="filter-badge">
                {cat}
                <button onClick={() => toggleCategory({ target: { value: cat } })}>✕</button>
              </span>
            ))}
            {subCategory.map((sub) => (
              <span key={sub} className="filter-badge">
                {sub}
                <button onClick={() => toggleSubCategory({ target: { value: sub } })}>✕</button>
              </span>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <div className="no-products-icon">🔍</div>
            <h3>No products found</h3>
            <p>Try adjusting your filters or search terms</p>
            <button
              className="reset-btn"
              onClick={() => {
                setCategory([]);
                setSubCategory([]);
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="collection-products-grid">
            {filteredProducts.map((item, index) => (
              <ProductCard
                key={index}
                id={item._id}
                image={item.image}
                name={item.name}
                price={item.price}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Collections;
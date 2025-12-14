import React, { useContext, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import { Link } from "react-router-dom";
import "./ProductItem.css";

const ProductItem = ({ id, image, name, price }) => {
  const { currency, addToCart } = useContext(ShopContext);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Add to cart logic or navigate to product page
    // You can customize this behavior
    window.location.href = `/product/${id}`;
  };

  return (
    <div className="product-card">
      <Link to={`/product/${id}`}>
        <div className="product-image-container">
          <img src={image[0]} alt={name} />
          
          {/* Heart/Wishlist Button */}
          <button 
            className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
            onClick={handleWishlist}
            aria-label="Add to wishlist"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>
        
        <div className="product-info">
          <div>
            <h3 className="product-name">{name}</h3>
            <p className="product-price">
              {currency}{price}
            </p>
          </div>
          
          <button className="buy-now-btn" onClick={handleBuyNow}>
            Buy Now
          </button>
        </div>
      </Link>
    </div>
  );
};

export default ProductItem;
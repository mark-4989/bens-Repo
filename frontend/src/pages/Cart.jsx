import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import './Cart.css';

const Cart = () => {
  const { products, currency, cartItems, updateQuantity, navigate, loading, getCartAmount, delivery_fee } = useContext(ShopContext);
  const [cartData, setCartData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [bonusCard, setBonusCard] = useState('');

  useEffect(() => {
    if (!products || products.length === 0) {
      setIsProcessing(true);
      return;
    }

    try {
      const tempData = [];
      
      if (cartItems && typeof cartItems === 'object') {
        for (const itemId in cartItems) {
          if (cartItems[itemId] && typeof cartItems[itemId] === 'object') {
            for (const size in cartItems[itemId]) {
              const quantity = cartItems[itemId][size];
              
              if (quantity && quantity > 0) {
                const productExists = products.find(p => p._id === itemId);
                
                if (productExists && productExists.price !== undefined) {
                  tempData.push({
                    _id: itemId,
                    size: size,
                    quantity: quantity
                  });
                }
              }
            }
          }
        }
      }
      
      setCartData(tempData);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error processing cart:', error);
      setCartData([]);
      setIsProcessing(false);
    }
  }, [cartItems, products]);

  const subtotal = getCartAmount ? getCartAmount() : 0;
  const estimatedTax = Math.round(subtotal * 0.021); // 2.1% tax
  const shippingFee = delivery_fee || 29;
  const total = subtotal + estimatedTax + shippingFee;

  if (loading || isProcessing) {
    return (
      <div className='cart-container'>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (!cartData || cartData.length === 0) {
    return (
      <div className='cart-container'>
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added anything to your cart yet</p>
          <button 
            onClick={() => navigate('/collection')}
            className="continue-shopping-btn"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='cart-container'>
      <h1 className="cart-page-title">Shopping Cart</h1>

      <div className="cart-main-layout">
        {/* Left Side - Cart Items */}
        <div className="cart-items-section">
          {cartData.map((item, index) => {
            const productData = products.find((product) => product._id === item._id);

            if (!productData) return null;

            const productImage = (productData.image && Array.isArray(productData.image) && productData.image.length > 0) 
              ? productData.image[0] 
              : '/placeholder.png';
            
            const productName = productData.name || 'Unknown Product';
            const productPrice = productData.price !== undefined ? productData.price : 0;

            if (productPrice === 0) return null;

            return (
              <div key={`${item._id}-${item.size}-${index}`} className="cart-item">
                <img 
                  className='cart-item-image' 
                  src={productImage}
                  alt={productName}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder.png';
                  }}
                />
                
                <div className="cart-item-info">
                  <h3 className="cart-item-name">{productName}</h3>
                  <p className="cart-item-id">#{item._id.slice(-8).toUpperCase()}</p>
                </div>
                
                <div className="cart-item-quantity">
                  <button 
                    className="qty-btn"
                    onClick={() => updateQuantity(item._id, item.size, Math.max(1, item.quantity - 1))}
                  >
                    −
                  </button>
                  <input 
                    className='qty-input' 
                    type="number" 
                    min={1} 
                    value={item.quantity}
                    readOnly
                  />
                  <button 
                    className="qty-btn"
                    onClick={() => updateQuantity(item._id, item.size, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>

                <p className="cart-item-price">
                  {currency}{productPrice.toLocaleString()}
                </p>

                <button 
                  onClick={() => {
                    if (window.confirm('Remove this item from cart?')) {
                      updateQuantity(item._id, item.size, 0);
                    }
                  }} 
                  className='cart-item-remove'
                  aria-label="Remove item"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {/* Right Side - Order Summary */}
        <div className="order-summary">
          <h2 className="order-summary-title">Order Summary</h2>
          
          {/* Promo Code */}
          <div className="promo-section">
            <label className="promo-label">Discount code / Promo code</label>
            <div className="promo-input-group">
              <input 
                type="text" 
                className="promo-input" 
                placeholder="Code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button className="apply-btn">Apply</button>
            </div>
          </div>

          {/* Bonus Card */}
          <div className="bonus-card-section">
            <label className="bonus-card-label">Your bonus card number</label>
            <input 
              type="text" 
              className="bonus-card-input" 
              placeholder="Enter Card Number"
              value={bonusCard}
              onChange={(e) => setBonusCard(e.target.value)}
            />
          </div>

          {/* Price Breakdown */}
          <div className="price-breakdown">
            <div className="price-row">
              <p className="price-label">Subtotal</p>
              <p className="price-value">{currency}{subtotal.toLocaleString()}</p>
            </div>
            <div className="price-row">
              <p className="price-label">Estimated Tax</p>
              <p className="price-value">{currency}{estimatedTax}</p>
            </div>
            <div className="price-row">
              <p className="price-label">Estimated shipping & Handling</p>
              <p className="price-value">{currency}{shippingFee}</p>
            </div>
            <div className="price-row total">
              <p className="price-label">Total</p>
              <p className="price-value">{currency}{total.toLocaleString()}</p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/place-order')} 
            className="checkout-btn"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
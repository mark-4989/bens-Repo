import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'
import { assets } from '../assets/frontend_assets/assets'
import CartTotal from '../components/CartTotal'
import './Cart.css'

const Cart = () => {
  const { products, currency, cartItems, updateQuantity, navigate, loading } = useContext(ShopContext)
  const [cartData, setCartdata] = useState([])
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    // Wait for products to load
    if (!products || products.length === 0) {
      console.log("⏳ Waiting for products to load...");
      setIsProcessing(true)
      return;
    }

    try {
      const tempData = []
      
      // Only process if cartItems exists
      if (cartItems && typeof cartItems === 'object') {
        for (const itemId in cartItems) {
          if (cartItems[itemId] && typeof cartItems[itemId] === 'object') {
            for (const size in cartItems[itemId]) {
              const quantity = cartItems[itemId][size]
              
              // Check if quantity is valid and greater than 0
              if (quantity && quantity > 0) {
                // Verify product exists before adding
                const productExists = products.find(p => p._id === itemId)
                
                if (productExists && productExists.price !== undefined) {
                  tempData.push({
                    _id: itemId,
                    size: size,
                    quantity: quantity
                  })
                } else {
                  console.warn(`⚠️ Product ${itemId} not found or missing price, skipping`);
                }
              }
            }
          }
        }
      }
      
      console.log("🛒 Cart data processed:", tempData);
      setCartdata(tempData)
      setIsProcessing(false)
    } catch (error) {
      console.error("❌ Error processing cart:", error)
      setCartdata([])
      setIsProcessing(false)
    }
  }, [cartItems, products])

  // Show loading state
  if (loading || isProcessing) {
    return (
      <div className='cart-container'>
        <div className="title-container">
          <Title text1={'YOUR'} text2={'CART'} />
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your cart...</p>
        </div>
      </div>
    )
  }

  // Show empty cart message
  if (!cartData || cartData.length === 0) {
    return (
      <div className='cart-container'>
        <div className="title-container">
          <Title text1={'YOUR'} text2={'CART'} />
        </div>
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
    )
  }

  return (
    <div className='cart-container'>
      <div className="title-container">
        <Title text1={'YOUR'} text2={'CART'} />
      </div>

      <div className="cart-items-wrapper">
        {cartData.map((item, index) => {
          // Find product with safety check
          const productData = products.find((product) => product._id === item._id)

          // Skip if product not found
          if (!productData) {
            console.warn(`⚠️ Product ${item._id} not found in products list`);
            return null;
          }

          // Additional safety checks with fallbacks
          const productImage = (productData.image && Array.isArray(productData.image) && productData.image.length > 0) 
            ? productData.image[0] 
            : '/placeholder.png'
          
          const productName = productData.name || 'Unknown Product'
          const productPrice = productData.price !== undefined ? productData.price : 0

          // Skip if price is still invalid
          if (productPrice === 0) {
            console.warn(`⚠️ Product ${productName} has no valid price`);
            return null;
          }

          return (
            <div key={`${item._id}-${item.size}-${index}`} className="cart-item-holder">
              <div className="cart-box">
                <img 
                  className='cart-item-img' 
                  src={productImage}
                  alt={productName}
                  onError={(e) => {
                    e.target.onerror = null; // Prevent infinite loop
                    e.target.src = '/placeholder.png'
                  }}
                />
                <div className="mini-cart-text-holder">
                  <p className="cart-item-name">{productName}</p>
                  <div className="cart-price-size">
                    <p className='cart-price'>
                      {currency}{productPrice.toLocaleString()}
                    </p>
                    <p className='cart-size-badge'>Size: {item.size}</p>
                  </div>
                </div>
              </div>
              
              <div className="cart-quantity-control">
                <button 
                  className="qty-btn"
                  onClick={() => {
                    try {
                      updateQuantity(item._id, item.size, Math.max(1, item.quantity - 1))
                    } catch (error) {
                      console.error('Error updating quantity:', error)
                    }
                  }}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <input 
                  onChange={(e) => {
                    try {
                      const value = Number(e.target.value);
                      if (value > 0) {
                        updateQuantity(item._id, item.size, value);
                      }
                    } catch (error) {
                      console.error('Error updating quantity:', error)
                    }
                  }} 
                  className='cart-input' 
                  type="number" 
                  min={1} 
                  value={item.quantity}
                  readOnly
                />
                <button 
                  className="qty-btn"
                  onClick={() => {
                    try {
                      updateQuantity(item._id, item.size, item.quantity + 1)
                    } catch (error) {
                      console.error('Error updating quantity:', error)
                    }
                  }}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <div className="cart-item-total">
                <p className="item-total-label">Total</p>
                <p className="item-total-price">
                  {currency}{(productPrice * item.quantity).toLocaleString()}
                </p>
              </div>

              <button 
                onClick={() => {
                  try {
                    if (window.confirm('Remove this item from cart?')) {
                      updateQuantity(item._id, item.size, 0)
                    }
                  } catch (error) {
                    console.error('Error removing item:', error)
                  }
                }} 
                className='cart-remove-btn'
                aria-label="Remove item"
                title="Remove from cart"
              >
                <img 
                  src={assets.bin_icon} 
                  alt="Remove"
                />
              </button>
            </div>
          )
        })}
      </div>

      <div className="cart-bottom-section">
        <div className="cart-total-section">
          <CartTotal />
          <button 
            onClick={() => {
              try {
                navigate('/place-order')
              } catch (error) {
                console.error('Navigation error:', error)
              }
            }} 
            className="checkout-btn"
          >
            <span>PROCEED TO CHECKOUT</span>
            <span className="checkout-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Cart
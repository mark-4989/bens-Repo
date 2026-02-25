import React, { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // ✅ Import useNavigate

export const ShopContext = createContext();

const ShopContextProvider = (props) => {
  // PRODUCTION: Use your Render backend URL
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://foreverecommerce-2.onrender.com";
  
  const currency = "KSH";
  const delivery_fee = 200;
  
  // ✅ Add navigate
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [cartItems, setCartItems] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch products from backend
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Use GET request to public endpoint
      const response = await axios.get(`${backendUrl}/api/product/list`);
      
      if (response.data.success) {
        setProducts(response.data.products);
        console.log("✅ Products loaded:", response.data.products.length);
      } else {
        toast.error("Failed to load products");
        console.error("❌ Failed to load products:", response.data.message);
      }
    } catch (error) {
      console.error("❌ Error fetching products:", error);
      
      // Better error messages for debugging
      if (error.response) {
        // Server responded with error
        toast.error(`Server Error: ${error.response.status}`);
        console.error("Response error:", error.response.data);
      } else if (error.request) {
        // Request made but no response
        toast.error("Cannot connect to server. Please check your connection.");
        console.error("Network error:", error.request);
      } else {
        // Something else happened
        toast.error("Error loading products");
        console.error("Error:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Add to cart
  const addToCart = async (itemId, size) => {
    if (!size) {
      toast.error("Please select a size");
      return;
    }

    let cartData = structuredClone(cartItems);

    if (cartData[itemId]) {
      if (cartData[itemId][size]) {
        cartData[itemId][size] += 1;
      } else {
        cartData[itemId][size] = 1;
      }
    } else {
      cartData[itemId] = {};
      cartData[itemId][size] = 1;
    }

    setCartItems(cartData);
    toast.success("Item added to cart");
  };

  // Get cart count
  const getCartCount = () => {
    let totalCount = 0;
    for (const items in cartItems) {
      for (const item in cartItems[items]) {
        try {
          if (cartItems[items][item] > 0) {
            totalCount += cartItems[items][item];
          }
        } catch (error) {
          console.error(error);
        }
      }
    }
    return totalCount;
  };

  // Update cart quantity
  const updateQuantity = async (itemId, size, quantity) => {
    let cartData = structuredClone(cartItems);
    cartData[itemId][size] = quantity;
    setCartItems(cartData);
  };

  // Clear entire cart (called after successful order)
  const clearCart = () => {
    setCartItems({});
    localStorage.removeItem("cartItems");
    console.log("🧹 Cart cleared after order");
  };

  // Get cart amount
  const getCartAmount = () => {
    let totalAmount = 0;
    for (const items in cartItems) {
      let itemInfo = products.find((product) => product._id === items);
      for (const item in cartItems[items]) {
        try {
          if (cartItems[items][item] > 0) {
            totalAmount += itemInfo.price * cartItems[items][item];
          }
        } catch (error) {
          console.error(error);
        }
      }
    }
    return totalAmount;
  };

  // Fetch products on mount
  useEffect(() => {
    console.log("🚀 Fetching products from:", backendUrl);
    fetchProducts();
  }, []);

  // Auto-refresh products every 30 seconds (optional - can be disabled)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("🔄 Auto-refreshing products...");
      fetchProducts();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("cartItems");
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
        console.log("📦 Cart loaded from localStorage");
      } catch (error) {
        console.error("Error loading cart:", error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes (including when cleared)
  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  const value = {
    products,
    currency,
    delivery_fee,
    search,
    setSearch,
    showSearch,
    setShowSearch,
    cartItems,
    addToCart,
    getCartCount,
    updateQuantity,
    clearCart,
    getCartAmount,
    backendUrl,
    loading,
    fetchProducts, // Expose this for manual refresh if needed
    navigate, // ✅ Add navigate to context
  };

  return (
    <ShopContext.Provider value={value}>
      {props.children}
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;
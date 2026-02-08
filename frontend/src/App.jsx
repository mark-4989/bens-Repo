import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Collection from "./pages/Collection";
import About from "./pages/About";
import Cart from "./pages/Cart";
import Contact from "./pages/Contact";
import Login1 from "./pages/Login1";
import Orders1 from "./pages/Orders1";
import PlaceOrder from "./pages/PlaceOrder";
import Product from "./pages/Product";
import DriverTracking from "./pages/DriverTracking";
import Footer from "./components/Footer";
import SearchBar from "./components/SearchBar";
import UnifiedSidebar from "./components/UnifiedSidebar"; // NEW Unified Sidebar
import { ToastContainer } from "react-toastify";
import CategoryPage from "./pages/CategoryPage";
import "./styles/global.css";
import "./components/UnifiedSidebar.css";

const App = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <div className="app">
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      {/* Unified Sidebar - Combines Navigation + Categories */}
      <UnifiedSidebar 
        isExpanded={sidebarExpanded}
        setIsExpanded={setSidebarExpanded}
      />

      {/* Main Content Area */}
      <div className={`main-content-unified ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        <SearchBar />

        <Routes>
          {/* Main Pages */}
          <Route path="/" element={<Home />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/about" element={<About />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login1" element={<Login1 />} />
          <Route path="/orders1" element={<Orders1 />} />
          <Route path="/place-order" element={<PlaceOrder />} />
          <Route path="/product/:productId" element={<Product />} />

          {/* Driver Tracking Route */}
          <Route path="/driver/tracking" element={<DriverTracking />} />

          {/* ========================================
              CATEGORY ROUTES
              No need for separate category sidebar!
              ======================================== */}
          
          {/* Main category pages */}
          <Route path="/category/fresh-foods" element={<CategoryPage />} />
          <Route path="/category/baby-kids" element={<CategoryPage />} />
          <Route path="/category/electronics" element={<CategoryPage />} />
          <Route path="/category/liquor-store" element={<CategoryPage />} />
          <Route path="/category/food-cupboard" element={<CategoryPage />} />
          <Route path="/category/promos" element={<CategoryPage />} />

          {/* Subcategory pages - Fresh Foods */}
          <Route path="/category/fresh-foods/fruits-vegetables" element={<CategoryPage />} />
          <Route path="/category/fresh-foods/meat-poultry" element={<CategoryPage />} />
          <Route path="/category/fresh-foods/fish-seafood" element={<CategoryPage />} />
          <Route path="/category/fresh-foods/dairy-products" element={<CategoryPage />} />
          <Route path="/category/fresh-foods/bakery" element={<CategoryPage />} />

          {/* Subcategory pages - Baby & Kids */}
          <Route path="/category/baby-kids/baby-food-formula" element={<CategoryPage />} />
          <Route path="/category/baby-kids/diapers-wipes" element={<CategoryPage />} />
          <Route path="/category/baby-kids/baby-care" element={<CategoryPage />} />
          <Route path="/category/baby-kids/toys-games" element={<CategoryPage />} />
          <Route path="/category/baby-kids/kids-clothing" element={<CategoryPage />} />

          {/* Subcategory pages - Electronics */}
          <Route path="/category/electronics/mobile-phones" element={<CategoryPage />} />
          <Route path="/category/electronics/computers-laptops" element={<CategoryPage />} />
          <Route path="/category/electronics/tvs-audio" element={<CategoryPage />} />
          <Route path="/category/electronics/home-appliances" element={<CategoryPage />} />
          <Route path="/category/electronics/gaming" element={<CategoryPage />} />

          {/* Subcategory pages - Liquor Store */}
          <Route path="/category/liquor-store/wines" element={<CategoryPage />} />
          <Route path="/category/liquor-store/spirits" element={<CategoryPage />} />
          <Route path="/category/liquor-store/beer-cider" element={<CategoryPage />} />
          <Route path="/category/liquor-store/liqueurs" element={<CategoryPage />} />

          {/* Subcategory pages - Food Cupboard */}
          <Route path="/category/food-cupboard/grains-cereals" element={<CategoryPage />} />
          <Route path="/category/food-cupboard/cooking-oils" element={<CategoryPage />} />
          <Route path="/category/food-cupboard/canned-foods" element={<CategoryPage />} />
          <Route path="/category/food-cupboard/spices-seasonings" element={<CategoryPage />} />
          <Route path="/category/food-cupboard/beverages" element={<CategoryPage />} />

          {/* Product detail pages with query params */}
          <Route path="/products/:category/:subcategory" element={<CategoryPage />} />

          {/* Legacy routes */}
          <Route path="/food-cupboard" element={<CategoryPage />} />
          <Route path="/food-cupboard/:subcategory" element={<CategoryPage />} />
          <Route path="/fresh-foods" element={<CategoryPage />} />
          <Route path="/fresh-foods/:subcategory" element={<CategoryPage />} />
          <Route path="/baby-kids" element={<CategoryPage />} />
          <Route path="/baby-kids/:subcategory" element={<CategoryPage />} />
          <Route path="/electronics" element={<CategoryPage />} />
          <Route path="/electronics/:subcategory" element={<CategoryPage />} />
          <Route path="/liquor-store" element={<CategoryPage />} />
          <Route path="/liquor-store/:subcategory" element={<CategoryPage />} />
          <Route path="/promos" element={<CategoryPage />} />
          <Route path="/promos/:type" element={<CategoryPage />} />

          {/* Generic fallback category route */}
          <Route path="/:category/:subcategory/:item" element={<CategoryPage />} />
        </Routes>
        
        <Footer />
      </div>
    </div>
  );
};

export default App;
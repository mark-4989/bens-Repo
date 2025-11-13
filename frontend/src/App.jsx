import React from "react";
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
import DriverTracking from "./pages/DriverTracking"; // ✅ NEW: Driver tracking page
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SearchBar from "./components/SearchBar";
import Sidebar from "./components/Sidebar";
import { ToastContainer } from "react-toastify";
import CategoryPage from "./pages/CategoryPage";

const App = () => {
  return (
    <div>
      <ToastContainer />
      <Navbar />
      <SearchBar />

      <Routes>
        {/* Home already includes Sidebar in Home.jsx */}
        <Route path="/" element={<Home />} />
        
        {/* Collection page with sidebar */}
        <Route path="/collection" element={<Collection />} />
        
        {/* Other pages without sidebar */}
        <Route path="/about" element={<About />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login1" element={<Login1 />} />
        <Route path="/orders1" element={<Orders1 />} />
        <Route path="/place-order" element={<PlaceOrder />} />
        <Route path="/product/:productId" element={<Product />} />

        {/* ✅ NEW: Driver Tracking Route (No Navbar/Footer for cleaner interface) */}
        <Route path="/driver/tracking" element={<DriverTracking />} />

        {/* ========================================
            CATEGORY ROUTES WITH SIDEBAR
            All category pages show the sidebar
            ======================================== */}
        
        {/* Main category pages */}
        <Route path="/category/fresh-foods" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/baby-kids" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/electronics" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/liquor-store" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/food-cupboard" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/promos" element={<><Sidebar /><CategoryPage /></>} />

        {/* Subcategory pages - Fresh Foods */}
        <Route path="/category/fresh-foods/fruits-vegetables" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/fresh-foods/meat-poultry" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/fresh-foods/fish-seafood" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/fresh-foods/dairy-products" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/fresh-foods/bakery" element={<><Sidebar /><CategoryPage /></>} />

        {/* Subcategory pages - Baby & Kids */}
        <Route path="/category/baby-kids/baby-food-formula" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/baby-kids/diapers-wipes" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/baby-kids/baby-care" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/baby-kids/toys-games" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/baby-kids/kids-clothing" element={<><Sidebar /><CategoryPage /></>} />

        {/* Subcategory pages - Electronics */}
        <Route path="/category/electronics/mobile-phones" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/electronics/computers-laptops" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/electronics/tvs-audio" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/electronics/home-appliances" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/electronics/gaming" element={<><Sidebar /><CategoryPage /></>} />

        {/* Subcategory pages - Liquor Store */}
        <Route path="/category/liquor-store/wines" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/liquor-store/spirits" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/liquor-store/beer-cider" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/liquor-store/liqueurs" element={<><Sidebar /><CategoryPage /></>} />

        {/* Subcategory pages - Food Cupboard */}
        <Route path="/category/food-cupboard/grains-cereals" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/food-cupboard/cooking-oils" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/food-cupboard/canned-foods" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/food-cupboard/spices-seasonings" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/category/food-cupboard/beverages" element={<><Sidebar /><CategoryPage /></>} />

        {/* Product detail pages with query params (for specific filtering) */}
        <Route path="/products/:category/:subcategory" element={<><Sidebar /><CategoryPage /></>} />

        {/* Legacy routes - redirect to new structure */}
        <Route path="/food-cupboard" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/food-cupboard/:subcategory" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/fresh-foods" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/fresh-foods/:subcategory" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/baby-kids" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/baby-kids/:subcategory" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/electronics" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/electronics/:subcategory" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/liquor-store" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/liquor-store/:subcategory" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/promos" element={<><Sidebar /><CategoryPage /></>} />
        <Route path="/promos/:type" element={<><Sidebar /><CategoryPage /></>} />

        {/* Generic fallback category route */}
        <Route path="/:category/:subcategory/:item" element={<><Sidebar /><CategoryPage /></>} />
      </Routes>
      
      <Footer />
    </div>
  );
};

export default App;
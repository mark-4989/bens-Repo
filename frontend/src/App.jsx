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
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SearchBar from "./components/SearchBar";
import { ToastContainer, toast } from "react-toastify";
import Sidebar from "./components/Sidebar";
import CategoryPage from "./pages/CategoryPage";
import FoodCupboard from "./pages/FoodCupboard";
import FreshFoods from "./pages/FreshFoods";
import BabyKids from "./pages/BabyKids";
import Electronics from "./pages/Electronics";
import LiquorStore from "./pages/LiquorStore";
import Promos from "./pages/Promos";

const App = () => {
  return (
    <div className="px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]">
      <ToastContainer />
      <Navbar />
      <SearchBar />
      <Sidebar/>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="about/" element={<About />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login1" element={<Login1 />} />
        <Route path="/orders1" element={<Orders1 />} />
        <Route path="/place-order" element={<PlaceOrder />} />
        <Route path="/product/:productId" element={<Product />} />

        {/* New Category Routes */}
        <Route path="/categories" element={<CategoryPage />} />
        <Route path="/food-cupboard" element={<FoodCupboard />} />
        <Route path="/food-cupboard/:subcategory" element={<FoodCupboard />} />
        <Route path="/fresh-foods" element={<FreshFoods />} />
        <Route path="/fresh-foods/:subcategory" element={<FreshFoods />} />
        <Route path="/baby-kids" element={<BabyKids />} />
        <Route path="/baby-kids/:subcategory" element={<BabyKids />} />
        <Route path="/electronics" element={<Electronics />} />
        <Route path="/electronics/:subcategory" element={<Electronics />} />
        <Route path="/liquor-store" element={<LiquorStore />} />
        <Route path="/liquor-store/:subcategory" element={<LiquorStore />} />
        <Route path="/promos" element={<Promos />} />
        <Route path="/promos/:type" element={<Promos />} />

        {/* Generic category route */}
        <Route
          path="/:category/:subcategory/:item"
          element={<CategoryPage />}
        />
      </Routes>
      <Footer />
    </div>
  );
};

export default App;

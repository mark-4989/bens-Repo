// ENHANCED Add.jsx with 3-Level Cascading Dropdowns (Category → Subcategory → Product Type)
// Keeps all your existing logic + adds smart category selection

import React, { useState } from "react";
import { assets } from "../assets/assets";
import "./Add.css";
import { useAuth } from "@clerk/clerk-react";
import { backendUrl } from "../App";

const Add = () => {
  const { getToken } = useAuth();

  // State for form fields
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    subCategory: "",
    detailedCategory: "",
    productType: "", // ✅ ENHANCED: 3rd level categorization
    sizes: "[]",
    bestseller: false,
    onPromo: false,
    discount: "0",
    originalPrice: "",
    inStock: true,
    stockQuantity: "100",
    brand: "",
    ageRestricted: false,
    minimumAge: "0",
    tags: "",
    rating: "0",
    reviewCount: "0",
    isLatestCollection: false,
    isTrending: false,
    isNewArrival: false
  });

  const [images, setImages] = useState([null, null, null, null]);
  const [message, setMessage] = useState({ type: "", text: "" });

  // ✅ COMPLETE Category options - matches Sidebar exactly
  const categories = [
    { value: 'fresh-foods', label: '🥗 Fresh Foods' },
    { value: 'baby-kids', label: '👶 Baby & Kids' },
    { value: 'electronics', label: '📱 Electronics' },
    { value: 'liquor-store', label: '🍷 Liquor Store' },
    { value: 'food-cupboard', label: '🥫 Food Cupboard' },
    { value: 'promos', label: '🎁 Promotions' }
  ];

  // ✅ COMPLETE Subcategory options - matches Sidebar exactly
  const subCategories = {
    'fresh-foods': [
      'fruits-vegetables',
      'dairy-products',
      'meat-poultry',
      'fish-seafood',
      'bakery'
    ],
    'baby-kids': [
      'baby-food-formula',
      'diapers-wipes',
      'baby-care',
      'toys-games',
      'kids-clothing'
    ],
    'electronics': [
      'mobile-phones',
      'computers-laptops',
      'tvs-audio',
      'home-appliances',
      'gaming'
    ],
    'liquor-store': [
      'wines',
      'spirits',
      'beer-cider',
      'liqueurs',
      'bar-accessories'
    ],
    'food-cupboard': [
      'grains-cereals',
      'cooking-oils',
      'canned-foods',
      'spices-seasonings',
      'beverages'
    ],
    'promos': [
      'weekly-deals'
    ]
  };

  // ✅ ENHANCED: Product Types (3rd Level) - Smart categorization
  const productTypes = {
    // Fresh Foods
    'fruits-vegetables': [
      { value: 'fresh-fruits', label: 'Fresh Fruits' },
      { value: 'fresh-vegetables', label: 'Fresh Vegetables' },
      { value: 'organic-produce', label: 'Organic Produce' },
      { value: 'herbs-spices-fresh', label: 'Fresh Herbs & Spices' },
      { value: 'salads-greens', label: 'Salads & Greens' }
    ],
    'dairy-products': [
      { value: 'milk', label: 'Milk' },
      { value: 'cheese', label: 'Cheese' },
      { value: 'yogurt', label: 'Yogurt' },
      { value: 'butter-margarine', label: 'Butter & Margarine' },
      { value: 'eggs', label: 'Eggs' },
      { value: 'cream', label: 'Cream' }
    ],
    'meat-poultry': [
      { value: 'beef', label: 'Beef' },
      { value: 'chicken', label: 'Chicken' },
      { value: 'pork', label: 'Pork' },
      { value: 'lamb-goat', label: 'Lamb & Goat' },
      { value: 'turkey', label: 'Turkey' },
      { value: 'sausages-bacon', label: 'Sausages & Bacon' }
    ],
    'fish-seafood': [
      { value: 'fresh-fish', label: 'Fresh Fish' },
      { value: 'frozen-fish', label: 'Frozen Fish' },
      { value: 'prawns-shrimp', label: 'Prawns & Shrimp' },
      { value: 'shellfish', label: 'Shellfish' },
      { value: 'seafood-mix', label: 'Seafood Mix' }
    ],
    'bakery': [
      { value: 'bread', label: 'Bread' },
      { value: 'cakes-pastries', label: 'Cakes & Pastries' },
      { value: 'cookies-biscuits', label: 'Cookies & Biscuits' },
      { value: 'donuts-muffins', label: 'Donuts & Muffins' },
      { value: 'pies-tarts', label: 'Pies & Tarts' }
    ],

    // Baby & Kids
    'baby-food-formula': [
      { value: 'infant-formula', label: 'Infant Formula' },
      { value: 'baby-cereals', label: 'Baby Cereals' },
      { value: 'baby-purees', label: 'Baby Food Purees' },
      { value: 'toddler-snacks', label: 'Toddler Snacks' },
      { value: 'baby-drinks', label: 'Baby Drinks' }
    ],
    'diapers-wipes': [
      { value: 'disposable-diapers', label: 'Disposable Diapers' },
      { value: 'cloth-diapers', label: 'Cloth Diapers' },
      { value: 'baby-wipes', label: 'Baby Wipes' },
      { value: 'diaper-bags', label: 'Diaper Bags' },
      { value: 'changing-mats', label: 'Changing Mats' },
      { value: 'training-pants', label: 'Training Pants' }
    ],
    'baby-care': [
      { value: 'baby-bath', label: 'Baby Bath Products' },
      { value: 'baby-skincare', label: 'Baby Skincare' },
      { value: 'baby-health', label: 'Baby Health & Safety' },
      { value: 'baby-grooming', label: 'Baby Grooming' },
      { value: 'thermometers', label: 'Thermometers' },
      { value: 'baby-monitors', label: 'Baby Monitors' }
    ],
    'toys-games': [
      { value: 'educational-toys', label: 'Educational Toys' },
      { value: 'action-figures', label: 'Action Figures & Dolls' },
      { value: 'building-blocks', label: 'Building Blocks' },
      { value: 'outdoor-toys', label: 'Outdoor Toys' },
      { value: 'board-games', label: 'Board Games & Puzzles' },
      { value: 'stuffed-animals', label: 'Stuffed Animals' }
    ],
    'kids-clothing': [
      { value: 'boys-clothing', label: 'Boys Clothing' },
      { value: 'girls-clothing', label: 'Girls Clothing' },
      { value: 'baby-clothing', label: 'Baby Clothing (0-2 years)' },
      { value: 'kids-shoes', label: 'Kids Shoes' },
      { value: 'school-uniforms', label: 'School Uniforms' },
      { value: 'kids-accessories', label: 'Kids Accessories' }
    ],

    // Electronics
    'gaming': [
      { value: 'consoles', label: '🎮 Gaming Consoles (PS5, Xbox, Nintendo)' },
      { value: 'games', label: 'Video Games' },
      { value: 'controllers', label: 'Controllers & Accessories' },
      { value: 'gaming-headsets', label: 'Gaming Headsets' },
      { value: 'gaming-chairs', label: 'Gaming Chairs' },
      { value: 'vr-headsets', label: 'VR Headsets' }
    ],
    'mobile-phones': [
      { value: 'smartphones', label: 'Smartphones' },
      { value: 'feature-phones', label: 'Feature Phones' },
      { value: 'phone-accessories', label: 'Phone Accessories' },
      { value: 'cases-covers', label: 'Cases & Covers' },
      { value: 'chargers-cables', label: 'Chargers & Cables' },
      { value: 'screen-protectors', label: 'Screen Protectors' }
    ],
    'computers-laptops': [
      { value: 'laptops', label: 'Laptops' },
      { value: 'desktops', label: 'Desktop PCs' },
      { value: 'monitors', label: 'Monitors' },
      { value: 'keyboards-mice', label: 'Keyboards & Mice' },
      { value: 'printers', label: 'Printers & Scanners' },
      { value: 'storage', label: 'Storage Devices' }
    ],
    'tvs-audio': [
      { value: 'televisions', label: 'Televisions' },
      { value: 'soundbars', label: 'Soundbars' },
      { value: 'speakers', label: 'Speakers' },
      { value: 'headphones', label: 'Headphones' },
      { value: 'home-theater', label: 'Home Theater Systems' },
      { value: 'streaming-devices', label: 'Streaming Devices' }
    ],
    'home-appliances': [
      { value: 'refrigerators', label: 'Refrigerators' },
      { value: 'washing-machines', label: 'Washing Machines' },
      { value: 'microwaves', label: 'Microwaves' },
      { value: 'air-conditioners', label: 'Air Conditioners' },
      { value: 'vacuum-cleaners', label: 'Vacuum Cleaners' },
      { value: 'irons', label: 'Irons & Steamers' }
    ],

    // Liquor Store
    'wines': [
      { value: 'red-wine', label: 'Red Wine' },
      { value: 'white-wine', label: 'White Wine' },
      { value: 'rose-wine', label: 'Rosé Wine' },
      { value: 'sparkling-wine', label: 'Sparkling Wine & Champagne' },
      { value: 'dessert-wine', label: 'Dessert Wine' }
    ],
    'spirits': [
      { value: 'whiskey', label: 'Whiskey & Bourbon' },
      { value: 'vodka', label: 'Vodka' },
      { value: 'rum', label: 'Rum' },
      { value: 'gin', label: 'Gin' },
      { value: 'tequila', label: 'Tequila' },
      { value: 'brandy-cognac', label: 'Brandy & Cognac' }
    ],
    'beer-cider': [
      { value: 'lager', label: 'Lager' },
      { value: 'ale', label: 'Ale' },
      { value: 'stout-porter', label: 'Stout & Porter' },
      { value: 'craft-beer', label: 'Craft Beer' },
      { value: 'imported-beer', label: 'Imported Beer' },
      { value: 'cider', label: 'Cider' }
    ],
    'liqueurs': [
      { value: 'cream-liqueurs', label: 'Cream Liqueurs' },
      { value: 'fruit-liqueurs', label: 'Fruit Liqueurs' },
      { value: 'coffee-liqueurs', label: 'Coffee Liqueurs' },
      { value: 'herbal-liqueurs', label: 'Herbal Liqueurs' }
    ],
    'bar-accessories': [
      { value: 'glassware', label: 'Glassware' },
      { value: 'bar-tools', label: 'Bar Tools & Shakers' },
      { value: 'ice-buckets', label: 'Ice Buckets' },
      { value: 'mixers', label: 'Mixers & Soft Drinks' },
      { value: 'bar-decor', label: 'Bar Decor' }
    ],

    // Food Cupboard
    'grains-cereals': [
      { value: 'rice', label: 'Rice' },
      { value: 'pasta', label: 'Pasta & Noodles' },
      { value: 'breakfast-cereals', label: 'Breakfast Cereals' },
      { value: 'oatmeal', label: 'Oatmeal & Porridge' },
      { value: 'quinoa-couscous', label: 'Quinoa & Couscous' }
    ],
    'cooking-oils': [
      { value: 'vegetable-oil', label: 'Vegetable Oil' },
      { value: 'olive-oil', label: 'Olive Oil' },
      { value: 'sunflower-oil', label: 'Sunflower Oil' },
      { value: 'coconut-oil', label: 'Coconut Oil' },
      { value: 'specialty-oils', label: 'Specialty Oils' }
    ],
    'canned-foods': [
      { value: 'canned-vegetables', label: 'Canned Vegetables' },
      { value: 'canned-fruits', label: 'Canned Fruits' },
      { value: 'canned-beans', label: 'Canned Beans & Legumes' },
      { value: 'canned-fish', label: 'Canned Fish & Seafood' },
      { value: 'canned-soups', label: 'Canned Soups' }
    ],
    'spices-seasonings': [
      { value: 'herbs-spices', label: 'Herbs & Spices' },
      { value: 'salt-pepper', label: 'Salt & Pepper' },
      { value: 'sauces', label: 'Sauces & Condiments' },
      { value: 'stock-cubes', label: 'Stock & Bouillon Cubes' },
      { value: 'baking-ingredients', label: 'Baking Ingredients' }
    ],
    'beverages': [
      { value: 'coffee', label: 'Coffee' },
      { value: 'tea', label: 'Tea' },
      { value: 'soft-drinks', label: 'Soft Drinks' },
      { value: 'juices', label: 'Juices' },
      { value: 'water', label: 'Water' },
      { value: 'energy-drinks', label: 'Energy Drinks' }
    ],

    // Promos
    'weekly-deals': [
      { value: 'flash-sales', label: 'Flash Sales' },
      { value: 'clearance', label: 'Clearance Items' },
      { value: 'bundle-deals', label: 'Bundle Deals' },
      { value: 'seasonal-offers', label: 'Seasonal Offers' },
      { value: 'buy-one-get-one', label: 'Buy One Get One' }
    ]
  };

  const handleImageChange = (index, file) => {
    const newImages = [...images];
    newImages[index] = file;
    setImages(newImages);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Auto-set age restriction for liquor
    if (name === 'category' && value === 'liquor-store') {
      setFormData(prev => ({
        ...prev,
        category: value,
        subCategory: "",
        productType: "",
        ageRestricted: true,
        minimumAge: "21"
      }));
    }

    // Reset subCategory and productType when category changes
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        subCategory: "",
        productType: ""
      }));
    }

    // Reset productType when subcategory changes
    if (name === 'subCategory') {
      setFormData(prev => ({
        ...prev,
        productType: ""
      }));
    }
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData({ ...formData, [name]: checked });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      const token = await getToken({ template: "MilikiAPI" });
      console.log("🔑 Token obtained");
      
      const fd = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'tags' && typeof value === 'string') {
          const tagsArray = value.split(',').map(t => t.trim()).filter(t => t);
          fd.append(key, JSON.stringify(tagsArray));
        } else {
          fd.append(key, value);
        }
      });

      images.forEach((img, idx) => {
        if (img) fd.append(`image${idx + 1}`, img);
      });

      const response = await fetch(`${backendUrl}/api/product/add`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      const result = await response.json();
      console.log("📦 Result:", result);

      if (result.success) {
        const productURL = `/category/${formData.category}/${formData.subCategory}${formData.productType ? `?type=${formData.productType}` : ''}`;
        
        setMessage({
          type: "success",
          text: `✅ Product added successfully! It will appear at: ${productURL}`
        });

        setFormData({
          name: "",
          description: "",
          price: "",
          category: "",
          subCategory: "",
          detailedCategory: "",
          productType: "",
          sizes: "[]",
          bestseller: false,
          onPromo: false,
          discount: "0",
          originalPrice: "",
          inStock: true,
          stockQuantity: "100",
          brand: "",
          ageRestricted: false,
          minimumAge: "0",
          tags: "",
          rating: "0",
          reviewCount: "0",
          isLatestCollection: false,
          isTrending: false,
          isNewArrival: false
        });
        setImages([null, null, null, null]);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({
          type: "error",
          text: "❌ Failed to add product: " + result.message
        });
      }
    } catch (error) {
      console.error("❌ Error:", error);
      setMessage({
        type: "error",
        text: "⚠️ Error while uploading product."
      });
    }
  };

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <h2>Add New Product</h2>
      
      {/* Success/Error Messages */}
      {message.text && (
        <div className={`form-message ${message.type}`}>{message.text}</div>
      )}
      
      <p>Upload Images</p>
      <div className="label-container">
        {[0, 1, 2, 3].map((index) => (
          <label htmlFor={`image${index + 1}`} key={index}>
            <img
              className="upload-img"
              src={images[index] ? URL.createObjectURL(images[index]) : assets.upload_area}
              alt={`upload-${index + 1}`}
            />
            <input
              type="file"
              id={`image${index + 1}`}
              hidden
              onChange={(e) => handleImageChange(index, e.target.files[0])}
            />
          </label>
        ))}
      </div>

      <div className="add-form-fields">
        {/* Basic Info */}
        <div className="form-section">
          <h3>📝 Basic Information</h3>
          
          <input
            type="text"
            name="name"
            placeholder="Product Name *"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
          
          <textarea
            name="description"
            placeholder="Product Description *"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows="4"
          />
          
          <input
            type="text"
            name="brand"
            placeholder="Brand (Optional)"
            value={formData.brand}
            onChange={handleInputChange}
          />
        </div>

        {/* ✅ ENHANCED: 3-LEVEL CATEGORY SYSTEM */}
        <div className="form-section">
          <h3>📂 Category Selection (3 Levels)</h3>
          
          {/* Level 1: Main Category */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "6px"
            }}>
              Level 1: Main Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              style={{ marginBottom: "0" }}
            >
              <option value="">Select Main Category</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          {/* Level 2: Subcategory */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "6px"
            }}>
              Level 2: Subcategory *
            </label>
            <select
              name="subCategory"
              value={formData.subCategory}
              onChange={handleInputChange}
              required
              disabled={!formData.category}
              style={{ marginBottom: "0" }}
            >
              <option value="">{formData.category ? "Select Subcategory" : "Select main category first"}</option>
              {formData.category && subCategories[formData.category]?.map(sub => (
                <option key={sub} value={sub}>
                  {sub.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Level 3: Product Type */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "6px"
            }}>
              Level 3: Product Type (Optional but Recommended)
            </label>
            <select
              name="productType"
              value={formData.productType}
              onChange={handleInputChange}
              disabled={!formData.subCategory}
              style={{ marginBottom: "0" }}
            >
              <option value="">{formData.subCategory ? "Select Product Type (Optional)" : "Select subcategory first"}</option>
              {formData.subCategory && productTypes[formData.subCategory]?.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Preview URL */}
          {formData.category && formData.subCategory && (
            <div style={{
              marginTop: "16px",
              padding: "12px",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "8px"
            }}>
              <p style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#15803d",
                marginBottom: "4px"
              }}>
                📍 Product will appear at:
              </p>
              <code style={{
                fontSize: "12px",
                color: "#15803d",
                wordBreak: "break-all"
              }}>
                /category/{formData.category}/{formData.subCategory}{formData.productType && `?type=${formData.productType}`}
              </code>
            </div>
          )}
          
          <input
            type="text"
            name="detailedCategory"
            placeholder="Detailed Category (legacy field, optional)"
            value={formData.detailedCategory}
            onChange={handleInputChange}
            style={{ marginTop: "12px" }}
          />
          
          <input
            type="text"
            name="tags"
            placeholder="Tags (comma-separated, e.g., organic, fresh, premium)"
            value={formData.tags}
            onChange={handleInputChange}
          />
        </div>

        {/* Pricing */}
        <div className="form-section">
          <h3>💰 Pricing</h3>
          
          <input
            type="number"
            name="price"
            placeholder="Price (KES) *"
            value={formData.price}
            onChange={handleInputChange}
            required
            min="0"
          />
          
          <label className="checkbox-field">
            <input
              type="checkbox"
              name="onPromo"
              checked={formData.onPromo}
              onChange={handleCheckboxChange}
            />
            On Promotion
          </label>
          
          {formData.onPromo && (
            <>
              <input
                type="number"
                name="originalPrice"
                placeholder="Original Price (before discount)"
                value={formData.originalPrice}
                onChange={handleInputChange}
                min="0"
              />
              <input
                type="number"
                name="discount"
                placeholder="Discount % (0-100)"
                value={formData.discount}
                onChange={handleInputChange}
                min="0"
                max="100"
              />
            </>
          )}
        </div>

        {/* Stock & Sizes */}
        <div className="form-section">
          <h3>📦 Stock & Sizes</h3>
          
          <input
            type="text"
            name="sizes"
            placeholder='Sizes (e.g. ["S","M","L"] or ["1kg","5kg"])'
            value={formData.sizes}
            onChange={handleInputChange}
            required
          />
          
          <input
            type="number"
            name="stockQuantity"
            placeholder="Stock Quantity"
            value={formData.stockQuantity}
            onChange={handleInputChange}
            min="0"
          />
          
          <label className="checkbox-field">
            <input
              type="checkbox"
              name="inStock"
              checked={formData.inStock}
              onChange={handleCheckboxChange}
            />
            In Stock
          </label>
        </div>

        {/* Display Sections */}
        <div className="form-section featured-section">
          <h3>⭐ Display Sections</h3>
          <p className="section-help-text">Select where this product should appear on the homepage</p>
          
          <label className="checkbox-field featured">
            <input
              type="checkbox"
              name="isLatestCollection"
              checked={formData.isLatestCollection}
              onChange={handleCheckboxChange}
            />
            <span className="checkbox-label-content">
              <span className="checkbox-icon">🆕</span>
              <span>
                <strong>Latest Collection</strong>
                <small>Show in "Latest Collection" section</small>
              </span>
            </span>
          </label>
          
          <label className="checkbox-field featured">
            <input
              type="checkbox"
              name="isTrending"
              checked={formData.isTrending}
              onChange={handleCheckboxChange}
            />
            <span className="checkbox-label-content">
              <span className="checkbox-icon">🔥</span>
              <span>
                <strong>Trending Now</strong>
                <small>Show in "Trending" section</small>
              </span>
            </span>
          </label>
          
          <label className="checkbox-field featured">
            <input
              type="checkbox"
              name="bestseller"
              checked={formData.bestseller}
              onChange={handleCheckboxChange}
            />
            <span className="checkbox-label-content">
              <span className="checkbox-icon">⭐</span>
              <span>
                <strong>Best Seller</strong>
                <small>Show in "Best Sellers" section</small>
              </span>
            </span>
          </label>
          
          <label className="checkbox-field featured">
            <input
              type="checkbox"
              name="isNewArrival"
              checked={formData.isNewArrival}
              onChange={handleCheckboxChange}
            />
            <span className="checkbox-label-content">
              <span className="checkbox-icon">✨</span>
              <span>
                <strong>New Arrival</strong>
                <small>Show in "New Arrivals" section</small>
              </span>
            </span>
          </label>
        </div>

        {/* Additional Options */}
        <div className="form-section">
          <h3>🔒 Restrictions</h3>
          
          <label className="checkbox-field">
            <input
              type="checkbox"
              name="ageRestricted"
              checked={formData.ageRestricted}
              onChange={handleCheckboxChange}
            />
            Age Restricted (e.g., Alcohol)
          </label>
          
          {formData.ageRestricted && (
            <input
              type="number"
              name="minimumAge"
              placeholder="Minimum Age Required"
              value={formData.minimumAge}
              onChange={handleInputChange}
              min="0"
              max="100"
            />
          )}
        </div>

        <button type="submit" className="submit-btn">
          ✅ Add Product
        </button>
      </div>
    </form>
  );
};

export default Add;
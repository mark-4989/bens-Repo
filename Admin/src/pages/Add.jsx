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
    // NEW: Collection flags
    isLatestCollection: false,
    isTrending: false,
    isNewArrival: false
  });

  // State for previewing and storing image files
  const [images, setImages] = useState([null, null, null, null]);

  // Category options
  const categories = [
    { value: 'food-cupboard', label: '🥫 Food Cupboard' },
    { value: 'fresh-foods', label: '🥗 Fresh Foods' },
    { value: 'baby-kids', label: '👶 Baby & Kids' },
    { value: 'electronics', label: '📱 Electronics' },
    { value: 'liquor-store', label: '🍷 Liquor Store' },
    { value: 'promos', label: '🎁 Promotions' },
    { value: 'clothing', label: '👕 Clothing' },
    { value: 'home-garden', label: '🏡 Home & Garden' },
    { value: 'health-beauty', label: '💄 Health & Beauty' },
    { value: 'sports-outdoors', label: '⚽ Sports & Outdoors' },
    { value: 'other', label: '📦 Other' }
  ];

  // Subcategory options based on category
  const subCategories = {
    'food-cupboard': ['grains-cereals', 'cooking-oils', 'canned-foods', 'spices-seasonings', 'beverages'],
    'fresh-foods': ['fruits-vegetables', 'meat-poultry', 'fish-seafood', 'dairy-products', 'bakery'],
    'baby-kids': ['baby-food-formula', 'diapers-wipes', 'baby-care', 'kids-clothing', 'toys-games'],
    'electronics': ['mobile-phones', 'computers-laptops', 'tvs-audio', 'home-appliances', 'gaming'],
    'liquor-store': ['wines', 'spirits', 'beer-cider', 'liqueurs', 'bar-accessories'],
    'promos': ['weekly-deals', 'flash-sales', 'clearance', 'bundles'],
    'clothing': ['topwear', 'bottomwear', 'winterwear'],
    'home-garden': ['furniture', 'decor', 'garden-tools'],
    'health-beauty': ['skincare', 'haircare', 'makeup'],
    'sports-outdoors': ['sports-equipment', 'outdoor-gear', 'fitness'],
    'other': ['general']
  };

  // Handle file input changes
  const handleImageChange = (index, file) => {
    const newImages = [...images];
    newImages[index] = file;
    setImages(newImages);
  };

  // Handle text input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Auto-set age restriction for liquor
    if (name === 'category' && value === 'liquor-store') {
      setFormData(prev => ({
        ...prev,
        category: value,
        ageRestricted: true,
        minimumAge: "21"
      }));
    }
  };

  // Handle checkbox toggle
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData({ ...formData, [name]: checked });
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = await getToken({ template: "MilikiAPI" });
      console.log("🔑 Token obtained");
      
      const fd = new FormData();

      // Append form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'tags' && typeof value === 'string') {
          // Convert comma-separated tags to array
          const tagsArray = value.split(',').map(t => t.trim()).filter(t => t);
          fd.append(key, JSON.stringify(tagsArray));
        } else {
          fd.append(key, value);
        }
      });

      // Append image files
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
        alert("✅ Product added successfully!");
        // Reset form
        setFormData({
          name: "",
          description: "",
          price: "",
          category: "",
          subCategory: "",
          detailedCategory: "",
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
      } else {
        alert("❌ Failed to add product: " + result.message);
      }
    } catch (error) {
      console.error("❌ Error:", error);
      alert("⚠️ Error while uploading product.");
    }
  };

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <h2>Add New Product</h2>
      
      <p>Upload Images</p>
      {/* Image Upload Section */}
      <div className="label-container">
        {[0, 1, 2, 3].map((index) => (
          <label htmlFor={`image${index + 1}`} key={index}>
            <img
              className="upload-img"
              src={
                images[index]
                  ? URL.createObjectURL(images[index])
                  : assets.upload_area
              }
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

      {/* Product Fields */}
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

        {/* Categories */}
        <div className="form-section">
          <h3>📂 Categories</h3>
          
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
          >
            <option value="">Select Category *</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          
          <select
            name="subCategory"
            value={formData.subCategory}
            onChange={handleInputChange}
            required
            disabled={!formData.category}
          >
            <option value="">Select Sub-Category *</option>
            {formData.category && subCategories[formData.category]?.map(sub => (
              <option key={sub} value={sub}>
                {sub.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </option>
            ))}
          </select>
          
          <input
            type="text"
            name="detailedCategory"
            placeholder="Detailed Category (e.g., rice, beef, smartphones)"
            value={formData.detailedCategory}
            onChange={handleInputChange}
          />
          
          <input
            type="text"
            name="tags"
            placeholder="Tags (comma-separated, e.g., organic, fresh, premium)"
            value={formData.tags}
            onChange={handleInputChange}
          />
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

        {/* ✅ NEW: Display Sections */}
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
import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/clerk-react";
import "./EditProductModal.css";

const EditProductModal = ({ product, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    id: product._id,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    subCategory: product.subCategory,
    detailedCategory: product.detailedCategory || "",
    bestseller: product.bestseller || false,
    sizes: product.sizes,
    // NEW fields
    onPromo: product.onPromo || false,
    discount: product.discount || 0,
    originalPrice: product.originalPrice || "",
    inStock: product.inStock !== undefined ? product.inStock : true,
    stockQuantity: product.stockQuantity || 100,
    brand: product.brand || "",
    ageRestricted: product.ageRestricted || false,
    minimumAge: product.minimumAge || 0,
    tags: (product.tags || []).join(", "),
    // Display sections
    isLatestCollection: product.isLatestCollection || false,
    isTrending: product.isTrending || false,
    isNewArrival: product.isNewArrival || false
  });

  const [images, setImages] = useState({
    image1: null,
    image2: null,
    image3: null,
    image4: null,
  });

  const [loading, setLoading] = useState(false);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://foreverecommerce-2.onrender.com";
  const { getToken } = useAuth();

  // Category options
  const categories = [
    { value: 'food-cupboard', label: 'Food Cupboard' },
    { value: 'fresh-foods', label: 'Fresh Foods' },
    { value: 'baby-kids', label: 'Baby & Kids' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'liquor-store', label: 'Liquor Store' },
    { value: 'promos', label: 'Promotions' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'home-garden', label: 'Home & Garden' },
    { value: 'health-beauty', label: 'Health & Beauty' },
    { value: 'sports-outdoors', label: 'Sports & Outdoors' },
    { value: 'other', label: 'Other' }
  ];

  // Subcategory options
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

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Handle size selection
  const handleSizeToggle = (size) => {
    const newSizes = formData.sizes.includes(size)
      ? formData.sizes.filter((s) => s !== size)
      : [...formData.sizes, size];
    setFormData({ ...formData, sizes: newSizes });
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setImages({ ...images, [name]: files[0] });
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("✏️ Updating product:", formData.id);

      const token = await getToken({ template: "MilikiAPI" });
      
      if (!token) {
        toast.error("Authentication required. Please login again.");
        setLoading(false);
        return;
      }

      // Create FormData for file upload
      const data = new FormData();
      data.append("id", formData.id);
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("price", formData.price);
      data.append("category", formData.category);
      data.append("subCategory", formData.subCategory);
      data.append("detailedCategory", formData.detailedCategory);
      data.append("bestseller", formData.bestseller);
      data.append("sizes", JSON.stringify(formData.sizes));
      
      // NEW fields
      data.append("onPromo", formData.onPromo);
      data.append("discount", formData.discount);
      data.append("originalPrice", formData.originalPrice);
      data.append("inStock", formData.inStock);
      data.append("stockQuantity", formData.stockQuantity);
      data.append("brand", formData.brand);
      data.append("ageRestricted", formData.ageRestricted);
      data.append("minimumAge", formData.minimumAge);
      
      // Tags - convert to array
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t);
      data.append("tags", JSON.stringify(tagsArray));
      
      // Display sections
      data.append("isLatestCollection", formData.isLatestCollection);
      data.append("isTrending", formData.isTrending);
      data.append("isNewArrival", formData.isNewArrival);

      // Append images if new ones are selected
      if (images.image1) data.append("image1", images.image1);
      if (images.image2) data.append("image2", images.image2);
      if (images.image3) data.append("image3", images.image3);
      if (images.image4) data.append("image4", images.image4);

      console.log("📤 Sending update request...");

      const response = await axios.post(
        `${backendUrl}/api/product/update`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("✅ Update response:", response.data);

      if (response.data.success) {
        toast.success("Product updated successfully!");
        onUpdate();
        onClose();
      } else {
        toast.error(response.data.message || "Failed to update product");
      }
    } catch (error) {
      console.error("❌ Update error:", error);
      if (error.response?.status === 403) {
        toast.error("Not authorized. Please check your admin permissions.");
      } else if (error.response?.status === 401) {
        toast.error("Authentication failed. Please login again.");
      } else {
        toast.error(error.response?.data?.message || "Failed to update product");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Product</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-form">
          {/* Basic Info */}
          <div className="form-section">
            <h3>📝 Basic Information</h3>
            
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="form-section">
            <h3>💰 Pricing</h3>
            
            <div className="form-group">
              <label>Price (KSH) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="onPromo"
                  checked={formData.onPromo}
                  onChange={handleChange}
                />
                On Promotion
              </label>
            </div>

            {formData.onPromo && (
              <>
                <div className="form-group">
                  <label>Original Price</label>
                  <input
                    type="number"
                    name="originalPrice"
                    value={formData.originalPrice}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Discount %</label>
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleChange}
                    min="0"
                    max="100"
                  />
                </div>
              </>
            )}
          </div>

          {/* Categories */}
          <div className="form-section">
            <h3>📂 Categories</h3>
            
            <div className="form-group">
              <label>Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Sub-Category *</label>
              <select
                name="subCategory"
                value={formData.subCategory}
                onChange={handleChange}
                required
              >
                {formData.category && subCategories[formData.category]?.map(sub => (
                  <option key={sub} value={sub}>
                    {sub.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Detailed Category</label>
              <input
                type="text"
                name="detailedCategory"
                value={formData.detailedCategory}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Tags (comma-separated)</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Stock */}
          <div className="form-section">
            <h3>📦 Stock & Sizes</h3>
            
            <div className="form-group">
              <label>Available Sizes *</label>
              <div className="sizes-selector">
                {["S", "M", "L", "XL", "XXL"].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`size-btn ${formData.sizes.includes(size) ? "selected" : ""}`}
                    onClick={() => handleSizeToggle(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Stock Quantity</label>
              <input
                type="number"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleChange}
                min="0"
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="inStock"
                  checked={formData.inStock}
                  onChange={handleChange}
                />
                In Stock
              </label>
            </div>
          </div>

          {/* Display Sections */}
          <div className="form-section featured-section">
            <h3>⭐ Display Sections</h3>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="isLatestCollection"
                  checked={formData.isLatestCollection}
                  onChange={handleChange}
                />
                🆕 Latest Collection
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="isTrending"
                  checked={formData.isTrending}
                  onChange={handleChange}
                />
                🔥 Trending Now
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="bestseller"
                  checked={formData.bestseller}
                  onChange={handleChange}
                />
                ⭐ Best Seller
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="isNewArrival"
                  checked={formData.isNewArrival}
                  onChange={handleChange}
                />
                ✨ New Arrival
              </label>
            </div>
          </div>

          {/* Age Restriction */}
          <div className="form-section">
            <h3>🔒 Restrictions</h3>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="ageRestricted"
                  checked={formData.ageRestricted}
                  onChange={handleChange}
                />
                Age Restricted
              </label>
            </div>

            {formData.ageRestricted && (
              <div className="form-group">
                <label>Minimum Age</label>
                <input
                  type="number"
                  name="minimumAge"
                  value={formData.minimumAge}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            )}
          </div>

          {/* Current Images */}
          <div className="form-group">
            <label>Current Images</label>
            <div className="current-images">
              {product.image.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Product ${index + 1}`}
                  className="current-image"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/100?text=Image';
                  }}
                />
              ))}
            </div>
          </div>

          {/* Upload New Images */}
          <div className="form-group">
            <label>Upload New Images (Optional)</label>
            <div className="image-uploads">
              {["image1", "image2", "image3", "image4"].map((imgName, index) => (
                <div key={imgName} className="image-upload-item">
                  <label htmlFor={imgName}>Image {index + 1}</label>
                  <input
                    type="file"
                    id={imgName}
                    name={imgName}
                    onChange={handleImageChange}
                    accept="image/*"
                  />
                  {images[imgName] && (
                    <span className="file-name">{images[imgName].name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Updating..." : "Update Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
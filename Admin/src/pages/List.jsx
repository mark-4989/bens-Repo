import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/clerk-react";
import "./List.css";
import EditProductModal from "./EditProductModal";

const List = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");
  const [showBestsellers, setShowBestsellers] = useState(false);
  const [showLatestCollection, setShowLatestCollection] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const [showNewArrivals, setShowNewArrivals] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [showInStock, setShowInStock] = useState(false);
  const [sortBy, setSortBy] = useState("date-desc");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://foreverecommerce-2.onrender.com";
  const { getToken } = useAuth();

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/product/list`);

      if (response.data.success) {
        setProducts(response.data.products);
        setFilteredProducts(response.data.products);
        toast.success(`Loaded ${response.data.products.length} products`);
      } else {
        toast.error(response.data.message || "Failed to load products");
      }
    } catch (error) {
      console.error("❌ Fetch error:", error);
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const removeProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const token = await getToken({ template: "MilikiAPI" });

      if (!token) {
        toast.error("Authentication required. Please login again.");
        return;
      }

      const response = await axios.post(
        `${backendUrl}/api/product/remove`,
        { id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Product deleted successfully");
        fetchProducts();
      } else {
        toast.error(response.data.message || "Failed to delete product");
      }
    } catch (error) {
      console.error("❌ Delete error:", error);
      toast.error("Failed to delete product");
    }
  };

  // Open/close edit modal
  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingProduct(null);
  };

  const handleProductUpdate = () => {
    fetchProducts();
    handleCloseEditModal();
  };

  // Get unique categories and subcategories
  const categories = ["All", ...new Set(products.map((p) => p.category))];
  const subCategories = ["All", ...new Set(products.map((p) => p.subCategory))];

  // Apply filters
  useEffect(() => {
    let filtered = [...products];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter((product) => product.category === selectedCategory);
    }

    // SubCategory filter
    if (selectedSubCategory !== "All") {
      filtered = filtered.filter((product) => product.subCategory === selectedSubCategory);
    }

    // Display section filters
    if (showBestsellers) {
      filtered = filtered.filter((product) => product.bestseller);
    }
    if (showLatestCollection) {
      filtered = filtered.filter((product) => product.isLatestCollection);
    }
    if (showTrending) {
      filtered = filtered.filter((product) => product.isTrending);
    }
    if (showNewArrivals) {
      filtered = filtered.filter((product) => product.isNewArrival);
    }
    if (showPromo) {
      filtered = filtered.filter((product) => product.onPromo);
    }
    if (showInStock) {
      filtered = filtered.filter((product) => product.inStock);
    }

    // Sorting
    switch (sortBy) {
      case "name-asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "date-desc":
        filtered.sort((a, b) => b.date - a.date);
        break;
      case "date-asc":
        filtered.sort((a, b) => a.date - b.date);
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  }, [
    products,
    selectedCategory,
    selectedSubCategory,
    showBestsellers,
    showLatestCollection,
    showTrending,
    showNewArrivals,
    showPromo,
    showInStock,
    sortBy,
    searchTerm,
  ]);

  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="list-container">
      <div className="list-header">
        <h2>📦 Product Management</h2>
        <button onClick={fetchProducts} className="refresh-btn">
          🔄 Refresh List
        </button>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        {/* Search */}
        <div className="filter-group full-width">
          <input
            type="text"
            placeholder="🔍 Search by name, description, or brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Category Filters */}
        <div className="filter-group">
          <label>Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Sub-Category:</label>
          <select
            value={selectedSubCategory}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            className="filter-select"
          >
            {subCategories.map((subCat) => (
              <option key={subCat} value={subCat}>{subCat}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="price-asc">Price (Low to High)</option>
            <option value="price-desc">Price (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Display Section Filters */}
      <div className="display-filters">
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={showBestsellers}
            onChange={(e) => setShowBestsellers(e.target.checked)}
          />
          ⭐ Best Sellers Only
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={showLatestCollection}
            onChange={(e) => setShowLatestCollection(e.target.checked)}
          />
          🆕 Latest Collection
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={showTrending}
            onChange={(e) => setShowTrending(e.target.checked)}
          />
          🔥 Trending
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={showNewArrivals}
            onChange={(e) => setShowNewArrivals(e.target.checked)}
          />
          ✨ New Arrivals
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={showPromo}
            onChange={(e) => setShowPromo(e.target.checked)}
          />
          🎁 On Promo
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={showInStock}
            onChange={(e) => setShowInStock(e.target.checked)}
          />
          📦 In Stock Only
        </label>
      </div>

      {/* Products Count */}
      <div className="products-count">
        Showing {filteredProducts.length} of {products.length} products
      </div>

      {/* Products Table */}
      <div className="products-table-container">
        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <div className="no-products-icon">📭</div>
            <h3>No products found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product._id}>
                  <td>
                    <img
                      src={product.image[0]}
                      alt={product.name}
                      className="product-image"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/100?text=No+Image";
                      }}
                    />
                  </td>
                  <td>
                    <div className="product-name">{product.name}</div>
                    <div className="product-brand">{product.brand || "-"}</div>
                  </td>
                  <td>
                    <div className="category-badge">{product.category}</div>
                    <div className="subcategory-text">{product.subCategory}</div>
                  </td>
                  <td className="price-cell">
                    {product.onPromo && product.originalPrice ? (
                      <>
                        <div className="original-price">KSH {product.originalPrice.toLocaleString()}</div>
                        <div className="promo-price">KSH {product.price.toLocaleString()}</div>
                        <div className="discount-badge">{product.discount}% OFF</div>
                      </>
                    ) : (
                      <div className="regular-price">KSH {product.price.toLocaleString()}</div>
                    )}
                  </td>
                  <td>
                    <div className={`stock-badge ${product.inStock ? 'in-stock' : 'out-stock'}`}>
                      {product.inStock ? '✓ In Stock' : '✗ Out of Stock'}
                    </div>
                    <div className="stock-qty">{product.stockQuantity || 0} units</div>
                  </td>
                  <td>
                    <div className="product-tags">
                      {product.bestseller && <span className="tag bestseller">⭐ Best</span>}
                      {product.isLatestCollection && <span className="tag latest">🆕 Latest</span>}
                      {product.isTrending && <span className="tag trending">🔥 Trending</span>}
                      {product.isNewArrival && <span className="tag new">✨ New</span>}
                      {product.onPromo && <span className="tag promo">🎁 Promo</span>}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button onClick={() => handleEdit(product)} className="edit-btn">
                        ✏️ Edit
                      </button>
                      <button onClick={() => removeProduct(product._id)} className="delete-btn">
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={handleCloseEditModal}
          onUpdate={handleProductUpdate}
        />
      )}
    </div>
  );
};

export default List;
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/clerk-react";
import {
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  Package,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Box,
} from "lucide-react";
import "./List.css";
import EditProductModal from "./EditProductModal";

const SORT_OPTIONS = [
  { value: "date-desc",  label: "Newest First" },
  { value: "date-asc",   label: "Oldest First" },
  { value: "name-asc",   label: "Name A → Z" },
  { value: "name-desc",  label: "Name Z → A" },
  { value: "price-asc",  label: "Price ↑" },
  { value: "price-desc", label: "Price ↓" },
];

const TAG_FILTERS = [
  { key: "showBestsellers",      label: "Best Sellers",      field: "bestseller" },
  { key: "showLatestCollection", label: "Latest Collection", field: "isLatestCollection" },
  { key: "showTrending",         label: "Trending",          field: "isTrending" },
  { key: "showNewArrivals",      label: "New Arrivals",      field: "isNewArrival" },
  { key: "showPromo",            label: "On Promo",          field: "onPromo" },
  { key: "showInStock",          label: "In Stock",          field: "inStock" },
];

const List = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory]       = useState("All");
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");
  const [sortBy, setSortBy]       = useState("date-desc");
  const [searchTerm, setSearchTerm] = useState("");

  const [tagFilters, setTagFilters] = useState({
    showBestsellers: false,
    showLatestCollection: false,
    showTrending: false,
    showNewArrivals: false,
    showPromo: false,
    showInStock: false,
  });

  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal]   = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://foreverecommerce-2.onrender.com";
  const { getToken } = useAuth();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/product/list`);
      if (response.data.success) {
        setProducts(response.data.products);
        setFilteredProducts(response.data.products);
        toast.success(`${response.data.products.length} products loaded`);
      } else {
        toast.error(response.data.message || "Failed to load products");
      }
    } catch (error) {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const removeProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      const token = await getToken({ template: "MilikiAPI" });
      if (!token) { toast.error("Authentication required."); return; }
      const response = await axios.post(
        `${backendUrl}/api/product/remove`,
        { id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) { toast.success("Product deleted"); fetchProducts(); }
      else toast.error(response.data.message || "Delete failed");
    } catch { toast.error("Failed to delete product"); }
  };

  const handleEdit = (product) => { setEditingProduct(product); setShowEditModal(true); };
  const handleCloseEditModal = () => { setShowEditModal(false); setEditingProduct(null); };
  const handleProductUpdate = () => { fetchProducts(); handleCloseEditModal(); };

  const categories    = ["All", ...new Set(products.map((p) => p.category))];
  const subCategories = ["All", ...new Set(products.map((p) => p.subCategory))];

  useEffect(() => {
    let f = [...products];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      f = f.filter((p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
      );
    }
    if (selectedCategory !== "All")    f = f.filter((p) => p.category === selectedCategory);
    if (selectedSubCategory !== "All") f = f.filter((p) => p.subCategory === selectedSubCategory);

    TAG_FILTERS.forEach(({ key, field }) => {
      if (tagFilters[key]) f = f.filter((p) => p[field]);
    });

    switch (sortBy) {
      case "name-asc":   f.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name-desc":  f.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "price-asc":  f.sort((a, b) => a.price - b.price); break;
      case "price-desc": f.sort((a, b) => b.price - a.price); break;
      case "date-desc":  f.sort((a, b) => b.date - a.date); break;
      case "date-asc":   f.sort((a, b) => a.date - b.date); break;
    }

    setFilteredProducts(f);
  }, [products, selectedCategory, selectedSubCategory, tagFilters, sortBy, searchTerm]);

  useEffect(() => { fetchProducts(); }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading products</p>
      </div>
    );
  }

  return (
    <div className="list-container">
      {/* Header */}
      <div className="list-header">
        <div className="list-header-left">
          <h2>Product Catalogue</h2>
          <p>Manage and organise your inventory</p>
        </div>
        <button onClick={fetchProducts} className="refresh-btn">
          <RefreshCw size={14} strokeWidth={2.5} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group" style={{ flex: 1 }}>
          <label>Search</label>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9a9a9a" }}
            />
            <input
              type="text"
              placeholder="Name, brand, description…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ paddingLeft: 36, width: "100%" }}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Category</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="filter-select">
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Sub-category</label>
          <select value={selectedSubCategory} onChange={(e) => setSelectedSubCategory(e.target.value)} className="filter-select">
            {subCategories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Sort</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Tag filters */}
      <div className="display-filters">
        {TAG_FILTERS.map(({ key, label }) => (
          <label key={key} className="filter-checkbox" style={tagFilters[key] ? { borderColor: "#0a0a0a", background: "#0a0a0a", color: "#fff" } : {}}>
            <input
              type="checkbox"
              checked={tagFilters[key]}
              onChange={(e) => setTagFilters((prev) => ({ ...prev, [key]: e.target.checked }))}
              style={{ accentColor: tagFilters[key] ? "#fff" : "#0a0a0a" }}
            />
            {label}
          </label>
        ))}
      </div>

      {/* Count */}
      <div className="products-count">
        {filteredProducts.length} of {products.length} products
      </div>

      {/* Table */}
      <div className="products-table-container">
        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <Box size={56} strokeWidth={1} className="no-products-icon" />
            <h3>No products found</h3>
            <p>Try adjusting your filters or search term</p>
          </div>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product</th>
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
                      onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/80?text=—"; }}
                    />
                  </td>

                  <td>
                    <div className="product-name">{product.name}</div>
                    <div className="product-brand">{product.brand || "—"}</div>
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
                    <div className={`stock-badge ${product.inStock ? "in-stock" : "out-stock"}`}>
                      {product.inStock
                        ? <><CheckCircle2 size={11} /> In Stock</>
                        : <><XCircle size={11} /> Out of Stock</>}
                    </div>
                    <div className="stock-qty">{product.stockQuantity ?? 0} units</div>
                  </td>

                  <td>
                    <div className="product-tags">
                      {product.bestseller          && <span className="tag bestseller">Best Seller</span>}
                      {product.isLatestCollection   && <span className="tag latest">Latest</span>}
                      {product.isTrending           && <span className="tag trending">Trending</span>}
                      {product.isNewArrival         && <span className="tag new">New</span>}
                      {product.onPromo              && <span className="tag promo">Promo</span>}
                    </div>
                  </td>

                  <td>
                    <div className="action-buttons">
                      <button onClick={() => handleEdit(product)} className="edit-btn">
                        <Pencil size={13} strokeWidth={2} />
                        Edit
                      </button>
                      <button onClick={() => removeProduct(product._id)} className="delete-btn">
                        <Trash2 size={13} strokeWidth={2} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
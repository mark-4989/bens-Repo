// CategoryPage.jsx - Works with your Sidebar navigation

import React, { useContext, useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import "./CategoryPage.css";

const CategoryPage = () => {
  const { products } = useContext(ShopContext);
  const { category, subcategory } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Get query parameters for detailed filtering
  const queryParams = new URLSearchParams(location.search);
  const productType = queryParams.get("type");

  const [filterProducts, setFilterProducts] = useState([]);
  const [sortType, setSortType] = useState("relevant");
  const [showFilter, setShowFilter] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });

  // Apply filters based on URL params
  const applyFilter = () => {
    let productsCopy = products.slice();

    // Filter by main category
    if (category) {
      // Handle both /category/fresh-foods and /fresh-foods routes
      const cleanCategory = category.replace("category/", "");
      productsCopy = productsCopy.filter(
        (item) => item.category === cleanCategory
      );
    }

    // Filter by subcategory
    if (subcategory) {
      productsCopy = productsCopy.filter(
        (item) => item.subCategory === subcategory
      );
    }

    // Filter by product type (from query params)
    if (productType) {
      productsCopy = productsCopy.filter((item) => {
        const matchesDetailedCategory = item.detailedCategory
          ?.toLowerCase()
          .includes(productType.toLowerCase());
        const matchesTags = item.tags?.some((tag) =>
          tag.toLowerCase().includes(productType.toLowerCase())
        );
        const matchesName = item.name
          .toLowerCase()
          .includes(productType.toLowerCase());
        return matchesDetailedCategory || matchesTags || matchesName;
      });
    }

    // Filter by brands
    if (selectedBrands.length > 0) {
      productsCopy = productsCopy.filter((item) =>
        selectedBrands.includes(item.brand)
      );
    }

    // Filter by price range
    productsCopy = productsCopy.filter(
      (item) => item.price >= priceRange.min && item.price <= priceRange.max
    );

    setFilterProducts(productsCopy);
  };

  // Apply sorting
  const sortProduct = () => {
    let fpCopy = filterProducts.slice();

    switch (sortType) {
      case "low-high":
        setFilterProducts(fpCopy.sort((a, b) => a.price - b.price));
        break;
      case "high-low":
        setFilterProducts(fpCopy.sort((a, b) => b.price - a.price));
        break;
      case "name":
        setFilterProducts(fpCopy.sort((a, b) => a.name.localeCompare(b.name)));
        break;
      case "rating":
        setFilterProducts(
          fpCopy.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        );
        break;
      default:
        applyFilter();
        break;
    }
  };

  // Get unique brands from filtered products
  const availableBrands = [
    ...new Set(products.map((item) => item.brand).filter(Boolean)),
  ];

  // Reapply filters when params change
  useEffect(() => {
    applyFilter();
  }, [category, subcategory, productType, products, selectedBrands, priceRange]);

  // Apply sorting when sort type or filtered products change
  useEffect(() => {
    sortProduct();
  }, [sortType]);

  // Generate page title based on route
  const getPageTitle = () => {
    if (productType) {
      return productType
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    if (subcategory) {
      return subcategory
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    if (category) {
      const cleanCategory = category.replace("category/", "");
      const titles = {
        "fresh-foods": "Fresh Food",
        "baby-kids": "Baby & Kids",
        electronics: "Electronics",
        "liquor-store": "Liquor Store",
        "food-cupboard": "Food Cupboard",
        promos: "Promotions",
      };
      return titles[cleanCategory] || cleanCategory;
    }
    return "Products";
  };

  // Generate breadcrumb
  const getBreadcrumb = () => {
    const crumbs = [
      { label: "Home", path: "/" },
    ];

    if (category) {
      const cleanCategory = category.replace("category/", "");
      crumbs.push({
        label: getPageTitle(),
        path: `/category/${cleanCategory}`,
      });
    }

    if (subcategory) {
      crumbs.push({
        label: subcategory
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        path: `/category/${category}/${subcategory}`,
      });
    }

    if (productType) {
      crumbs.push({
        label: productType
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        path: location.pathname + location.search,
      });
    }

    return crumbs;
  };

  const handleBrandToggle = (brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setPriceRange({ min: 0, max: 100000 });
    setSortType("relevant");
  };

  return (
    <div className="category-page-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        {getBreadcrumb().map((crumb, index) => (
          <React.Fragment key={index}>
            <span
              onClick={() => navigate(crumb.path)}
              style={{ cursor: "pointer" }}
              className={index === getBreadcrumb().length - 1 ? "active" : ""}
            >
              {crumb.label}
            </span>
            {index < getBreadcrumb().length - 1 && <span> / </span>}
          </React.Fragment>
        ))}
      </div>

      <div className="category-content">
        {/* Filter Sidebar */}
        <div className={`filters-panel ${showFilter ? "active" : ""}`}>
          <div className="filter-header">
            <h3>Filters</h3>
            <button
              className="toggle-filter-btn mobile-only"
              onClick={() => setShowFilter(!showFilter)}
            >
              ✕
            </button>
          </div>

          {/* Sort By */}
          <div className="filter-section">
            <h4>Sort By</h4>
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value)}
              className="sort-select"
            >
              <option value="relevant">Relevant</option>
              <option value="low-high">Price: Low to High</option>
              <option value="high-low">Price: High to Low</option>
              <option value="name">Name: A-Z</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>

          {/* Price Range */}
          <div className="filter-section">
            <h4>Price Range (KES)</h4>
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) =>
                  setPriceRange({ ...priceRange, min: +e.target.value })
                }
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) =>
                  setPriceRange({ ...priceRange, max: +e.target.value })
                }
              />
            </div>
          </div>

          {/* Brands */}
          {availableBrands.length > 0 && (
            <div className="filter-section">
              <h4>Brands</h4>
              <div className="brand-checkboxes">
                {availableBrands.slice(0, 10).map((brand) => (
                  <label key={brand} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => handleBrandToggle(brand)}
                    />
                    <span>{brand}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear All Filters
          </button>
        </div>

        {/* Products Grid */}
        <div className="products-section">
          {/* Page Header */}
          <div className="products-header">
            <div>
              <Title text1={getPageTitle()} text2="PRODUCTS" />
              <p className="products-count">
                {filterProducts.length} products found
              </p>
            </div>
            <button
              className="toggle-filter-btn mobile-only"
              onClick={() => setShowFilter(true)}
            >
              🔍 Filters
            </button>
          </div>

          {/* Products Grid */}
          {filterProducts.length > 0 ? (
            <div className="products-grid">
              {filterProducts.map((item, index) => (
                <ProductItem
                  key={index}
                  id={item._id}
                  image={item.image}
                  name={item.name}
                  price={item.price}
                  onPromo={item.onPromo}
                  discount={item.discount}
                  originalPrice={item.originalPrice}
                  bestseller={item.bestseller}
                  rating={item.rating}
                  reviewCount={item.reviewCount}
                />
              ))}
            </div>
          ) : (
            <div className="no-products">
              <p>No products found in this category.</p>
              <button onClick={clearFilters}>Clear Filters</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;
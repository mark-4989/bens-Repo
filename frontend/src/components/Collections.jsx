import React, { useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from '../components/Title';
import ProductItem from '../components/ProductItem';
import './Collection.css';

const Collection = () => {
  const { products, search, showSearch } = useContext(ShopContext);
  const [searchParams] = useSearchParams();
  const [filterProducts, setFilterProducts] = useState([]);
  const [sortType, setSortType] = useState('relevant');

  // Get URL parameters for filtering
  const category = searchParams.get('category');
  const subCategory = searchParams.get('subCategory');
  const detailedCategory = searchParams.get('detailedCategory');
  const bestseller = searchParams.get('bestseller');
  const trending = searchParams.get('trending');
  const newArrival = searchParams.get('newArrival');
  const onPromo = searchParams.get('onPromo');

  // Apply filters
  const applyFilter = () => {
    let productsCopy = products.slice();

    // Search filter
    if (showSearch && search) {
      productsCopy = productsCopy.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Category filters from URL
    if (category) {
      productsCopy = productsCopy.filter(item => 
        item.category?.toLowerCase() === category.toLowerCase()
      );
    }

    if (subCategory) {
      productsCopy = productsCopy.filter(item =>
        item.subCategory?.toLowerCase() === subCategory.toLowerCase()
      );
    }

    if (detailedCategory) {
      productsCopy = productsCopy.filter(item =>
        item.detailedCategory?.toLowerCase() === detailedCategory.toLowerCase()
      );
    }

    // Special filters
    if (bestseller === 'true') {
      productsCopy = productsCopy.filter(item => item.bestseller === true);
    }

    if (trending === 'true') {
      productsCopy = productsCopy.filter(item => item.isTrending === true);
    }

    if (newArrival === 'true') {
      productsCopy = productsCopy.filter(item => item.isNewArrival === true);
    }

    if (onPromo === 'true') {
      productsCopy = productsCopy.filter(item => item.onPromo === true);
    }

    setFilterProducts(productsCopy);
  };

  // Apply sorting
  const sortProduct = () => {
    let fpCopy = filterProducts.slice();

    switch (sortType) {
      case 'low-high':
        setFilterProducts(fpCopy.sort((a, b) => (a.price - b.price)));
        break;
      case 'high-low':
        setFilterProducts(fpCopy.sort((a, b) => (b.price - a.price)));
        break;
      default:
        applyFilter();
        break;
    }
  };

  useEffect(() => {
    applyFilter();
  }, [category, subCategory, detailedCategory, bestseller, trending, newArrival, onPromo, search, showSearch, products]);

  useEffect(() => {
    sortProduct();
  }, [sortType]);

  return (
    <div className="collection-container">
      {/* Header */}
      <div className="collection-header">
        <Title text1={'ALL'} text2={'COLLECTIONS'} />
        <p className="collection-description">
          Showing {filterProducts.length} products
        </p>
      </div>

      {/* Controls */}
      <div className="collection-controls">
        <select 
          onChange={(e) => setSortType(e.target.value)} 
          className="sort-select"
          value={sortType}
        >
          <option value="relevant">Sort by: Relevant</option>
          <option value="low-high">Sort by: Low to High</option>
          <option value="high-low">Sort by: High to Low</option>
        </select>
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
          <div className="no-products-icon">📦</div>
          <h3>No products found</h3>
          <p>Try adjusting your filters or browse all categories</p>
        </div>
      )}
    </div>
  );
};

export default Collection;
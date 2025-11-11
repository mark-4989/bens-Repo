import React, { useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from '../components/Title';
import ProductItem from '../components/ProductItem';
import Sidebar from '../components/Sidebar';

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
    <div className="home-container">
      <Sidebar />
      
      <div className="home-content">
        <div style={{ 
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15)',
          minHeight: '80vh'
        }}>
          {/* Title & Sort */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '30px',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <Title text1={'ALL'} text2={'COLLECTIONS'} />
            
            {/* Sort */}
            <select 
              onChange={(e) => setSortType(e.target.value)} 
              style={{
                padding: '10px 20px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#2d3748',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="relevant">Sort by: Relevant</option>
              <option value="low-high">Sort by: Low to High</option>
              <option value="high-low">Sort by: High to Low</option>
            </select>
          </div>

          {/* Products Count */}
          <p style={{ 
            marginBottom: '20px', 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#2d3748'
          }}>
            Showing {filterProducts.length} products
          </p>

          {/* Products Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '24px',
            marginTop: '20px'
          }}>
            {filterProducts.map((item, index) => (
              <ProductItem
                key={index}
                id={item._id}
                image={item.image}
                name={item.name}
                price={item.price}
              />
            ))}
          </div>

          {/* No Products Message */}
          {filterProducts.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#4a5568'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>📦</div>
              <h3 style={{ fontSize: '24px', marginBottom: '10px', color: '#2d3748' }}>
                No products found
              </h3>
              <p>Try adjusting your filters or browse all categories</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Collection;
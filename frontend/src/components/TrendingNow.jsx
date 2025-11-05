import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import ProductItem from './ProductItem';
import './TrendingNow.css';

const TrendingNow = () => {
  const { products, loading } = useContext(ShopContext);
  const [trendingProducts, setTrendingProducts] = useState([]);

  useEffect(() => {
    if (products && products.length > 0) {
      // Filter products where isTrending is true
      const trending = products.filter(item => item.isTrending === true);
      setTrendingProducts(trending.slice(0, 10)); // Show max 10 trending products
      console.log("🔥 Trending products:", trending.length);
    }
  }, [products]);

  if (loading) {
    return (
      <div className="trending-loading">
        <p>Loading trending products...</p>
      </div>
    );
  }

  // Only show section if there are trending products
  if (trendingProducts.length === 0) {
    return null;
  }

  return (
    <div className="trending-section">
      <div className="trending-header">
        <Title text1={'TRENDING'} text2={'NOW'} />
        <p className="trending-description">
          🔥 Hot products that everyone is buying right now!
        </p>
      </div>

      {/* Render Products Grid */}
      <div className="trending-grid">
        {trendingProducts.map((item, index) => (
          <ProductItem
            key={index}
            id={item._id}
            image={item.image}
            name={item.name}
            price={item.price}
          />
        ))}
      </div>
    </div>
  );
};

export default TrendingNow;
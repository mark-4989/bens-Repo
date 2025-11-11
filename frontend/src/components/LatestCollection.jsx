import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import ProductItem from './ProductItem';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import './Latestcollection.css';

const LatestCollection = () => {
  const { products, loading } = useContext(ShopContext);
  const [latestProducts, setLatestProducts] = useState([]);

  useEffect(() => {
    if (products && products.length > 0) {
      const latest = products.filter(item => item.isLatestCollection === true);
      
      if (latest.length === 0) {
        setLatestProducts(products.slice(0, 10));
      } else {
        setLatestProducts(latest.slice(0, 10));
      }
    }
  }, [products]);

  if (loading) {
    return (
      <div className="latest-loading">
        <p>Loading latest collection...</p>
      </div>
    );
  }

  if (latestProducts.length === 0) {
    return (
      <div className="latest-empty">
        <p>No products available yet.</p>
      </div>
    );
  }

  return (
    <div className="latest-collection-section">
      <div className="latest-header">
        <Title text1={'LATEST'} text2={'COLLECTION'} icon={NewReleasesIcon} />
        <p className="latest-description">
          🆕 Discover our newest and most exciting products!
        </p>
      </div>

      <div className="latest-grid">
        {latestProducts.map((item, index) => (
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

export default LatestCollection;
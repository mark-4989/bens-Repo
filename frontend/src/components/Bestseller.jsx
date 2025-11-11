import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import ProductItem from './ProductItem';
import StarIcon from '@mui/icons-material/Star';
import './BestSeller.css';

const Bestseller = () => {
  const { products, loading } = useContext(ShopContext);
  const [bestsellerProducts, setBestsellerProducts] = useState([]);

  useEffect(() => {
    if (products && products.length > 0) {
      const bestsellers = products.filter(item => item.bestseller === true);
      
      if (bestsellers.length === 0) {
        setBestsellerProducts(products.slice(0, 5));
      } else {
        setBestsellerProducts(bestsellers.slice(0, 5));
      }
    }
  }, [products]);

  if (loading) {
    return (
      <div className="bestseller-loading">
        <p>Loading bestsellers...</p>
      </div>
    );
  }

  if (bestsellerProducts.length === 0) {
    return null;
  }

  return (
    <div className="bestseller-section">
      <div className="bestseller-header">
        <Title text1={'BEST'} text2={'SELLERS'} icon={StarIcon} />
        <p className="bestseller-description">
          ⭐ Our most popular products loved by customers!
        </p>
      </div>

      <div className="bestseller-grid">
        {bestsellerProducts.map((item, index) => (
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

export default Bestseller;
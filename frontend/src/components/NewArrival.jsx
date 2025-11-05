import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import ProductItem from './ProductItem';
import './NewArrival.css';

const NewArrivals = () => {
  const { products, loading } = useContext(ShopContext);
  const [newArrivalProducts, setNewArrivalProducts] = useState([]);

  useEffect(() => {
    if (products && products.length > 0) {
      // Filter products where isNewArrival is true
      const newArrivals = products.filter(item => item.isNewArrival === true);
      setNewArrivalProducts(newArrivals.slice(0, 10)); // Show max 10 new arrivals
      console.log("✨ New arrival products:", newArrivals.length);
    }
  }, [products]);

  if (loading) {
    return (
      <div className="new-arrivals-loading">
        <p>Loading new arrivals...</p>
      </div>
    );
  }

  // Only show section if there are new arrivals
  if (newArrivalProducts.length === 0) {
    return null;
  }

  return (
    <div className="new-arrivals-section">
      <div className="new-arrivals-header">
        <Title text1={'NEW'} text2={'ARRIVALS'} />
        <p className="new-arrivals-description">
          ✨ Fresh products just added to our store!
        </p>
      </div>

      {/* Render Products Grid */}
      <div className="new-arrivals-grid">
        {newArrivalProducts.map((item, index) => (
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

export default NewArrivals;
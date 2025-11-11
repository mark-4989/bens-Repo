import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import ProductItem from './ProductItem';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import './NewArrival.css';

const NewArrivals = () => {
  const { products, loading } = useContext(ShopContext);
  const [newArrivalProducts, setNewArrivalProducts] = useState([]);

  useEffect(() => {
    if (products && products.length > 0) {
      const newArrivals = products.filter(item => item.isNewArrival === true);
      setNewArrivalProducts(newArrivals.slice(0, 10));
    }
  }, [products]);

  if (loading) {
    return (
      <div className="new-arrivals-loading">
        <p>Loading new arrivals...</p>
      </div>
    );
  }

  if (newArrivalProducts.length === 0) {
    return null;
  }

  return (
    <div className="new-arrivals-section">
      <div className="new-arrivals-header">
        <Title text1={'NEW'} text2={'ARRIVALS'} icon={CheckroomIcon} />
        <p className="new-arrivals-description">
          ✨ Fresh products just added to our store!
        </p>
      </div>

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
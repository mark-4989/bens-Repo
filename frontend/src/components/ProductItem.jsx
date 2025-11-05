import React, { useContext } from "react";
import { ShopContext } from "../context/ShopContext";
import { Link } from "react-router-dom";
import "./ProductItem.css";
const ProductItem = ({ id, image, name, price }) => {
  const { currency } = useContext(ShopContext);

  return (
    <Link to={`/product/${id}`}>
      <div className="card-container">
        <div className="image-container">
          <img src={image[0]} alt={name} />
        </div>
        <div className="details-container">
          <p className="product-name">{name}</p>
          <p className="product-price">
            {currency}
            {price}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default ProductItem;

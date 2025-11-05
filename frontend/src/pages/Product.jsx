import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import { assets } from "../assets/frontend_assets/assets";
import "./Products.css";
import RelatedProducts from "../components/RelatedProducts";

const Product = () => {
  const { productId } = useParams();
  const { products, currency, addToCart } = useContext(ShopContext);
  const [productData, setProductdata] = useState(false);
  const [image, setImage] = useState("");
  const [size, setSize] = useState("");

  const fetchProductData = async () => {
    products.map((item) => {
      if (item._id === productId) {
        setProductdata(item);
        setImage(item.image[0]);
        return null;
      }
    });
  };

  useEffect(() => {
    fetchProductData();
  }, [productId, products]);

  return productData ? (
    <div className="main-product-container">
      {/* product data */}
      <div className="product-container">
        {/* product images */}
        <div className="image-box-holder">
          <div className="image-box">
            {productData.image.map((item, index) => (
              <img
                onClick={() => setImage(item)}
                src={item}
                key={index}
                alt=""
              />
            ))}
          </div>
          <div className="image-box2">
            <img id="detail-img" src={image} alt="" />
          </div>
        </div>
        {/* --------product info------------- */}
        <div className="product-info-container">
          <h1 className="product-header">{productData.name}</h1>
          <div className="star-rating">
            <img className="star-rating-img" src={assets.star_icon} alt="" />
            <img className="star-rating-img" src={assets.star_icon} alt="" />
            <img className="star-rating-img" src={assets.star_icon} alt="" />
            <img className="star-rating-img" src={assets.star_icon} alt="" />
            <img
              className="star-rating-img"
              src={assets.star_dull_icon}
              alt=""
            />
            <p className="rating-p">(122)</p>
          </div>
          <p className="product-price">
            {currency}
            {productData.price}
          </p>
          <p className="product-description">{productData.description}</p>
          <div className="product-size-section">
            <p>Select size</p>
            <div className="size-select">
              {productData.sizes.map((item, index) => (
                <button onClick={() => setSize(item)} key={index}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <button onClick={()=>addToCart(productData._id,size)} id="add-to-cart-btn">ADD TO CART</button>
          <hr />
          <div className="terms">
            <p>100% original product</p>
            <p>Cash on delivery is available on this product</p>
            <p>Easy return and exchange policy within 7 days</p>
          </div>
        </div>
      </div>

      {/* description and review section */}

      <div className="descrption-review-section">
        <div className="header-box">
          <b id="starter">Descrption</b>
          <p id="fin">Reviews(122)</p>
        </div>
        <div className="description-widget">
          <p>{productData.description}</p>
          <p>
            An e-commerce website is an online platform that facilitates the
            buying and selling of products or services over the internet. It
            serves as a virtual marketplace where businesses and individuals can
            showcase their products, interact with customers, and conduct
            transactions without the need for a physical presence. E-commerce
            websites have gained immense popularity due to their convenience,
            accessibility, and the global reach they offer. Lorem ipsum dolor
            sit amet consectetur adipisicing elit. Ut veniam, error officia
            blanditiis perferendis, libero et modi, ad laudantium dolores
            doloribus repellat odit cum quidem sunt. Asperiores minima sed
            fugiat!
          </p>
        </div>
      </div>
      {/* ----------display related products ---------*/}
      <RelatedProducts category={productData.category} subCategory={productData.subCategory}/>
    </div>
  ) : (
    <div className="pre-load">Loading...</div>
  );
};

export default Product;

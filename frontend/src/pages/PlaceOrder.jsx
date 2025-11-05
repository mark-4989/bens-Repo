import React, { useContext, useState } from "react";
import { useUser, useAuth, RedirectToSignIn } from "@clerk/clerk-react";
import Title from "../components/Title";
import "./PlaceOrder.css";
import CartTotal from "../components/CartTotal";
import { assets } from "../assets/frontend_assets/assets";
import { ShopContext } from "../context/ShopContext";
import { backendUrl } from "../config";
import LocationPicker from "../components/LocationPicker";

const PlaceOrder = () => {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const {
    cartItems,
    getCartAmount,
    delivery_fee,
    products,
    navigate,
    currency,
  } = useContext(ShopContext);

  const [method, setMethod] = useState("cod");
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Delivery information state
  const [deliveryInfo, setDeliveryInfo] = useState({
    firstName: "",
    lastName: "",
    email: user?.primaryEmailAddress?.emailAddress || "",
    street: "",
    city: "",
    state: "",
    zipcode: "",
    country: "",
    phone: "",
  });

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDeliveryInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Validate delivery info
  const validateDeliveryInfo = () => {
    const required = [
      "firstName",
      "lastName",
      "email",
      "street",
      "city",
      "phone",
    ];
    for (let field of required) {
      if (!deliveryInfo[field] || deliveryInfo[field].trim() === "") {
        alert(
          `Please fill in ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`
        );
        return false;
      }
    }

    // Validate location is selected
    if (!selectedLocation) {
      alert("📍 Please select your delivery location on the map");
      return false;
    }

    return true;
  };

  // Submit handler - FIXED to handle undefined products safely
  const handlePlaceOrder = async () => {
    try {
      // Validate delivery info
      if (!validateDeliveryInfo()) {
        return;
      }

      // Check if cart has items
      if (!cartItems || Object.keys(cartItems).length === 0) {
        alert("Your cart is empty!");
        return;
      }

      // Check if products are loaded
      if (!products || products.length === 0) {
        alert("⚠️ Products are still loading. Please wait a moment.");
        return;
      }

      setLoading(true);
      const token = await getToken({ template: "MilikiAPI" });

      if (!token) {
        alert("⚠️ Could not get authentication token. Please sign in again.");
        setLoading(false);
        return;
      }

      // Format cart items to match your cart structure - SAFELY HANDLE UNDEFINED
      const formattedItems = [];

      for (const itemId in cartItems) {
        for (const size in cartItems[itemId]) {
          if (cartItems[itemId][size] > 0) {
            // Find product data from products array
            const productData = products.find(
              (product) => product._id === itemId
            );

            if (productData && productData.price !== undefined) {
              formattedItems.push({
                productId: itemId,
                name: productData.name || "Product",
                price: productData.price || 0,
                quantity: cartItems[itemId][size],
                image: productData.image?.[0] || "/placeholder.png",
                size: size,
              });
            } else {
              console.warn(`⚠️ Product ${itemId} not found or has no price`);
            }
          }
        }
      }

      if (formattedItems.length === 0) {
        alert("⚠️ Could not process cart items. Please try again.");
        setLoading(false);
        return;
      }

      console.log("📦 Formatted items:", formattedItems);

      // Calculate total amount
      const cartAmount = getCartAmount();
      const totalAmount = cartAmount + delivery_fee;

      console.log("💰 Cart Amount:", cartAmount);
      console.log("🚚 Delivery Fee:", delivery_fee);
      console.log("💵 Total Amount:", totalAmount);
      console.log("📍 Location:", selectedLocation);

      if (!totalAmount || totalAmount <= 0) {
        alert("⚠️ Cart total is invalid. Please add items to your cart.");
        setLoading(false);
        return;
      }

      // Include location data in order
      const orderData = {
        products: formattedItems,
        totalAmount: totalAmount,
        paymentMethod: method,
        deliveryInfo: {
          ...deliveryInfo,
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          locationType: selectedLocation.type
        },
      };

      console.log("📤 Sending order data:", orderData);

      const res = await fetch(`${backendUrl}/api/orders/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const data = await res.json();
      console.log("📦 Order response:", data);

      if (data.success) {
        alert("✅ Order placed successfully!");
        navigate("/Orders1");
      } else {
        alert(
          "❌ Order placement failed: " + (data.message || "Unknown error")
        );
        console.error("❌ Server error details:", data);
      }
    } catch (error) {
      console.error("❌ Order placement error:", error);
      alert("⚠️ Something went wrong while placing your order.");
    } finally {
      setLoading(false);
    }
  };

  // Check if products are loaded
  const productsLoaded = products && products.length > 0;

  return (
    <div className="place-holder-container">
      {/* LEFT SIDE – Delivery info */}
      <div className="delivery-info">
        <div className="title-box-delivery">
          <Title text1={"DELIVERY"} text2={"INFORMATION"} />
        </div>
        <div className="row-deliver">
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={deliveryInfo.firstName}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={deliveryInfo.lastName}
            onChange={handleInputChange}
            required
          />
        </div>
        <input
          id="long-input"
          type="email"
          name="email"
          placeholder="E-mail"
          value={deliveryInfo.email}
          onChange={handleInputChange}
          required
        />
        <input
          id="long-input"
          type="text"
          name="street"
          placeholder="Street"
          value={deliveryInfo.street}
          onChange={handleInputChange}
          required
        />
        <div className="row-deliver">
          <input
            type="text"
            name="city"
            placeholder="City"
            value={deliveryInfo.city}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="state"
            placeholder="State"
            value={deliveryInfo.state}
            onChange={handleInputChange}
          />
        </div>
        <div className="row-deliver">
          <input
            type="text"
            name="zipcode"
            placeholder="Zipcode"
            value={deliveryInfo.zipcode}
            onChange={handleInputChange}
          />
          <input
            type="text"
            name="country"
            placeholder="Country"
            value={deliveryInfo.country}
            onChange={handleInputChange}
          />
        </div>
        <input
          id="long-input"
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={deliveryInfo.phone}
          onChange={handleInputChange}
          required
        />

        {/* Location Picker Section */}
        <div style={{ marginTop: '24px', width: '32vw' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            marginBottom: '12px',
            color: '#212529'
          }}>
            📍 Delivery Location
          </h3>
          <button 
            type="button"
            onClick={() => setShowLocationPicker(true)}
            style={{
              width: '100%',
              padding: '14px 20px',
              backgroundColor: selectedLocation ? '#4CAF50' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = selectedLocation ? '#45a049' : '#5568d3'}
            onMouseOut={(e) => e.target.style.backgroundColor = selectedLocation ? '#4CAF50' : '#667eea'}
          >
            {selectedLocation ? '✓ Location Selected - Change?' : '📍 Select Delivery Location'}
          </button>
          
          {selectedLocation && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#e8f5e9',
              border: '2px solid #4CAF50',
              borderRadius: '8px'
            }}>
              <p style={{
                margin: '0 0 6px 0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2e7d32'
              }}>
                📍 {selectedLocation.address || 'Location selected'}
              </p>
              <small style={{
                color: '#666',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                Lat: {selectedLocation.lat.toFixed(6)}, Lng: {selectedLocation.lng.toFixed(6)}
              </small>
              <div style={{
                marginTop: '6px',
                padding: '4px 8px',
                backgroundColor: '#c8e6c9',
                borderRadius: '4px',
                display: 'inline-block'
              }}>
                <small style={{ 
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#1b5e20',
                  textTransform: 'uppercase'
                }}>
                  {selectedLocation.type === 'current' && '📱 Current Location'}
                  {selectedLocation.type === 'pin' && '📌 Pin Location'}
                  {selectedLocation.type === 'address' && '🔍 Searched Address'}
                </small>
              </div>
            </div>
          )}

          {!selectedLocation && (
            <p style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#dc3545',
              fontStyle: 'italic'
            }}>
              ⚠️ Please select your delivery location before placing order
            </p>
          )}
        </div>
      </div>

      {/* RIGHT SIDE – Cart summary and payment */}
      <div className="rightside-cart-total">
        <div className="cart-total-container-placeorder">
          <CartTotal />
        </div>

        {/* PAYMENT METHODS */}
        <div className="payment-section">
          <Title text1={"PAYMENT"} text2={"METHOD"} />
          <div className="payment-container">
            <div
              onClick={() => setMethod("stripe")}
              className={`payment-box ${method === "stripe" ? "selected" : ""}`}
            >
              <img src={assets.stripe_logo} alt="Stripe" />
            </div>

            <div
              onClick={() => setMethod("m-pesa")}
              className={`payment-box ${method === "m-pesa" ? "selected" : ""}`}
            >
              <img src={assets.razorpay_logo} alt="M-Pesa" />
            </div>

            <div
              onClick={() => setMethod("cod")}
              className={`payment-box ${method === "cod" ? "selected" : ""}`}
            >
              <p>CASH ON DELIVERY</p>
            </div>
          </div>

          {/* Show warning if products not loaded */}
          {!productsLoaded && (
            <div style={{
              marginTop: '12px',
              padding: '10px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <small style={{ color: '#856404' }}>⏳ Loading products...</small>
            </div>
          )}

          <button
            id="place-order-btn"
            onClick={handlePlaceOrder}
            disabled={loading || !selectedLocation || !productsLoaded}
            style={{
              opacity: (!selectedLocation || loading || !productsLoaded) ? 0.6 : 1,
              cursor: (!selectedLocation || loading || !productsLoaded) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? "Processing..." : !productsLoaded ? "Loading..." : "PLACE ORDER"}
          </button>
        </div>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          onLocationSelect={(location) => {
            setSelectedLocation(location);
            setShowLocationPicker(false);
            console.log("📍 Location selected:", location);
          }}
          onClose={() => setShowLocationPicker(false)}
          initialLocation={selectedLocation}
        />
      )}
    </div>
  );
};

export default PlaceOrder;
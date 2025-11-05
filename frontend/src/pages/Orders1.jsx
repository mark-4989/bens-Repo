import React, { useEffect, useState } from "react";
import { useAuth, useUser, RedirectToSignIn } from "@clerk/clerk-react";
import { toast } from 'react-toastify';
import Title from "../components/Title";
import "./Orders1.css";
import { backendUrl } from "../config";
import LiveTracking from "../components/LiveTracking";


const Orders1 = () => {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [payingOrderId, setPayingOrderId] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);



  // Fetch user's orders
  const fetchOrders = async () => {
    if (!isSignedIn) return;
    
    try {
      setLoading(true);
      const token = await getToken({ template: "MilikiAPI" });

      const res = await fetch(`${backendUrl}/api/orders/user`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      } else {
        throw new Error(data.message || "Failed to fetch orders");
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load your orders. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [isSignedIn]);

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  if (loading) {
    return (
      <div className="orders-page-container">
        <Title text1="MY" text2="ORDERS" />
        <p>Loading your orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-page-container">
        <Title text1="MY" text2="ORDERS" />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="orders-page-container">
        <Title text1="MY" text2="ORDERS" />
        <p>You have no orders yet.</p>
      </div>
    );
  }

  // Helper for order progress status
  const getProgressClass = (status) => {
    switch (status) {
      case "Order Received":
        return 1;
      case "Cargo Packed":
        return 2;
      case "Cargo on Route":
        return 3;
      case "Delivered":
        return 4;
      default:
        return 0;
    }
  };

  // Open tracking modal
  const handleTrackOrder = (orderId) => {
    setTrackingOrderId(orderId);
  };

  // Close tracking modal
  const closeTrackingModal = () => {
    setTrackingOrderId(null);
  };

  // Cancel order
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      setCancellingOrderId(orderId);
      const token = await getToken({ template: "MilikiAPI" });

      const response = await fetch(`${backendUrl}/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Order cancelled successfully');
        fetchOrders();
      } else {
        toast.error(data.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel order');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Handle M-Pesa Payment
  const handlePayWithMpesa = async (order) => {
    const phoneNumber = prompt(
      'Enter your M-Pesa phone number (e.g., 0712345678):'
    );

    if (!phoneNumber) {
      return;
    }

    const phoneRegex = /^(0|254|\+254)?[17]\d{8}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      toast.error('Invalid phone number format. Please use 07XXXXXXXX or 01XXXXXXXX');
      return;
    }

    try {
      setPayingOrderId(order._id);
      const token = await getToken({ template: "MilikiAPI" });

      const response = await fetch(`${backendUrl}/api/mpesa/stk-push`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order._id,
          phoneNumber: phoneNumber
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('📱 Payment request sent to your phone! Please enter your M-Pesa PIN.');
        
        setTimeout(() => {
          fetchOrders();
        }, 10000);
      } else {
        toast.error(data.message || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
    } finally {
      setPayingOrderId(null);
    }
  };

  return (
    <div className="orders-page-container">
      <div className="header-text-holder">
        <Title text1="MY" text2="ORDERS" />
      </div>

      {orders.map((order, index) => {
        const progress = getProgressClass(order.status);
        const isCancelled = order.status === "Cancelled";

        return (
          <div key={order._id || index} className={`order-box-container ${isCancelled ? 'cancelled-order' : ''}`}>
            <div className="order-box">
              {/* Order Header with Gradient */}
              <div className="order-header">
                <div className="order-id">Order #{order._id.slice(-8).toUpperCase()}</div>
                <div className={`payment-status-badge ${order.paymentStatus?.toLowerCase()}`}>
                  {order.paymentStatus || 'Pending'}
                </div>
              </div>

              <div className="order-content">
                {/* Order Details */}
                <div className="order-details">
                  <img
                    src={order.items?.[0]?.image || "/placeholder.png"}
                    alt={order.items?.[0]?.name || "Product"}
                  />
                  <div className="order-details-mini">
                    <p id="Order-name">{order.items?.[0]?.name}</p>
                    {order.items?.length > 1 && (
                      <p className="more-items">+{order.items.length - 1} more item(s)</p>
                    )}
                    <p><strong>💰 Total:</strong> KES {order.totalAmount?.toLocaleString()}</p>
                    <p><strong>📦 Status:</strong> <b className={isCancelled ? 'cancelled-status' : ''}>{order.status}</b></p>
                    <p>
                      <strong>📅 Date:</strong>{" "}
                      <span className="order-date">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </p>
                    <p className="payment-method-text">
                      💳 Payment: {order.paymentMethod?.toUpperCase() || 'COD'}
                    </p>
                  </div>
                </div>

                {/* Status Tracker */}
                {!isCancelled && (
                  <div className="status-tracker">
                    <div className={`step ${progress >= 1 ? "done" : ""}`}>
                      <span className="step-icon">🛒</span>
                      <span id="status-statement">Order Received</span>
                    </div>
                    <div className={`step ${progress >= 2 ? "done" : ""}`}>
                      <span className="step-icon">📦</span>
                      <span>Cargo Packed</span>
                    </div>
                    <div className={`step ${progress >= 3 ? "done" : ""}`}>
                      <span className="step-icon">🚚</span>
                      <span>On Route</span>
                    </div>
                    <div className={`step ${progress >= 4 ? "done" : ""}`}>
                      <span className="step-icon">✅</span>
                      <span>Delivered</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="order-actions">
                  {/* Track Order */}
                  {order.status === "Cargo on Route" && !isCancelled && (
                    <button
                      className="track-order-btn modern-btn"
                      onClick={() => handleTrackOrder(order._id)}
                    >
                      <span>🚀</span>
                      <span>TRACK ORDER</span>
                    </button>
                  )}

                  {/* Pay with M-Pesa */}
                  {order.paymentStatus === 'Pending' && order.paymentMethod === 'm-pesa' && !isCancelled && (
                    <button
                      className="pay-mpesa-btn modern-btn"
                      onClick={() => handlePayWithMpesa(order)}
                      disabled={payingOrderId === order._id}
                    >
                      <span>💳</span>
                      <span>{payingOrderId === order._id ? 'Processing...' : 'Pay with M-Pesa'}</span>
                    </button>
                  )}

                  {/* Cancel Order */}
                  {order.cancellable && !isCancelled && (
                    <button
                      className="cancel-order-btn modern-btn"
                      onClick={() => handleCancelOrder(order._id)}
                      disabled={cancellingOrderId === order._id}
                    >
                      <span>❌</span>
                      <span>{cancellingOrderId === order._id ? 'Cancelling...' : 'Cancel Order'}</span>
                    </button>
                  )}
                </div>

                {/* Receipt */}
                {order.paymentStatus === 'Paid' && order.mpesaReceiptNumber && (
                  <div className="receipt-info">
                    <p className="receipt-number">
                      <span>📄</span>
                      <span>Receipt: {order.mpesaReceiptNumber}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Tracking Modal */}
      {trackingOrderId && (
  <LiveTracking
    orderId={trackingOrderId}
    onClose={closeTrackingModal}
    getToken={getToken}  // Pass getToken as prop
  />
)}
    </div>
  );
};

// Enhanced Tracking Modal Component
const TrackingModal = ({ orderId, onClose }) => {
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        if (prev >= 100) return 0;
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="tracking-modal-overlay" onClick={onClose}>
      <div className="tracking-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={onClose}>×</button>
        
        <h2>🚚 Track Your Order</h2>
        <p className="order-id-track">Order #{orderId.slice(-8).toUpperCase()}</p>

        <div className="tracking-map">
          <div className="map-container">
            <div className="route-line"></div>
            
            <div className="location-point warehouse">
              <div className="point-icon">🏭</div>
              <div className="point-label">Warehouse</div>
            </div>

            <div 
              className="delivery-truck" 
              style={{ left: `${animationProgress}%` }}
            >
              🚚
            </div>

            <div className="location-point destination">
              <div className="point-icon">🏠</div>
              <div className="point-label">Your Location</div>
            </div>
          </div>

          <div className="tracking-info">
            <div className="info-item">
              <span className="info-icon">📍</span>
              <span>Current Location: En route to your address</span>
            </div>
            <div className="info-item">
              <span className="info-icon">⏱️</span>
              <span>Estimated Delivery: 2-3 hours</span>
            </div>
            <div className="info-item">
              <span className="info-icon">👤</span>
              <span>Driver: John Doe | 📞 +254 700 000 000</span>
            </div>
          </div>
        </div>

        <div className="tracking-note">
          <p>💡 <strong>Note:</strong> This is a simulated tracking view. Real-time GPS tracking coming soon!</p>
        </div>
      </div>
    </div>
  );
};

export default Orders1;
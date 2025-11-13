// Admin/src/pages/AdminOrders.jsx
// Enhanced with WhatsApp dispatch, location viewing, and driver tracking

import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/clerk-react";
import LiveTracking from "../components/LiveTracking"; // Import LiveTracking
import "./AdminOrders.css";

const AdminOrders = () => {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [expandedDates, setExpandedDates] = useState({});
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null); // For admin tracking
  const [driverInfo, setDriverInfo] = useState({
    driverId: '',
    driverName: '',
    driverPhone: '',
    vehicle: '',
    whatsappGroup: '+254712345678' // Default WhatsApp group number
  });
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://bens-repo-99lb.onrender.com";
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL || "https://clientside-teal.vercel.app";

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await getToken({ template: "MilikiAPI" });
      
      if (!token) {
        toast.error("Authentication required. Please login again.");
        return;
      }

      const response = await axios.get(`${backendUrl}/api/orders/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setOrders(response.data.orders || []);
        const today = new Date().toLocaleDateString();
        setExpandedDates({ [today]: true });
      } else {
        toast.error("Failed to load orders");
      }
    } catch (error) {
      console.error("❌ Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = await getToken({ template: "MilikiAPI" });
      
      const response = await axios.put(
        `${backendUrl}/api/orders/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Order status updated");
        fetchOrders();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update order status");
    }
  };

  // Delete cancelled order
  const deleteOrder = async (orderId) => {
    if (!window.confirm("⚠️ Are you sure you want to permanently delete this cancelled order?")) {
      return;
    }

    try {
      setDeletingOrder(orderId);
      const token = await getToken({ template: "MilikiAPI" });
      
      const response = await axios.delete(
        `${backendUrl}/api/orders/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Order deleted successfully");
        fetchOrders();
      } else {
        toast.error("Failed to delete order");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Failed to delete order");
    } finally {
      setDeletingOrder(null);
    }
  };

  // Assign driver and dispatch to WhatsApp
  const assignAndDispatchDriver = async () => {
    if (!driverInfo.driverId || !driverInfo.driverName) {
      toast.error("Please fill in Driver ID and Name");
      return;
    }

    try {
      const token = await getToken({ template: "MilikiAPI" });
      
      // Step 1: Assign driver to order
      const assignResponse = await axios.post(
        `${backendUrl}/api/tracking/assign`,
        {
          orderId: selectedOrder._id,
          driverId: driverInfo.driverId,
          driverName: driverInfo.driverName,
          driverPhone: driverInfo.driverPhone,
          vehicle: driverInfo.vehicle
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!assignResponse.data.success) {
        toast.error("Failed to assign driver");
        return;
      }

      // Step 2: Create WhatsApp dispatch message
      const orderDetails = `
🚚 *NEW DELIVERY ASSIGNMENT*

📦 *Order #${selectedOrder._id.slice(-8).toUpperCase()}*
💰 Total: KSH ${selectedOrder.totalAmount?.toLocaleString()}
🛍️ Items: ${selectedOrder.items?.length || 0} item(s)

📍 *Delivery To:*
👤 ${selectedOrder.customerName || 'Customer'}
📞 ${selectedOrder.phone || 'N/A'}
📍 ${selectedOrder.address?.street || ''}, ${selectedOrder.address?.city || ''}
${selectedOrder.deliveryInfo?.latitude ? `🗺️ GPS: https://maps.google.com/?q=${selectedOrder.deliveryInfo.latitude},${selectedOrder.deliveryInfo.longitude}` : ''}

👨‍✈️ *Driver Assignment:*
🆔 ID: ${driverInfo.driverId}
👤 Name: ${driverInfo.driverName}
📱 Phone: ${driverInfo.driverPhone}
🚗 Vehicle: ${driverInfo.vehicle}

🔗 *DRIVER APP:*
${frontendUrl}/driver/tracking

📝 *Instructions:*
1️⃣ Open Driver App link above
2️⃣ Enter Driver ID: *${driverInfo.driverId}*
3️⃣ Enter Order ID: *${selectedOrder._id}*
4️⃣ Click "Start Tracking"
5️⃣ Keep GPS enabled during delivery

⏰ Dispatched: ${new Date().toLocaleString()}
      `.trim();

      // Step 3: Open WhatsApp with pre-filled message
      const whatsappMessage = encodeURIComponent(orderDetails);
      const whatsappLink = `https://wa.me/${driverInfo.whatsappGroup.replace(/\D/g, '')}?text=${whatsappMessage}`;
      
      // Open WhatsApp in new tab
      window.open(whatsappLink, '_blank');

      toast.success("✅ Driver assigned! WhatsApp opened with dispatch message");
      
      // Close modal and refresh
      setShowDriverModal(false);
      setDriverInfo({ 
        driverId: '', 
        driverName: '', 
        driverPhone: '', 
        vehicle: '',
        whatsappGroup: '+254712345678'
      });
      fetchOrders();

    } catch (error) {
      console.error("Error assigning driver:", error);
      toast.error("Failed to assign driver");
    }
  };

  // View location on Google Maps
  const viewLocationOnMap = (order) => {
    const lat = order.deliveryInfo?.latitude || order.address?.latitude;
    const lng = order.deliveryInfo?.longitude || order.address?.longitude;
    
    if (lat && lng) {
      const url = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(url, '_blank');
    } else {
      toast.warning("No location data available for this order");
    }
  };

  // Open admin tracking view
  const handleTrackDriver = (orderId) => {
    setTrackingOrderId(orderId);
  };

  // Toggle date folder
  const toggleDateFolder = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Group orders by date
  const groupOrdersByDate = () => {
    const filtered = orders.filter(order => {
      const statusMatch = statusFilter === "All" || order.status === statusFilter;
      const paymentMatch = paymentFilter === "All" || order.paymentStatus === paymentFilter;
      return statusMatch && paymentMatch;
    });

    const grouped = {};
    filtered.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(order);
    });

    return Object.keys(grouped)
      .sort((a, b) => new Date(b) - new Date(a))
      .reduce((acc, date) => {
        acc[date] = grouped[date];
        return acc;
      }, {});
  };

  const groupedOrders = groupOrdersByDate();
  const statuses = ["All", ...new Set(orders.map(o => o.status))];
  const paymentStatuses = ["All", "Paid", "Pending", "Failed"];

  if (loading) {
    return (
      <div className="admin-orders-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-orders-container">
      <div className="admin-orders-header">
        <h2>📦 All Orders</h2>
        <button onClick={fetchOrders} className="refresh-btn">
          🔄 Refresh Orders
        </button>
      </div>

      <div className="admin-filters">
        <div className="filter-group">
          <label>Order Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Payment Status:</label>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            {paymentStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="orders-count">
          {Object.keys(groupedOrders).length} dates • {orders.length} total orders
        </div>
      </div>

      {Object.keys(groupedOrders).length === 0 ? (
        <div className="no-orders">
          <div className="no-orders-icon">🔭</div>
          <h3>No orders found</h3>
          <p>Orders matching your filters will appear here</p>
        </div>
      ) : (
        <div className="date-folders-container">
          {Object.entries(groupedOrders).map(([date, dateOrders]) => (
            <div key={date} className="date-folder">
              <div 
                className={`date-folder-header ${expandedDates[date] ? 'expanded' : ''}`}
                onClick={() => toggleDateFolder(date)}
              >
                <div className="date-folder-info">
                  <span className="folder-icon">{expandedDates[date] ? '📂' : '📁'}</span>
                  <h3 className="date-title">{date}</h3>
                  <span className="order-count-badge">{dateOrders.length} order{dateOrders.length !== 1 ? 's' : ''}</span>
                </div>
                <span className="expand-arrow">{expandedDates[date] ? '▼' : '▶'}</span>
              </div>

              {expandedDates[date] && (
                <div className="orders-grid">
                  {dateOrders.map((order) => {
                    const getStatusStep = (status) => {
                      const steps = ["Order Received", "Cargo Packed", "Cargo on Route", "Delivered"];
                      return steps.indexOf(status) + 1;
                    };

                    const currentStep = getStatusStep(order.status);
                    const isCancelled = order.status === "Cancelled";
                    const hasLocation = order.deliveryInfo?.latitude && order.deliveryInfo?.longitude;

                    return (
                      <div key={order._id} className={`order-card ${isCancelled ? 'cancelled' : ''}`}>
                        <div className="order-card-header">
                          <div className="order-id">
                            Order #{order._id.slice(-8).toUpperCase()}
                          </div>
                          <div className="order-time">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </div>
                        </div>

                        {/* Customer Info with Location */}
                        <div className="customer-info">
                          <h4>👤 {order.customerName || "Customer"}</h4>
                          <p>📧 {order.email || "No email"}</p>
                          <p>📞 {order.phone || "No phone"}</p>
                          <p>📍 {order.address?.city || "No address"}, {order.address?.country || ""}</p>
                          
                          {/* ✅ LOCATION BUTTON */}
                          {hasLocation && (
                            <button
                              onClick={() => viewLocationOnMap(order)}
                              style={{
                                marginTop: '8px',
                                padding: '8px 16px',
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                width: '100%'
                              }}
                            >
                              🗺️ View Delivery Location
                            </button>
                          )}
                          {!hasLocation && (
                            <p style={{
                              marginTop: '8px',
                              fontSize: '11px',
                              color: '#dc3545',
                              fontStyle: 'italic'
                            }}>
                              ⚠️ No location data
                            </p>
                          )}

                          {/* Driver Info */}
                          {order.driver && (
                            <div style={{
                              marginTop: '12px',
                              padding: '12px',
                              background: 'rgba(76, 175, 80, 0.1)',
                              borderRadius: '8px',
                              border: '2px solid rgba(76, 175, 80, 0.3)'
                            }}>
                              <p style={{ margin: '4px 0', fontSize: '12px', fontWeight: '700', color: '#2e7d32' }}>
                                🚗 Driver: {order.driver.name}
                              </p>
                              <p style={{ margin: '4px 0', fontSize: '11px', color: '#2e7d32' }}>
                                📞 {order.driver.phone}
                              </p>
                              <p style={{ margin: '4px 0', fontSize: '11px', color: '#2e7d32' }}>
                                🚙 {order.driver.vehicle}
                              </p>
                              
                              {/* ✅ TRACK DRIVER BUTTON */}
                              {order.status === 'Cargo on Route' && (
                                <button
                                  onClick={() => handleTrackDriver(order._id)}
                                  style={{
                                    marginTop: '8px',
                                    padding: '8px 16px',
                                    background: '#667eea',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    width: '100%'
                                  }}
                                >
                                  📡 Track Driver Live
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Order Items */}
                        <div className="order-items">
                          <h5>Items ({order.items?.length || 0}):</h5>
                          {order.items?.slice(0, 2).map((item, index) => (
                            <div key={index} className="order-item">
                              <img 
                                src={item.image || "/placeholder.png"} 
                                alt={item.name}
                                onError={(e) => e.target.src = '/placeholder.png'}
                              />
                              <div className="item-details">
                                <p className="item-name">{item.name}</p>
                                <p className="item-meta">
                                  Qty: {item.quantity} | Size: {item.size || "N/A"}
                                </p>
                                <p className="item-price">
                                  KSH {(item.price * item.quantity).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {order.items?.length > 2 && (
                            <p className="more-items-text">
                              +{order.items.length - 2} more items
                            </p>
                          )}
                        </div>

                        <div className="order-total">
                          <strong>💰 Total: KSH {order.totalAmount?.toLocaleString()}</strong>
                        </div>

                        <div className="payment-info">
                          <span className="payment-method">
                            💳 {order.paymentMethod?.toUpperCase() || "COD"}
                          </span>
                          <span className={`payment-badge ${order.paymentStatus?.toLowerCase()}`}>
                            {order.paymentStatus || "Pending"}
                          </span>
                        </div>

                        {!isCancelled && (
                          <div className="visual-stepper">
                            <div className={`step ${currentStep >= 1 ? "active" : ""}`}>
                              <div className="step-icon">🛒</div>
                              <div className="step-label">Received</div>
                            </div>
                            <div className={`step ${currentStep >= 2 ? "active" : ""}`}>
                              <div className="step-icon">📦</div>
                              <div className="step-label">Packed</div>
                            </div>
                            <div className={`step ${currentStep >= 3 ? "active" : ""}`}>
                              <div className="step-icon">🚚</div>
                              <div className="step-label">On Route</div>
                            </div>
                            <div className={`step ${currentStep >= 4 ? "active" : ""}`}>
                              <div className="step-icon">✅</div>
                              <div className="step-label">Delivered</div>
                            </div>
                          </div>
                        )}

                        {isCancelled && (
                          <div className="cancelled-badge">
                            ❌ ORDER CANCELLED
                          </div>
                        )}

                        <div className="status-actions">
                          {!isCancelled ? (
                            <>
                              <div className="status-section">
                                <label>Order Status:</label>
                                <select
                                  className="status-select"
                                  value={order.status}
                                  onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                                >
                                  <option value="Order Received">Order Received</option>
                                  <option value="Cargo Packed">Cargo Packed</option>
                                  <option value="Cargo on Route">Cargo on Route</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </div>
                              
                              {/* ✅ DISPATCH TO WHATSAPP BUTTON */}
                              {!order.driver && (
                                <button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowDriverModal(true);
                                  }}
                                  style={{
                                    width: '100%',
                                    marginTop: '12px',
                                    padding: '12px',
                                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                  }}
                                >
                                  <span>📱</span>
                                  <span>Dispatch to WhatsApp</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              className="delete-order-btn"
                              onClick={() => deleteOrder(order._id)}
                              disabled={deletingOrder === order._id}
                            >
                              {deletingOrder === order._id ? '🗑️ Deleting...' : '🗑️ Delete Order'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Driver Assignment & WhatsApp Dispatch Modal */}
      {showDriverModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowDriverModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0' }}>📱 Dispatch Order to WhatsApp</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#666' }}>
              Fill in driver details and dispatch to WhatsApp group
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Driver ID *
                </label>
                <input
                  type="text"
                  value={driverInfo.driverId}
                  onChange={(e) => setDriverInfo({...driverInfo, driverId: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="e.g., DRV001"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Driver Name *
                </label>
                <input
                  type="text"
                  value={driverInfo.driverName}
                  onChange={(e) => setDriverInfo({...driverInfo, driverName: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter driver name"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={driverInfo.driverPhone}
                  onChange={(e) => setDriverInfo({...driverInfo, driverPhone: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="+254700000000"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Vehicle Plate *
                </label>
                <input
                  type="text"
                  value={driverInfo.vehicle}
                  onChange={(e) => setDriverInfo({...driverInfo, vehicle: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="e.g., KBA 123X"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  WhatsApp Group Number *
                </label>
                <input
                  type="tel"
                  value={driverInfo.whatsappGroup}
                  onChange={(e) => setDriverInfo({...driverInfo, whatsappGroup: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="+254712345678"
                />
                <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                  Enter WhatsApp group or individual driver number
                </small>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={() => setShowDriverModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: '#f5f5f5',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={assignAndDispatchDriver}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '700'
                  }}
                >
                  📱 Dispatch to WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Admin Live Tracking Modal */}
      {trackingOrderId && (
        <LiveTracking
          orderId={trackingOrderId}
          onClose={() => setTrackingOrderId(null)}
          getToken={getToken}
        />
      )}
    </div>
  );
};

export default AdminOrders;
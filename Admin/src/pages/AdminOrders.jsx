import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/clerk-react";
import "./AdminOrders.css";

const AdminOrders = () => {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [expandedDates, setExpandedDates] = useState({});
  const [deletingOrder, setDeletingOrder] = useState(null);
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://foreverecommerce-2.onrender.com";

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
        // Auto-expand today's date
        const today = new Date().toLocaleDateString();
        setExpandedDates({ [today]: true });
      } else {
        toast.error("Failed to load orders");
      }
    } catch (error) {
      console.error("❌ Error fetching orders:", error);
      if (error.response?.status === 401) {
        toast.error("Unauthorized. Please login again.");
      } else {
        toast.error("Failed to fetch orders");
      }
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

    // Sort dates (newest first)
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

      {/* Filters */}
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
          <div className="no-orders-icon">📭</div>
          <h3>No orders found</h3>
          <p>Orders matching your filters will appear here</p>
        </div>
      ) : (
        <div className="date-folders-container">
          {Object.entries(groupedOrders).map(([date, dateOrders]) => (
            <div key={date} className="date-folder">
              {/* Date Folder Header */}
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

              {/* Orders in this date */}
              {expandedDates[date] && (
                <div className="orders-grid">
                  {dateOrders.map((order) => {
                    const getStatusStep = (status) => {
                      const steps = ["Order Received", "Cargo Packed", "Cargo on Route", "Delivered"];
                      return steps.indexOf(status) + 1;
                    };

                    const currentStep = getStatusStep(order.status);
                    const isCancelled = order.status === "Cancelled";

                    return (
                      <div key={order._id} className={`order-card ${isCancelled ? 'cancelled' : ''}`}>
                        {/* Order Header */}
                        <div className="order-card-header">
                          <div className="order-id">
                            Order #{order._id.slice(-8).toUpperCase()}
                          </div>
                          <div className="order-time">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="customer-info">
                          <h4>👤 {order.customerName || "Customer"}</h4>
                          <p>📧 {order.email || "No email"}</p>
                          <p>📞 {order.phone || "No phone"}</p>
                          <p>📍 {order.address?.city || "No address"}, {order.address?.country || ""}</p>
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

                        {/* Order Total */}
                        <div className="order-total">
                          <strong>💰 Total: KSH {order.totalAmount?.toLocaleString()}</strong>
                        </div>

                        {/* Payment Info */}
                        <div className="payment-info">
                          <span className="payment-method">
                            💳 {order.paymentMethod?.toUpperCase() || "COD"}
                          </span>
                          <span className={`payment-badge ${order.paymentStatus?.toLowerCase()}`}>
                            {order.paymentStatus || "Pending"}
                          </span>
                        </div>

                        {/* Status Stepper (not for cancelled) */}
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

                        {/* Cancelled Badge */}
                        {isCancelled && (
                          <div className="cancelled-badge">
                            ❌ ORDER CANCELLED
                          </div>
                        )}

                        {/* Status Selector or Delete Button */}
                        <div className="status-actions">
                          {!isCancelled ? (
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
    </div>
  );
};

export default AdminOrders;
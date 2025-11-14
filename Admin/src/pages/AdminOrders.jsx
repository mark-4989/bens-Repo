import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import "./AdminOrders.css";
import LiveTracking from "../components/LiveTracking";

const AdminOrders = () => {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  const backendUrl = "https://bens-repo-99lb.onrender.com";

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await getToken({ template: "MilikiAPI" });
      const response = await fetch(`${backendUrl}/api/orders/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        const sortedOrders = data.orders.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setOrders(sortedOrders);

        // Auto-expand today's orders
        const today = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        setExpandedDates(new Set([today]));
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = await getToken({ template: "MilikiAPI" });
      const response = await fetch(
        `${backendUrl}/api/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();
      if (data.success) {
        fetchOrders(); // Refresh orders
      } else {
        alert("Failed to update status: " + data.message);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Error updating status");
    }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;

    try {
      const token = await getToken({ template: "MilikiAPI" });
      const response = await fetch(`${backendUrl}/api/orders/${orderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        alert("Order deleted successfully");
        fetchOrders();
      } else {
        alert("Failed to delete order: " + data.message);
      }
    } catch (error) {
      console.error("Failed to delete order:", error);
      alert("Error deleting order");
    }
  };

  // 🚀 DISPATCH TO WHATSAPP (Opens WhatsApp with pre-filled message)
  const dispatchToWhatsApp = (order) => {
    // Format order details for WhatsApp message
    const itemsList = order.items
      .map(
        (item) =>
          `• ${item.name} (${item.size}) x${item.quantity} - KSH ${item.price}`
      )
      .join("%0A"); // URL-encoded newline

    const message = `🚚 *NEW ORDER DISPATCH*%0A%0A` +
      `📦 *Order ID:* ${order._id.slice(-8).toUpperCase()}%0A` +
      `👤 *Customer:* ${order.customer.name}%0A` +
      `📞 *Phone:* ${order.customer.phone}%0A` +
      `📍 *Location:* ${order.customer.address}%0A%0A` +
      `🛍️ *Items:*%0A${itemsList}%0A%0A` +
      `💰 *Total:* KSH ${order.totalAmount}%0A` +
      `💳 *Payment:* ${order.paymentMethod} (${order.paymentStatus})%0A%0A` +
      `⏰ *Ordered:* ${new Date(order.createdAt).toLocaleString()}%0A%0A` +
      `🎯 *Status:* Ready for dispatch`;

    // WhatsApp Web link (works on desktop and mobile)
    const whatsappLink = `https://wa.me/?text=${message}`;
    
    // Open WhatsApp in new tab
    window.open(whatsappLink, '_blank');
    
    // Optional: Update order status to "Cargo Packed"
    updateOrderStatus(order._id, "Cargo Packed");
  };

  const toggleDateFolder = (date) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  // Group orders by date
  const groupOrdersByDate = (orders) => {
    const grouped = {};
    orders.forEach((order) => {
      const date = new Date(order.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(order);
    });
    return grouped;
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const statusMatch =
      statusFilter === "all" || order.status === statusFilter;
    const paymentMatch =
      paymentFilter === "all" || order.paymentStatus === paymentFilter;
    return statusMatch && paymentMatch;
  });

  const groupedOrders = groupOrdersByDate(filteredOrders);

  const getStatusSteps = (currentStatus) => {
    const steps = [
      { label: "Received", icon: "🛒", value: "Order Received" },
      { label: "Packed", icon: "📦", value: "Cargo Packed" },
      { label: "On Route", icon: "🚚", value: "Cargo on Route" },
      { label: "Delivered", icon: "✅", value: "Delivered" },
    ];

    const currentIndex = steps.findIndex((s) => s.value === currentStatus);

    return steps.map((step, index) => ({
      ...step,
      active: index <= currentIndex,
    }));
  };

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
      {/* Header */}
      <div className="admin-orders-header">
        <h2>📦 All Orders</h2>
        <button className="refresh-btn" onClick={fetchOrders}>
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Order Received">Order Received</option>
            <option value="Cargo Packed">Cargo Packed</option>
            <option value="Cargo on Route">Cargo on Route</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Payment:</label>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="orders-count">
          Total: {filteredOrders.length} orders
        </div>
      </div>

      {/* Orders grouped by date */}
      {Object.keys(groupedOrders).length === 0 ? (
        <div className="no-orders">
          <div className="no-orders-icon">📭</div>
          <h3>No Orders Found</h3>
          <p>Try adjusting your filters</p>
        </div>
      ) : (
        <div className="date-folders-container">
          {Object.entries(groupedOrders).map(([date, dateOrders]) => (
            <div key={date} className="date-folder">
              <div
                className={`date-folder-header ${
                  expandedDates.has(date) ? "expanded" : ""
                }`}
                onClick={() => toggleDateFolder(date)}
              >
                <div className="date-folder-info">
                  <span className="folder-icon">
                    {expandedDates.has(date) ? "📂" : "📁"}
                  </span>
                  <h3 className="date-title">{date}</h3>
                  <span className="order-count-badge">
                    {dateOrders.length} orders
                  </span>
                </div>
                <span className="expand-arrow">▶</span>
              </div>

              {expandedDates.has(date) && (
                <div className="orders-grid">
                  {dateOrders.map((order) => (
                    <div
                      key={order._id}
                      className={`order-card ${
                        order.status === "Cancelled" ? "cancelled" : ""
                      }`}
                    >
                      {/* Order Card Header */}
                      <div className="order-card-header">
                        <span className="order-id">
                          #{order._id.slice(-8).toUpperCase()}
                        </span>
                        <span className="order-time">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Customer Info */}
                      <div className="customer-info">
                        <h4>👤 {order.customer.name}</h4>
                        <p>📞 {order.customer.phone}</p>
                        <p>📧 {order.customer.email}</p>
                        <p>📍 {order.customer.address || "No address"}</p>
                      </div>

                      {/* Order Items */}
                      <div className="order-items">
                        <h5>🛍️ Items:</h5>
                        {order.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="order-item">
                            <img
                              src={item.image}
                              alt={item.name}
                              onError={(e) => {
                                e.target.src =
                                  "https://via.placeholder.com/60?text=No+Image";
                              }}
                            />
                            <div className="item-details">
                              <p className="item-name">{item.name}</p>
                              <p className="item-meta">
                                Qty: {item.quantity} | Size: {item.size}
                              </p>
                              <p className="item-price">KSH {item.price}</p>
                            </div>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <p className="more-items-text">
                            +{order.items.length - 2} more items
                          </p>
                        )}
                      </div>

                      {/* Order Total */}
                      <div className="order-total">
                        <strong>💰 Total: KSH {order.totalAmount}</strong>
                      </div>

                      {/* Payment Info */}
                      <div className="payment-info">
                        <span className="payment-method">
                          {order.paymentMethod === "mpesa"
                            ? "📱 M-PESA"
                            : "💵 COD"}
                        </span>
                        <span
                          className={`payment-badge ${order.paymentStatus}`}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>

                      {/* Status Visualization */}
                      {order.status !== "Cancelled" ? (
                        <div className="visual-stepper">
                          {getStatusSteps(order.status).map((step, idx) => (
                            <div
                              key={idx}
                              className={`step ${step.active ? "active" : ""}`}
                            >
                              <span className="step-icon">{step.icon}</span>
                              <span className="step-label">{step.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="cancelled-badge">❌ CANCELLED</div>
                      )}

                      {/* 🚀 DISPATCH BUTTON - Shows when order is received */}
                      {order.status === "Order Received" && (
                        <button
                          className="dispatch-btn"
                          onClick={() => dispatchToWhatsApp(order)}
                          style={{
                            width: "100%",
                            padding: "14px",
                            marginBottom: "12px",
                            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "12px",
                            fontSize: "15px",
                            fontWeight: "700",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)",
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = "translateY(-2px)";
                            e.target.style.boxShadow = "0 6px 16px rgba(37, 211, 102, 0.4)";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 4px 12px rgba(37, 211, 102, 0.3)";
                          }}
                        >
                          📲 Dispatch to WhatsApp Group
                        </button>
                      )}

                      {/* 🚀 LIVE TRACKING BUTTON - Shows when cargo is on route */}
                      {order.status === "Cargo on Route" && (
                        <button
                          className="track-btn"
                          onClick={() => setTrackingOrderId(order._id)}
                          style={{
                            width: "100%",
                            padding: "14px",
                            marginBottom: "12px",
                            background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "12px",
                            fontSize: "15px",
                            fontWeight: "700",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = "translateY(-2px)";
                            e.target.style.boxShadow = "0 6px 16px rgba(76, 175, 80, 0.4)";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 4px 12px rgba(76, 175, 80, 0.3)";
                          }}
                        >
                          🚚 Track Driver Live
                        </button>
                      )}

                      {/* Status Change Dropdown */}
                      <div className="status-actions">
                        <div className="status-section">
                          <label>Update Status:</label>
                          <select
                            className="status-select"
                            value={order.status}
                            onChange={(e) =>
                              updateOrderStatus(order._id, e.target.value)
                            }
                          >
                            <option value="Order Received">
                              Order Received
                            </option>
                            <option value="Cargo Packed">Cargo Packed</option>
                            <option value="Cargo on Route">
                              Cargo on Route
                            </option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        className="delete-order-btn"
                        onClick={() => deleteOrder(order._id)}
                      >
                        🗑️ Delete Order
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Live Tracking Modal */}
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
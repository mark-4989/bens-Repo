import React, { useEffect, useState } from "react";
import { useAuth, useUser, RedirectToSignIn } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import {
  ShoppingCart, Package, Truck, CheckCircle, XCircle,
  Smartphone, Banknote, CreditCard, MapPin, ReceiptText,
  ShoppingBag, Info, Map, Loader2,
} from "lucide-react";
import "./Orders1.css";
import { backendUrl } from "../config";
import LiveTracking from "../components/LiveTracking";

// ── Status step config ───────────────────────────────────────────
const STATUS_STEPS = [
  { value: "Order Received", label: "Received", Icon: ShoppingCart },
  { value: "Cargo Packed",   label: "Packed",   Icon: Package },
  { value: "Cargo on Route", label: "On Route", Icon: Truck },
  { value: "Delivered",      label: "Delivered",Icon: CheckCircle },
];

const getProgress = (status) =>
  STATUS_STEPS.findIndex((s) => s.value === status);

// ── Payment method display ───────────────────────────────────────
const PaymentMethodDisplay = ({ method }) => {
  if (method === "mpesa" || method === "m-pesa") {
    return (
      <span className="payment-method-info">
        <Smartphone size={13} /> M-PESA
      </span>
    );
  }
  if (method === "stripe") {
    return (
      <span className="payment-method-info">
        <CreditCard size={13} /> Stripe
      </span>
    );
  }
  return (
    <span className="payment-method-info">
      <Banknote size={13} /> Cash on Delivery
    </span>
  );
};

// ── Main component ───────────────────────────────────────────────
const Orders1 = () => {
  const { isSignedIn } = useUser();
  const { getToken }   = useAuth();

  const [orders, setOrders]                   = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState("");
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [payingOrderId, setPayingOrderId]     = useState(null);
  const [cancellingId, setCancellingId]       = useState(null);

  const fetchOrders = async () => {
    if (!isSignedIn) return;
    try {
      setLoading(true);
      const token = await getToken({ template: "MilikiAPI" });
      const res   = await fetch(`${backendUrl}/api/orders/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) setOrders(data.orders);
      else throw new Error(data.message || "Failed to fetch orders");
    } catch (err) {
      setError("Failed to load your orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [isSignedIn]);

  if (!isSignedIn) return <RedirectToSignIn />;

  // ── Cancel order ──────────────────────────────────────────────
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      setCancellingId(orderId);
      const token = await getToken({ template: "MilikiAPI" });
      const res   = await fetch(`${backendUrl}/api/orders/${orderId}/cancel`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) { toast.success("Order cancelled"); fetchOrders(); }
      else toast.error(data.message || "Failed to cancel order");
    } catch { toast.error("Failed to cancel order"); }
    finally { setCancellingId(null); }
  };

  // ── M-Pesa STK push ───────────────────────────────────────────
  // Only triggered when customer chose M-Pesa but payment is still pending.
  // COD orders never show this button.
  // Stripe uses a redirect flow — no "push" equivalent, so no button needed here.
  const handlePayWithMpesa = async (order) => {
    const rawPhone = prompt("Enter your M-Pesa number (e.g. 0712345678):");
    if (!rawPhone) return;

    const phone = rawPhone.replace(/\s/g, "");
    if (!/^(0|254|\+254)?[17]\d{8}$/.test(phone)) {
      toast.error("Invalid phone number. Use 07XXXXXXXX or 01XXXXXXXX");
      return;
    }

    try {
      setPayingOrderId(order._id);
      const token = await getToken({ template: "MilikiAPI" });
      const res   = await fetch(`${backendUrl}/api/mpesa/stk-push`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order._id, phoneNumber: phone }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Payment request sent! Enter your M-Pesa PIN on your phone.");
        // Refresh after 10 s to pick up payment status update from webhook
        setTimeout(fetchOrders, 10000);
      } else {
        toast.error(data.message || "Failed to send payment request");
      }
    } catch { toast.error("Payment failed. Please try again."); }
    finally { setPayingOrderId(null); }
  };

  // ── States ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="orders-page-container">
        <div className="orders-state">
          <div className="spinner" />
          <p>Loading your orders…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-page-container">
        <div className="orders-state">
          <XCircle size={48} strokeWidth={1} className="state-icon" style={{ color: "#f0bbb7" }} />
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button className="browse-btn" onClick={fetchOrders}>Try Again</button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="orders-page-container">
        <div className="orders-state">
          <ShoppingBag size={56} strokeWidth={1} className="state-icon" />
          <h3>No orders yet</h3>
          <p>Once you place an order it will appear here</p>
          <button className="browse-btn" onClick={() => window.location.href = "/collection"}>
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="orders-page-container">
      <div className="orders-page-header">
        <h1>My Orders</h1>
        <p>{orders.length} order{orders.length !== 1 ? "s" : ""} placed</p>
      </div>

      <div className="orders-list">
        {orders.map((order) => {
          const isCancelled  = order.status === "Cancelled";
          const progressIdx  = getProgress(order.status);
          const isMpesa      = order.paymentMethod === "mpesa" || order.paymentMethod === "m-pesa";
          const isCOD        = order.paymentMethod === "cod"   || order.paymentMethod === "COD";
          const isStripe     = order.paymentMethod === "stripe";
          const needsMpesaPay = isMpesa && order.paymentStatus?.toLowerCase() === "pending" && !isCancelled;
          const canCancel    = order.cancellable && !isCancelled;
          const canTrack     = order.status === "Cargo on Route" && !isCancelled;

          return (
            <div key={order._id} className={`order-card ${isCancelled ? "is-cancelled" : ""}`}>

              {/* Top bar */}
              <div className="order-card-topbar">
                <span className="order-id-label">Order #{order._id.slice(-8).toUpperCase()}</span>
                <span className="order-date-label">
                  {new Date(order.createdAt).toLocaleDateString("en-US", {
                    year: "numeric", month: "short", day: "numeric"
                  })}
                </span>
                <span className={`payment-badge ${order.paymentStatus?.toLowerCase() ?? "pending"}`}>
                  {order.paymentStatus || "Pending"}
                </span>
              </div>

              <div className="order-card-body">

                {/* First item preview */}
                <div className="order-items-row">
                  <img
                    src={order.items?.[0]?.image || "/placeholder.png"}
                    alt={order.items?.[0]?.name || "Product"}
                    className="order-item-img"
                    onError={e => { e.target.src = "/placeholder.png"; }}
                  />
                  <div className="order-item-meta">
                    <div className="order-item-name">{order.items?.[0]?.name || "—"}</div>
                    <div className="order-item-sub">
                      <span className="order-item-tag">
                        <Package size={10} /> Qty: {order.items?.[0]?.quantity ?? 1}
                      </span>
                      {order.items?.[0]?.size && (
                        <span className="order-item-tag">Size: {order.items[0].size}</span>
                      )}
                    </div>
                    {order.items?.length > 1 && (
                      <span className="more-items-pill">+{order.items.length - 1} more item{order.items.length - 1 > 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>

                {/* Summary row: total / status / payment method */}
                <div className="order-summary-row">
                  <div className="summary-cell">
                    <span className="summary-cell-label">Order Total</span>
                    <span className="summary-cell-value amount">
                      KES {order.totalAmount?.toLocaleString() ?? "—"}
                    </span>
                  </div>
                  <div className="summary-cell">
                    <span className="summary-cell-label">Status</span>
                    <span className="summary-cell-value" style={isCancelled ? { color: "var(--danger)" } : {}}>
                      {order.status}
                    </span>
                  </div>
                  <div className="summary-cell">
                    <span className="summary-cell-label">Payment</span>
                    <PaymentMethodDisplay method={order.paymentMethod} />
                  </div>
                </div>

                {/* Stepper or cancelled */}
                {!isCancelled ? (
                  <div className="status-stepper">
                    <div className="stepper-track" />
                    {STATUS_STEPS.map(({ value, label, Icon }, i) => (
                      <div key={value} className={`step ${i <= progressIdx ? "done" : ""}`}>
                        <div className="step-icon-wrap"><Icon size={12} strokeWidth={2} /></div>
                        <span className="step-label">{label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="cancelled-badge">
                    <XCircle size={14} strokeWidth={2} /> Order Cancelled
                  </div>
                )}

                {/* Receipt */}
                {order.paymentStatus?.toLowerCase() === "paid" && order.mpesaReceiptNumber && (
                  <div className="receipt-bar">
                    <ReceiptText size={13} />
                    M-Pesa Receipt: {order.mpesaReceiptNumber}
                  </div>
                )}

                {/* ── Action buttons ── */}
                {(canTrack || needsMpesaPay || canCancel) && (
                  <div className="order-actions">

                    {/* Track — only when driver is on route */}
                    {canTrack && (
                      <button className="action-btn btn-track" onClick={() => setTrackingOrderId(order._id)}>
                        <Map size={13} strokeWidth={2} />
                        Track Driver Live
                      </button>
                    )}

                    {/* M-Pesa pay — only when customer chose M-Pesa AND payment is still pending.
                        COD: no button (customer pays at door).
                        Stripe: no STK push — handled at checkout via redirect; 
                        pending stripe orders would need a separate redirect button if you implement that. */}
                    {needsMpesaPay && (
                      <>
                        <button
                          className="action-btn btn-mpesa"
                          onClick={() => handlePayWithMpesa(order)}
                          disabled={payingOrderId === order._id}
                        >
                          {payingOrderId === order._id
                            ? <><div className="btn-spinner" />Sending Request…</>
                            : <><Smartphone size={13} strokeWidth={2} />Pay KES {order.totalAmount?.toLocaleString()} via M-Pesa</>}
                        </button>
                        <div className="mpesa-note">
                          <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span>
                            You'll receive an STK push on your M-Pesa phone. 
                            Enter your PIN to complete this payment of <strong>KES {order.totalAmount?.toLocaleString()}</strong>.
                          </span>
                        </div>
                      </>
                    )}

                    {/* Cancel */}
                    {canCancel && (
                      <button
                        className="action-btn btn-cancel"
                        onClick={() => handleCancelOrder(order._id)}
                        disabled={cancellingId === order._id}
                      >
                        {cancellingId === order._id
                          ? <><div className="btn-spinner" style={{ borderTopColor: "var(--danger)" }} />Cancelling…</>
                          : <><XCircle size={13} strokeWidth={2} />Cancel Order</>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live tracking modal */}
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

export default Orders1;
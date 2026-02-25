import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import {
  RefreshCw, Folder, FolderOpen, ChevronDown, User, Phone, Mail,
  MapPin, Car, ShoppingBag, Package, Truck, CheckCircle, XCircle,
  Trash2, Radio, Map, CreditCard, Smartphone, DollarSign, Box,
  ShoppingCart, ArchiveX,
} from "lucide-react";
import "./AdminOrders.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoiY2hlZmRyZWR6IiwiYSI6ImNtaDRwY2JhZzFvYXFmMXNiOTVmYnQ5aHkifQ.wdXtoBRNl0xYhiPAZxDRjA";
const BACKEND_URL  = "https://bens-repo-99lb.onrender.com";
const WS_URL       = "wss://bens-repo-99lb.onrender.com";

// ─── STATUS CONFIG ─────────────────────────────────────────────
const STATUS_STEPS = [
  { value: "Order Received", label: "Received",  Icon: ShoppingCart },
  { value: "Cargo Packed",   label: "Packed",    Icon: Package },
  { value: "Cargo on Route", label: "On Route",  Icon: Truck },
  { value: "Delivered",      label: "Delivered", Icon: CheckCircle },
];

const getSteps = (status) => {
  const idx = STATUS_STEPS.findIndex((s) => s.value === status);
  return STATUS_STEPS.map((step, i) => ({ ...step, active: i <= idx }));
};

// ─── LIVE TRACKING MODAL ───────────────────────────────────────
const LiveTrackingModal = ({ order, onClose }) => {
  const mapRef       = useRef(null);
  const mapInstance  = useRef(null);
  const driverMarker = useRef(null);
  const customerMarker = useRef(null);
  const socketRef    = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSeen, setLastSeen]       = useState(null);
  const [eta, setEta]                 = useState(null);
  const [driverInfo, setDriverInfo]   = useState(order.driver || null);

  const deliveryLat = order.address?.latitude || order.address?.lat;
  const deliveryLng = order.address?.longitude || order.address?.lng;

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || !window.mapboxgl) return;
      const mapboxgl = window.mapboxgl;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      if (mapInstance.current) mapInstance.current.remove();
      mapInstance.current = new mapboxgl.Map({
        container: mapRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [deliveryLng || 36.8219, deliveryLat || -1.2921],
        zoom: 13, pitch: 45,
      });
      mapInstance.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      mapInstance.current.addControl(new mapboxgl.FullscreenControl(), "top-right");
      mapInstance.current.on("load", () => {
        if (deliveryLat && deliveryLng) {
          const el = document.createElement("div");
          el.innerHTML = `<div style="background:#ef4444;color:white;padding:7px 12px;border-radius:20px;
            font-weight:700;font-size:11px;box-shadow:0 4px 14px rgba(239,68,68,0.5);
            white-space:nowrap;border:2px solid rgba(255,255,255,0.2);">${order.customerName}</div>`;
          customerMarker.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([deliveryLng, deliveryLat])
            .addTo(mapInstance.current);
        }
      });
    };
    if (window.mapboxgl) { initMap(); }
    else {
      const script = document.createElement("script");
      script.src = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js";
      script.onload = initMap;
      document.head.appendChild(script);
      if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
        const link = document.createElement("link");
        link.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css";
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
    }
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  useEffect(() => {
    const connect = (url) => {
      try {
        const ws = new WebSocket(url);
        socketRef.current = ws;
        ws.onopen = () => { setIsConnected(true); ws.send(JSON.stringify({ type: "ADMIN_SUBSCRIBE_ORDER", orderId: order._id })); };
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "DRIVER_LOCATION_UPDATE" && msg.orderId === order._id) {
              setLastSeen(new Date());
              if (msg.driverName) setDriverInfo({ name: msg.driverName });
              updateDriverMarker(msg.location);
              drawRoute(msg.location);
            }
            if (msg.type === "DELIVERY_STATUS_UPDATE" && msg.orderId === order._id && msg.status === "Delivered") {
              toast.success("Order delivered!"); onClose();
            }
          } catch {}
        };
        ws.onclose = () => { setIsConnected(false); if (url === WS_URL) setTimeout(() => connect("ws://localhost:4000"), 3000); };
        ws.onerror = () => { if (url === WS_URL) { ws.close(); connect("ws://localhost:4000"); } };
      } catch {}
    };
    connect(WS_URL);
    return () => { if (socketRef.current) socketRef.current.close(); };
  }, [order._id]);

  const updateDriverMarker = ({ lat, lng }) => {
    if (!mapInstance.current || !window.mapboxgl) return;
    if (driverMarker.current) { driverMarker.current.setLngLat([lng, lat]); }
    else {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:#10b981;padding:8px 12px;border-radius:20px;font-size:14px;
        box-shadow:0 4px 16px rgba(16,185,129,0.6);border:2px solid rgba(255,255,255,0.3);">🚗</div>`;
      driverMarker.current = new window.mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat]).addTo(mapInstance.current);
    }
    if (customerMarker.current) {
      const bounds = new window.mapboxgl.LngLatBounds();
      bounds.extend([lng, lat]);
      bounds.extend(customerMarker.current.getLngLat());
      mapInstance.current.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 800 });
    }
  };

  const drawRoute = async ({ lat, lng }) => {
    if (!mapInstance.current || !deliveryLat || !deliveryLng || !mapInstance.current.isStyleLoaded()) return;
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${lng},${lat};${deliveryLng},${deliveryLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (!data.routes?.[0]) return;
      const geo = data.routes[0].geometry;
      const map = mapInstance.current;
      if (map.getSource("d-route")) { map.getSource("d-route").setData({ type: "Feature", geometry: geo }); }
      else {
        map.addSource("d-route", { type: "geojson", data: { type: "Feature", geometry: geo } });
        map.addLayer({ id: "d-route-layer", type: "line", source: "d-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#10b981", "line-width": 4, "line-opacity": 0.9 } });
      }
      setEta(Math.round(data.routes[0].duration / 60));
    } catch {}
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:9999,padding:"1rem" }} onClick={onClose}>
      <div style={{ background:"#0d1117",borderRadius:"12px",width:"100%",maxWidth:"960px",
        maxHeight:"95vh",overflow:"hidden",display:"flex",flexDirection:"column",
        border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 24px 80px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"1.25rem 1.75rem",borderBottom:"1px solid rgba(255,255,255,0.08)",
          display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem" }}>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:"0.75rem" }}>
              <h2 style={{ margin:0,color:"#fff",fontSize:"1.1rem",fontWeight:700,letterSpacing:"0.02em" }}>
                Live Tracking
              </h2>
              <span style={{ padding:"4px 10px",borderRadius:"20px",fontSize:"10px",fontWeight:700,
                background:isConnected?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)",
                color:isConnected?"#10b981":"#ef4444",
                border:`1px solid ${isConnected?"#10b981":"#ef4444"}`,
                display:"flex",alignItems:"center",gap:"5px" }}>
                <span style={{ width:"6px",height:"6px",borderRadius:"50%",
                  background:isConnected?"#10b981":"#ef4444",
                  animation:isConnected?"blip 1.5s infinite":"none" }}/>
                {isConnected ? "Live" : "Connecting…"}
              </span>
            </div>
            <p style={{ margin:"4px 0 0",color:"#6b7280",fontSize:"0.8rem" }}>
              #{order._id?.slice(-8).toUpperCase()} · {order.customerName}
              {driverInfo?.name && <span style={{ color:"#10b981" }}> · {driverInfo.name}</span>}
            </p>
          </div>
          <div style={{ display:"flex",gap:"0.75rem",alignItems:"center" }}>
            {eta !== null && (
              <div style={{ padding:"6px 12px",background:"rgba(16,185,129,0.12)",
                border:"1px solid #10b981",borderRadius:"6px",color:"#10b981",fontWeight:700,fontSize:"0.8rem" }}>
                ETA ~{eta} min
              </div>
            )}
            {lastSeen && <div style={{ color:"#4b5563",fontSize:"0.75rem" }}>{lastSeen.toLocaleTimeString()}</div>}
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.07)",
              border:"1px solid rgba(255,255,255,0.1)",color:"#fff",width:"32px",height:"32px",
              borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <XCircle size={16} />
            </button>
          </div>
        </div>

        {/* Map */}
        <div ref={mapRef} style={{ flex:1,minHeight:"420px" }}/>

        {/* Footer */}
        <div style={{ padding:"1rem 1.75rem",borderTop:"1px solid rgba(255,255,255,0.08)",
          display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px,1fr))",gap:"1rem" }}>
          <div>
            <div style={{ fontSize:"0.7rem",color:"#4b5563",marginBottom:"3px",textTransform:"uppercase",letterSpacing:"0.1em" }}>Customer</div>
            <div style={{ fontWeight:600,color:"#fff",fontSize:"0.875rem" }}>{order.customerName}</div>
            <div style={{ color:"#3b82f6",fontSize:"0.8rem" }}>{order.phone || "N/A"}</div>
          </div>
          <div>
            <div style={{ fontSize:"0.7rem",color:"#4b5563",marginBottom:"3px",textTransform:"uppercase",letterSpacing:"0.1em" }}>Deliver To</div>
            <div style={{ fontWeight:500,color:"#e5e7eb",fontSize:"0.8rem" }}>{order.address?.street || "N/A"}</div>
          </div>
          <div>
            <div style={{ fontSize:"0.7rem",color:"#4b5563",marginBottom:"3px",textTransform:"uppercase",letterSpacing:"0.1em" }}>Total</div>
            <div style={{ fontWeight:700,color:"#10b981",fontSize:"1rem" }}>KSH {order.totalAmount?.toLocaleString()}</div>
          </div>
          {deliveryLat && deliveryLng && (
            <div style={{ display:"flex",alignItems:"flex-end" }}>
              <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${deliveryLat},${deliveryLng}`,"_blank")}
                style={{ width:"100%",padding:"9px",background:"#1a73e8",color:"white",border:"none",
                  borderRadius:"6px",fontWeight:700,cursor:"pointer",fontSize:"0.8rem",letterSpacing:"0.04em" }}>
                Google Maps
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ADMIN ORDERS ──────────────────────────────────────────────
const AdminOrders = () => {
  const { getToken } = useAuth();
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [dispatchingId, setDispatchingId] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await getToken({ template: "MilikiAPI" });
      const res   = await fetch(`${BACKEND_URL}/api/orders/all`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        const today = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
        setExpandedDates(new Set([today]));
        toast.success(`${data.orders.length} orders loaded`);
      } else { toast.error("Failed to fetch orders"); }
    } catch { toast.error("Failed to load orders"); }
    finally { setLoading(false); }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = await getToken({ template: "MilikiAPI" });
      const res   = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method:"PUT",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`Status updated to "${newStatus}"`); fetchOrders(); }
      else toast.error(data.message || "Update failed");
    } catch (e) { toast.error(e.message); }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      const token = await getToken({ template: "MilikiAPI" });
      const res   = await fetch(`${BACKEND_URL}/api/orders/${orderId}`, { method:"DELETE", headers:{Authorization:`Bearer ${token}`} });
      const data  = await res.json();
      if (data.success) { toast.success("Order deleted"); fetchOrders(); }
      else toast.error(data.message);
    } catch { toast.error("Error deleting order"); }
  };

  const broadcastToDriverApp = async (order) => {
    try {
      setDispatchingId(order._id);
      const token = await getToken({ template: "MilikiAPI" });
      const res   = await fetch(`${BACKEND_URL}/api/orders/${order._id}/broadcast`, {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ broadcast: true }),
      });
      const data = await res.json();
      if (data.success || res.ok) { toast.success("Broadcasted — drivers can now see this order."); fetchOrders(); }
      else toast.error("Broadcast failed: " + (data.message || "Unknown"));
    } catch (e) { toast.error(e.message); }
    finally { setDispatchingId(null); }
  };

  const toggleDate = (date) => {
    setExpandedDates(prev => {
      const s = new Set(prev);
      s.has(date) ? s.delete(date) : s.add(date);
      return s;
    });
  };

  const groupByDate = (list) => {
    const g = {};
    list.forEach(o => {
      const d = new Date(o.createdAt).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
      if (!g[d]) g[d] = [];
      g[d].push(o);
    });
    return g;
  };

  const filtered = orders.filter(o =>
    (statusFilter === "all"  || o.status === statusFilter) &&
    (paymentFilter === "all" || o.paymentStatus === paymentFilter)
  );
  const grouped = groupByDate(filtered);

  if (loading) return (
    <div className="admin-orders-container">
      <div className="loading-spinner"><div className="spinner" /><p>Loading orders</p></div>
    </div>
  );

  return (
    <div className="admin-orders-container">

      {/* Header */}
      <div className="admin-orders-header">
        <div className="admin-orders-header-left">
          <h2>Orders</h2>
          <p>Manage and track all customer orders</p>
        </div>
        <button className="refresh-btn" onClick={fetchOrders}>
          <RefreshCw size={14} strokeWidth={2.5} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="Order Received">Order Received</option>
            <option value="Cargo Packed">Cargo Packed</option>
            <option value="Cargo on Route">Cargo on Route</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Payment</label>
          <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="orders-count">{filtered.length} orders</div>
      </div>

      {/* Content */}
      {Object.keys(grouped).length === 0 ? (
        <div className="no-orders">
          <ArchiveX size={56} strokeWidth={1} className="no-orders-icon" />
          <h3>No Orders Found</h3>
          <p>Try adjusting your filters</p>
        </div>
      ) : (
        <div className="date-folders-container">
          {Object.entries(grouped).map(([date, dateOrders]) => {
            const isOpen = expandedDates.has(date);
            return (
              <div key={date} className="date-folder">

                {/* Folder header */}
                <div className={`date-folder-header ${isOpen ? "expanded" : ""}`} onClick={() => toggleDate(date)}>
                  <div className="date-folder-info">
                    <div className="folder-icon-wrap">
                      {isOpen ? <FolderOpen size={16} strokeWidth={1.5} /> : <Folder size={16} strokeWidth={1.5} />}
                    </div>
                    <h3 className="date-title">{date}</h3>
                    <span className="order-count-badge">{dateOrders.length} orders</span>
                  </div>
                  <ChevronDown size={18} strokeWidth={1.5} className="expand-chevron" />
                </div>

                {/* Orders grid */}
                {isOpen && (
                  <div className="orders-grid">
                    {dateOrders.map(order => (
                      <div key={order._id} className={`order-card ${order.status === "Cancelled" ? "cancelled" : ""}`}>

                        {/* Card header */}
                        <div className="order-card-header">
                          <span className="order-id">#{order._id.slice(-8).toUpperCase()}</span>
                          <span className="order-time">{new Date(order.createdAt).toLocaleTimeString()}</span>
                        </div>

                        <div className="card-body">

                          {/* Customer */}
                          <div className="customer-info">
                            <div className="customer-name-row">
                              <User size={13} strokeWidth={2} />
                              <h4>{order.customerName || "N/A"}</h4>
                            </div>
                            <div className="customer-detail"><Phone size={11} />{order.phone || "N/A"}</div>
                            <div className="customer-detail"><Mail size={11} />{order.email || "N/A"}</div>
                            <div className="customer-detail"><MapPin size={11} />{order.address?.street || "No address"}</div>
                            {order.driver?.name && (
                              <div className="driver-row">
                                <Car size={12} />{order.driver.name} · {order.driver.phone}
                              </div>
                            )}
                          </div>

                          {/* Items */}
                          <div className="order-items-section">
                            <h5><ShoppingBag size={11} />Items</h5>
                            {order.items?.length > 0 ? (
                              <>
                                {order.items.slice(0, 2).map((item, idx) => (
                                  <div key={idx} className="order-item">
                                    <img src={item.image || "https://via.placeholder.com/60?text=—"} alt={item.name}
                                      onError={e => { e.target.src = "https://via.placeholder.com/60?text=—"; }} />
                                    <div className="item-details">
                                      <p className="item-name">{item.name}</p>
                                      <p className="item-meta">Qty: {item.quantity} · Size: {item.size || "N/A"}</p>
                                      <p className="item-price">KSH {item.price?.toLocaleString()}</p>
                                    </div>
                                  </div>
                                ))}
                                {order.items.length > 2 && (
                                  <p className="more-items-text">+{order.items.length - 2} more items</p>
                                )}
                              </>
                            ) : <p className="more-items-text">No items</p>}
                          </div>

                          {/* Total */}
                          <div className="order-total">
                            <span className="order-total-label">Order Total</span>
                            <span className="order-total-amount">KSH {order.totalAmount?.toLocaleString()}</span>
                          </div>

                          {/* Payment */}
                          <div className="payment-info">
                            <div className="payment-method">
                              {order.paymentMethod === "mpesa"
                                ? <><Smartphone size={13} /> M-PESA</>
                                : <><DollarSign size={13} /> COD</>}
                            </div>
                            <span className={`payment-badge ${order.paymentStatus?.toLowerCase()}`}>
                              {order.paymentStatus}
                            </span>
                          </div>

                          {/* Stepper / Cancelled */}
                          {order.status !== "Cancelled" ? (
                            <div className="visual-stepper">
                              <div className="stepper-track" />
                              {getSteps(order.status).map(({ value, label, Icon, active }) => (
                                <div key={value} className={`step ${active ? "active" : ""}`}>
                                  <div className="step-icon-wrap"><Icon size={13} strokeWidth={2} /></div>
                                  <span className="step-label">{label}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="cancelled-badge">
                              <XCircle size={14} strokeWidth={2} /> Cancelled
                            </div>
                          )}

                          {/* Broadcast btn */}
                          {order.status === "Order Received" && (
                            <button
                              className="broadcast-btn"
                              onClick={() => broadcastToDriverApp(order)}
                              disabled={dispatchingId === order._id}
                            >
                              {dispatchingId === order._id
                                ? <><div className="btn-spinner" />Broadcasting…</>
                                : <><Radio size={13} strokeWidth={2.5} />Broadcast to Drivers</>}
                            </button>
                          )}

                          {/* Track btn */}
                          {order.status === "Cargo on Route" && (
                            <button className="track-btn" onClick={() => setTrackingOrder(order)}>
                              <div className="track-live-dot" />
                              <Map size={13} strokeWidth={2} />
                              Track Driver Live
                            </button>
                          )}

                          {/* Status update */}
                          <div className="status-actions">
                            <div className="status-section">
                              <label>Update Status</label>
                              <select className="status-select" value={order.status}
                                onChange={e => updateOrderStatus(order._id, e.target.value)}>
                                <option value="Order Received">Order Received</option>
                                <option value="Cargo Packed">Cargo Packed</option>
                                <option value="Cargo on Route">Cargo on Route</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </div>
                          </div>

                          {/* Delete */}
                          <button className="delete-order-btn" onClick={() => deleteOrder(order._id)}>
                            <Trash2 size={13} strokeWidth={2} />
                            Delete Order
                          </button>

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {trackingOrder && <LiveTrackingModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />}
    </div>
  );
};

export default AdminOrders;
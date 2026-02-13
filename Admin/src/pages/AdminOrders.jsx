import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import "./AdminOrders.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoiY2hlZmRyZWR6IiwiYSI6ImNtaDRwY2JhZzFvYXFmMXNiOTVmYnQ5aHkifQ.wdXtoBRNl0xYhiPAZxDRjA";
const BACKEND_URL = "https://bens-repo-99lb.onrender.com";
const WS_URL = "wss://bens-repo-99lb.onrender.com";

// ─────────────────────────────────────────────────────────────────
// LIVE TRACKING MODAL
// ─────────────────────────────────────────────────────────────────
const LiveTrackingModal = ({ order, onClose }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarker = useRef(null);
  const customerMarker = useRef(null);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [eta, setEta] = useState(null);
  const [driverInfo, setDriverInfo] = useState(order.driver || null);

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
        zoom: 13,
        pitch: 45,
      });
      mapInstance.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      mapInstance.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

      mapInstance.current.on("load", () => {
        if (deliveryLat && deliveryLng) {
          const el = document.createElement("div");
          el.innerHTML = `<div style="background:#ef4444;color:white;padding:8px 14px;border-radius:20px;
            font-weight:700;font-size:12px;box-shadow:0 4px 16px rgba(239,68,68,0.55);
            white-space:nowrap;border:2px solid rgba(255,255,255,0.2);">📍 ${order.customerName}</div>`;
          customerMarker.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([deliveryLng, deliveryLat])
            .setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
              <div style="padding:12px;background:#1a1a2e;border-radius:8px;min-width:180px;">
                <strong style="color:#fff;font-size:14px;">📍 Delivery Address</strong><br/>
                <span style="color:#aaa;font-size:12px;">${order.address?.street || "N/A"}</span>
              </div>`))
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
        ws.onopen = () => {
          setIsConnected(true);
          ws.send(JSON.stringify({ type: "ADMIN_SUBSCRIBE_ORDER", orderId: order._id }));
        };
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
              toast.success("✅ Order delivered!"); onClose();
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
    if (driverMarker.current) {
      driverMarker.current.setLngLat([lng, lat]);
    } else {
      const el = document.createElement("div");
      el.innerHTML = `<div style="position:relative;"><div style="background:#10b981;padding:10px 14px;
        border-radius:22px;font-size:20px;box-shadow:0 4px 18px rgba(16,185,129,0.65);
        border:2px solid rgba(255,255,255,0.3);">🚗</div>
        <div style="position:absolute;top:-5px;right:-5px;background:#ef4444;width:11px;
        height:11px;border-radius:50%;border:2px solid #0d1117;animation:tPing 1.2s infinite;"></div></div>`;
      driverMarker.current = new window.mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .setPopup(new window.mapboxgl.Popup({ offset: 30, closeButton: false }).setHTML(`
          <div style="padding:12px;background:#1a1a2e;border-radius:8px;">
            <strong style="color:#10b981;font-size:14px;">🚗 Driver — On The Way</strong>
          </div>`))
        .addTo(mapInstance.current);
    }
    if (customerMarker.current) {
      const bounds = new window.mapboxgl.LngLatBounds();
      bounds.extend([lng, lat]);
      bounds.extend(customerMarker.current.getLngLat());
      mapInstance.current.fitBounds(bounds, { padding: 90, maxZoom: 15, duration: 800 });
    }
  };

  const drawRoute = async ({ lat, lng }) => {
    if (!mapInstance.current || !deliveryLat || !deliveryLng || !mapInstance.current.isStyleLoaded()) return;
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${lng},${lat};${deliveryLng},${deliveryLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
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
      <div style={{ background:"#0d1117",borderRadius:"20px",width:"100%",maxWidth:"980px",
        maxHeight:"95vh",overflow:"hidden",display:"flex",flexDirection:"column",
        border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 24px 80px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"1.25rem 1.75rem",borderBottom:"1px solid rgba(255,255,255,0.08)",
          display:"flex",justifyContent:"space-between",alignItems:"center",
          background:"rgba(255,255,255,0.015)" }}>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:"0.75rem" }}>
              <h2 style={{ margin:0,color:"#fff",fontSize:"1.2rem",fontWeight:700 }}>🗺️ Live Tracking</h2>
              <span style={{ padding:"4px 12px",borderRadius:"20px",fontSize:"11px",fontWeight:700,
                background:isConnected?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)",
                color:isConnected?"#10b981":"#ef4444",
                border:`1px solid ${isConnected?"#10b981":"#ef4444"}`,
                display:"flex",alignItems:"center",gap:"5px" }}>
                <span style={{ width:"6px",height:"6px",borderRadius:"50%",
                  background:isConnected?"#10b981":"#ef4444",
                  animation:isConnected?"tBlip 1.5s infinite":"none" }}/>
                {isConnected ? "Live" : "Connecting…"}
              </span>
            </div>
            <p style={{ margin:"4px 0 0",color:"#6b7280",fontSize:"0.85rem" }}>
              Order #{order._id?.slice(-8).toUpperCase()} · {order.customerName}
              {driverInfo?.name && <span style={{ color:"#10b981" }}> · 🚗 {driverInfo.name}</span>}
            </p>
          </div>
          <div style={{ display:"flex",gap:"1rem",alignItems:"center" }}>
            {eta !== null && (
              <div style={{ padding:"7px 14px",background:"rgba(16,185,129,0.12)",
                border:"1px solid #10b981",borderRadius:"10px",color:"#10b981",fontWeight:700,fontSize:"0.875rem" }}>
                ETA ~{eta} min
              </div>
            )}
            {lastSeen && <div style={{ color:"#4b5563",fontSize:"0.78rem" }}>Updated {lastSeen.toLocaleTimeString()}</div>}
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.07)",
              border:"1px solid rgba(255,255,255,0.1)",color:"#fff",width:"34px",height:"34px",
              borderRadius:"50%",cursor:"pointer",fontSize:"1.1rem",
              display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
          </div>
        </div>

        {/* Map */}
        <div ref={mapRef} style={{ flex:1,minHeight:"480px" }}/>

        {/* Footer */}
        <div style={{ padding:"1rem 1.75rem",borderTop:"1px solid rgba(255,255,255,0.08)",
          background:"rgba(255,255,255,0.015)",display:"grid",
          gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))",gap:"1rem" }}>
          <div>
            <div style={{ fontSize:"0.72rem",color:"#4b5563",marginBottom:"3px",textTransform:"uppercase" }}>Customer</div>
            <div style={{ fontWeight:600,color:"#fff",fontSize:"0.9rem" }}>{order.customerName}</div>
            <div style={{ color:"#3b82f6",fontSize:"0.83rem" }}>📞 {order.phone||"N/A"}</div>
          </div>
          <div>
            <div style={{ fontSize:"0.72rem",color:"#4b5563",marginBottom:"3px",textTransform:"uppercase" }}>Deliver To</div>
            <div style={{ fontWeight:500,color:"#e5e7eb",fontSize:"0.83rem" }}>{order.address?.street||"N/A"}</div>
          </div>
          <div>
            <div style={{ fontSize:"0.72rem",color:"#4b5563",marginBottom:"3px",textTransform:"uppercase" }}>Total</div>
            <div style={{ fontWeight:700,color:"#10b981",fontSize:"1.05rem" }}>KSH {order.totalAmount?.toLocaleString()}</div>
          </div>
          {deliveryLat && deliveryLng && (
            <div style={{ display:"flex",alignItems:"flex-end" }}>
              <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${deliveryLat},${deliveryLng}`,"_blank")}
                style={{ width:"100%",padding:"10px",background:"linear-gradient(135deg,#4285F4,#34A853)",
                  color:"white",border:"none",borderRadius:"8px",fontWeight:700,cursor:"pointer",fontSize:"0.85rem" }}>
                🗺️ Google Maps
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes tBlip{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(1.4)}}
        @keyframes tPing{75%,100%{transform:scale(2.2);opacity:0}}
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// ADMIN ORDERS
// ─────────────────────────────────────────────────────────────────
const AdminOrders = () => {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const res = await fetch(`${BACKEND_URL}/api/orders/all`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        const today = new Date().toLocaleDateString("en-US", { year:"numeric",month:"long",day:"numeric" });
        setExpandedDates(new Set([today]));
        toast.success(`✅ Loaded ${data.orders.length} orders`);
      } else { toast.error("❌ Failed to fetch orders"); }
      setLoading(false);
    } catch (e) { toast.error("❌ Failed to load orders"); setLoading(false); }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = await getToken({ template: "MilikiAPI" });
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method:"PUT",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`✅ Status → "${newStatus}"`); fetchOrders(); }
      else toast.error("❌ " + (data.message||"Failed"));
    } catch (e) { toast.error("❌ " + e.message); }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      const token = await getToken({ template: "MilikiAPI" });
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}`, { method:"DELETE", headers:{Authorization:`Bearer ${token}`} });
      const data = await res.json();
      if (data.success) { toast.success("🗑️ Deleted"); fetchOrders(); }
      else toast.error("❌ " + data.message);
    } catch { toast.error("❌ Error deleting"); }
  };

  // ── BROADCAST TO DRIVER APP ──
  const broadcastToDriverApp = async (order) => {
    try {
      setDispatchingId(order._id);
      const token = await getToken({ template: "MilikiAPI" });
      const res = await fetch(`${BACKEND_URL}/api/orders/${order._id}/broadcast`, {
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body: JSON.stringify({ broadcast: true }),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success("📢 Broadcasted! Drivers can now see and accept this order.");
        fetchOrders();
      } else { toast.error("❌ Broadcast failed: " + (data.message||"Unknown")); }
    } catch (e) { toast.error("❌ " + e.message); }
    finally { setDispatchingId(null); }
  };

  const toggleDate = (date) => {
    setExpandedDates(prev => { const s = new Set(prev); s.has(date) ? s.delete(date) : s.add(date); return s; });
  };

  const groupByDate = (orders) => {
    const g = {};
    orders.forEach(o => {
      const d = new Date(o.createdAt).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
      if (!g[d]) g[d]=[];
      g[d].push(o);
    });
    return g;
  };

  const getStatusSteps = (s) => {
    const steps=[
      {label:"Received",icon:"🛒",value:"Order Received"},
      {label:"Packed",icon:"📦",value:"Cargo Packed"},
      {label:"On Route",icon:"🚚",value:"Cargo on Route"},
      {label:"Delivered",icon:"✅",value:"Delivered"},
    ];
    const idx=steps.findIndex(x=>x.value===s);
    return steps.map((step,i)=>({...step,active:i<=idx}));
  };

  const filtered = orders.filter(o=>{
    const sm=statusFilter==="all"||o.status===statusFilter;
    const pm=paymentFilter==="all"||o.paymentStatus===paymentFilter;
    return sm&&pm;
  });
  const grouped = groupByDate(filtered);

  if (loading) return (
    <div className="admin-orders-container">
      <div className="loading-spinner"><div className="spinner"></div><p>Loading orders…</p></div>
    </div>
  );

  return (
    <div className="admin-orders-container">
      <div className="admin-orders-header">
        <h2>📦 All Orders</h2>
        <button className="refresh-btn" onClick={fetchOrders}>🔄 Refresh</button>
      </div>

      <div className="admin-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
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
          <select value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)}>
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="orders-count">Total: {filtered.length} orders</div>
      </div>

      {Object.keys(grouped).length===0 ? (
        <div className="no-orders">
          <div className="no-orders-icon">📭</div>
          <h3>No Orders Found</h3>
          <p>Try adjusting your filters</p>
        </div>
      ) : (
        <div className="date-folders-container">
          {Object.entries(grouped).map(([date,dateOrders])=>(
            <div key={date} className="date-folder">
              <div className={`date-folder-header ${expandedDates.has(date)?"expanded":""}`} onClick={()=>toggleDate(date)}>
                <div className="date-folder-info">
                  <span className="folder-icon">{expandedDates.has(date)?"📂":"📁"}</span>
                  <h3 className="date-title">{date}</h3>
                  <span className="order-count-badge">{dateOrders.length} orders</span>
                </div>
                <span className="expand-arrow">▶</span>
              </div>

              {expandedDates.has(date) && (
                <div className="orders-grid">
                  {dateOrders.map(order=>(
                    <div key={order._id} className={`order-card ${order.status==="Cancelled"?"cancelled":""}`}>

                      <div className="order-card-header">
                        <span className="order-id">#{order._id.slice(-8).toUpperCase()}</span>
                        <span className="order-time">{new Date(order.createdAt).toLocaleTimeString()}</span>
                      </div>

                      <div className="customer-info">
                        <h4>👤 {order.customerName||"N/A"}</h4>
                        <p>📞 {order.phone||"N/A"}</p>
                        <p>📧 {order.email||"N/A"}</p>
                        <p>📍 {order.address?.street||"No address"}</p>
                        {order.driver?.name && (
                          <p style={{color:"#10b981",fontWeight:600,marginTop:"4px"}}>
                            🚗 {order.driver.name} · {order.driver.phone}
                          </p>
                        )}
                      </div>

                      <div className="order-items">
                        <h5>🛍️ Items:</h5>
                        {order.items?.length>0 ? (
                          <>
                            {order.items.slice(0,2).map((item,idx)=>(
                              <div key={idx} className="order-item">
                                <img src={item.image||"https://via.placeholder.com/60?text=No+Image"} alt={item.name}
                                  onError={e=>{e.target.src="https://via.placeholder.com/60?text=No+Image";}}/>
                                <div className="item-details">
                                  <p className="item-name">{item.name}</p>
                                  <p className="item-meta">Qty: {item.quantity} | Size: {item.size||"N/A"}</p>
                                  <p className="item-price">KSH {item.price}</p>
                                </div>
                              </div>
                            ))}
                            {order.items.length>2 && <p className="more-items-text">+{order.items.length-2} more</p>}
                          </>
                        ) : <p className="more-items-text">No items</p>}
                      </div>

                      <div className="order-total">
                        <strong>💰 Total: KSH {order.totalAmount}</strong>
                      </div>

                      <div className="payment-info">
                        <span className="payment-method">{order.paymentMethod==="mpesa"?"📱 M-PESA":"💵 COD"}</span>
                        <span className={`payment-badge ${order.paymentStatus?.toLowerCase()}`}>{order.paymentStatus}</span>
                      </div>

                      {order.status!=="Cancelled" ? (
                        <div className="visual-stepper">
                          {getStatusSteps(order.status).map((step,idx)=>(
                            <div key={idx} className={`step ${step.active?"active":""}`}>
                              <span className="step-icon">{step.icon}</span>
                              <span className="step-label">{step.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : <div className="cancelled-badge">❌ CANCELLED</div>}

                      {/* ── BROADCAST TO DRIVER APP ── */}
                      {order.status==="Order Received" && (
                        <button onClick={()=>broadcastToDriverApp(order)} disabled={dispatchingId===order._id}
                          style={{ width:"100%",padding:"13px",marginBottom:"12px",
                            background:dispatchingId===order._id?"#6b7280":"#000",
                            color:"white",border:"none",borderRadius:"10px",fontSize:"14px",
                            fontWeight:"700",cursor:dispatchingId===order._id?"not-allowed":"pointer",
                            transition:"all 0.2s",textTransform:"uppercase",letterSpacing:"0.5px",
                            display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",
                            boxShadow:"0 4px 12px rgba(0,0,0,0.2)" }}>
                          {dispatchingId===order._id ? (
                            <><span style={{width:"14px",height:"14px",border:"2px solid rgba(255,255,255,0.3)",
                              borderTop:"2px solid white",borderRadius:"50%",display:"inline-block",
                              animation:"aoSpin 0.8s linear infinite"}}/>Broadcasting…</>
                          ) : "📲 Broadcast to Driver App"}
                        </button>
                      )}

                      {/* ── LIVE TRACK BUTTON ── */}
                      {order.status==="Cargo on Route" && (
                        <button onClick={()=>setTrackingOrder(order)}
                          style={{ width:"100%",padding:"13px",marginBottom:"12px",
                            background:"linear-gradient(135deg,#10b981,#059669)",
                            color:"white",border:"none",borderRadius:"10px",fontSize:"14px",
                            fontWeight:"700",cursor:"pointer",transition:"all 0.2s",
                            textTransform:"uppercase",letterSpacing:"0.5px",
                            display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",
                            boxShadow:"0 4px 12px rgba(16,185,129,0.35)" }}>
                          <span style={{width:"7px",height:"7px",background:"white",borderRadius:"50%",
                            animation:"aoBlip 1.5s infinite"}}/>
                          🗺️ Track Driver Live
                        </button>
                      )}

                      <div className="status-actions">
                        <div className="status-section">
                          <label>Update Status:</label>
                          <select className="status-select" value={order.status}
                            onChange={e=>updateOrderStatus(order._id,e.target.value)}>
                            <option value="Order Received">Order Received</option>
                            <option value="Cargo Packed">Cargo Packed</option>
                            <option value="Cargo on Route">Cargo on Route</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      <button className="delete-order-btn" onClick={()=>deleteOrder(order._id)}>
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

      {trackingOrder && <LiveTrackingModal order={trackingOrder} onClose={()=>setTrackingOrder(null)}/>}

      <style>{`
        @keyframes aoSpin{to{transform:rotate(360deg)}}
        @keyframes aoBlip{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(1.5)}}
      `}</style>
    </div>
  );
};

export default AdminOrders;
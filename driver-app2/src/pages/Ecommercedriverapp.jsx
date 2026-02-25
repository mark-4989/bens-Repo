import React, { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2hlZmRyZWR6IiwiYSI6ImNtaDRwY2JhZzFvYXFmMXNiOTVmYnQ5aHkifQ.wdXtoBRNl0xYhiPAZxDRjA';
const BACKEND_URL = 'https://bens-repo-99lb.onrender.com';
const WS_URL = 'wss://bens-repo-99lb.onrender.com';

const EcommerceDriverApp = () => {
  // ══════════════ AUTHENTICATION STATE ══════════════
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driver, setDriver] = useState(null);
  const [token, setToken] = useState(null);
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  // ══════════════ ORDERS STATE ══════════════
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // ══════════════ MAP & TRACKING STATE ══════════════
  const [showMap, setShowMap] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const driverMarker = useRef(null);
  const destinationMarker = useRef(null);

  // ══════════════ GPS TRACKING REFS ══════════════
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const socketRef = useRef(null);
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);

  // ══════════════ PERSIST LOGIN ══════════════
  useEffect(() => {
    const saved = sessionStorage.getItem('ecommerceDriverSession');
    if (saved) {
      const { driver: d, token: t } = JSON.parse(saved);
      setDriver(d);
      setToken(t);
      setIsLoggedIn(true);
      connectWebSocket(d);
    }
  }, []);

  // ══════════════ FETCH ORDERS EVERY 10s ══════════════
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, token]);

  // ══════════════ START/STOP GPS BASED ON ACTIVE DELIVERY ══════════════
  useEffect(() => {
    const activeDelivery = myOrders.find(o => o.status === 'Cargo on Route');
    
    if (activeDelivery && !isTracking) {
      startGPSTracking(activeDelivery);
    } else if (!activeDelivery && isTracking) {
      stopGPSTracking();
    }
  }, [myOrders]);

  // ══════════════ LOGIN HANDLER ══════════════
  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!loginForm.phone || !loginForm.password) {
      toast.error('📱 Phone and password required');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/driver/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await res.json();
      if (data.success) {
        const driverData = {
          ...data.driver,
          name: data.driver.name || `Driver (${loginForm.phone})`,
          phone: loginForm.phone
        };
        
        setDriver(driverData);
        setToken(data.token);
        setIsLoggedIn(true);
        sessionStorage.setItem('ecommerceDriverSession', JSON.stringify({ 
          driver: driverData, 
          token: data.token 
        }));
        
        connectWebSocket(driverData);
        toast.success('✅ Logged in successfully!');
      } else {
        toast.error(data.message || '❌ Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('❌ Connection error');
    } finally {
      setLoginLoading(false);
    }
  };

  // ══════════════ LOGOUT ══════════════
  const handleLogout = () => {
    stopGPSTracking();
    if (socketRef.current) socketRef.current.close();
    sessionStorage.removeItem('ecommerceDriverSession');
    setIsLoggedIn(false);
    setDriver(null);
    setToken(null);
    setAvailableOrders([]);
    setMyOrders([]);
    setLoginForm({ phone: '', password: '' });
    toast.info('👋 Logged out');
  };

  // ══════════════ WEBSOCKET CONNECTION ══════════════
  const connectWebSocket = (driverData) => {
    const connect = (url) => {
      try {
        const ws = new WebSocket(url);
        socketRef.current = ws;

        ws.onopen = () => {
          console.log('📡 WebSocket connected');
          ws.send(JSON.stringify({
            type: 'DRIVER_REGISTER',
            driverId: driverData._id,
            driverName: driverData.name
          }));
        };

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'NEW_ORDER_AVAILABLE') {
              toast.info('📦 New order available!');
              fetchOrders();
            }
          } catch (err) {
            console.error('WS message error:', err);
          }
        };

        ws.onclose = () => {
          console.log('WS disconnected');
          if (url === WS_URL) {
            setTimeout(() => connect('ws://localhost:4000'), 3000);
          }
        };

        ws.onerror = () => {
          if (url === WS_URL) {
            ws.close();
            connect('ws://localhost:4000');
          }
        };
      } catch (err) {
        console.error('WS connection error:', err);
      }
    };

    connect(WS_URL);
  };

  // ══════════════ FETCH ORDERS ══════════════
  const fetchOrders = async () => {
    if (!token) return;

    try {
      const [availableRes, myRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/orders/driver/available`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/orders/driver/mine`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (availableRes.ok) {
        const data = await availableRes.json();
        if (data.success) setAvailableOrders(data.orders || []);
      }

      if (myRes.ok) {
        const data = await myRes.json();
        if (data.success) setMyOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
    }
  };

  // ══════════════ ACCEPT ORDER ══════════════
  const acceptOrder = async (order) => {
    setActionLoading(order._id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/driver/${order._id}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          driverName: driver.name,
          driverPhone: driver.phone
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('🎉 Order accepted! Start delivery.');
        await fetchOrders();
        setActiveTab('active');
      } else {
        toast.error(data.message || '❌ Failed to accept');
      }
    } catch (error) {
      console.error('Accept error:', error);
      toast.error('❌ Network error');
    } finally {
      setActionLoading(null);
    }
  };

  // ══════════════ MARK AS DELIVERED ══════════════
  const markAsDelivered = async (order) => {
    if (!window.confirm('Mark this order as delivered?')) return;

    setActionLoading(order._id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/driver/${order._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Delivered' })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('✅ Delivery completed!');
        stopGPSTracking();
        await fetchOrders();
        setActiveTab('completed');
      } else {
        toast.error(data.message || '❌ Failed to update');
      }
    } catch (error) {
      console.error('Deliver error:', error);
      toast.error('❌ Network error');
    } finally {
      setActionLoading(null);
    }
  };

  // ══════════════ GPS TRACKING - START ══════════════
  const startGPSTracking = (order) => {
    if (!navigator.geolocation) {
      toast.error('❌ GPS not supported on this device');
      return;
    }

    console.log('📍 Starting GPS tracking for order:', order._id);
    setIsTracking(true);
    toast.success('📡 GPS tracking started');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleLocationUpdate(latitude, longitude, order);
      },
      (error) => {
        console.error('GPS error:', error);
        toast.error('⚠️ GPS signal lost');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          handleLocationUpdate(latitude, longitude, order);
        },
        (error) => console.error('Backup GPS error:', error),
        { enableHighAccuracy: true }
      );
    }, 5000);
  };

  // ══════════════ GPS TRACKING - STOP ══════════════
  const stopGPSTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
    console.log('📍 GPS tracking stopped');
  };

  // ══════════════ LOCATION UPDATE HANDLER ══════════════
  const handleLocationUpdate = (latitude, longitude, order) => {
    setDriverLocation({ lat: latitude, lng: longitude });
    setLastLocationUpdate(new Date());

    if (socketRef.current && socketRef.current.readyState === 1) {
      socketRef.current.send(JSON.stringify({
        type: 'DRIVER_LOCATION_UPDATE',
        driverId: driver._id,
        driverName: driver.name,
        orderId: order._id,
        location: { lat: latitude, lng: longitude }
      }));
    }

    if (mapInstance.current && driverMarker.current) {
      driverMarker.current.setLngLat([longitude, latitude]);
    }
  };

  // ══════════════ INITIALIZE MAP ══════════════
  const initializeMap = (order) => {
    if (!mapContainer.current || !window.mapboxgl) return;

    const mapboxgl = window.mapboxgl;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    if (mapInstance.current) mapInstance.current.remove();

    const deliveryLat = order.address?.latitude || order.address?.lat;
    const deliveryLng = order.address?.longitude || order.address?.lng;

    mapInstance.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [deliveryLng || 36.8219, deliveryLat || -1.2921],
      zoom: 13
    });

    mapInstance.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    if (deliveryLat && deliveryLng) {
      const destEl = document.createElement('div');
      destEl.innerHTML = `<div style="background:#ef4444;color:white;padding:8px 14px;border-radius:20px;font-weight:700;font-size:12px;box-shadow:0 4px 12px rgba(239,68,68,0.5);">📍 Customer</div>`;
      
      destinationMarker.current = new mapboxgl.Marker({ element: destEl, anchor: 'bottom' })
        .setLngLat([deliveryLng, deliveryLat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>📍 Delivery Address</strong><br/>${order.address?.street || 'N/A'}`))
        .addTo(mapInstance.current);
    }

    if (driverLocation) {
      const driverEl = document.createElement('div');
      driverEl.innerHTML = `<div style="background:#10b981;color:white;padding:10px 14px;border-radius:22px;font-size:18px;box-shadow:0 4px 16px rgba(16,185,129,0.6);">🚗</div>`;
      
      driverMarker.current = new mapboxgl.Marker({ element: driverEl, anchor: 'center' })
        .setLngLat([driverLocation.lng, driverLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<strong>🚗 Your Location</strong>'))
        .addTo(mapInstance.current);

      if (deliveryLat && deliveryLng) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([driverLocation.lng, driverLocation.lat]);
        bounds.extend([deliveryLng, deliveryLat]);
        mapInstance.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
      }
    }
  };

  useEffect(() => {
    if (window.mapboxgl) return;
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
    script.async = true;
    document.head.appendChild(script);
    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const formatPrice = (price) => `KSh ${(price || 0).toLocaleString()}`;
  const timeSince = (date) => {
    const minutes = Math.floor((Date.now() - new Date(date)) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };
  const getUrgency = (date) => {
    const m = Math.floor((Date.now() - new Date(date)) / 60000);
    if (m > 30) return { label: 'URGENT', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
    if (m > 15) return { label: 'HIGH', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
    return { label: 'NORMAL', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
  };

  const activeOrders = myOrders.filter(o => o.status === 'Cargo on Route');
  const completedOrders = myOrders.filter(o => o.status === 'Delivered');

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
        <ToastContainer position="top-center" theme="colored" />
        <div style={{ background: 'white', borderRadius: '24px', padding: '3rem 2.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 32px 80px rgba(0,0,0,0.35)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>🚗</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#111', margin: '0 0 0.5rem' }}>Driver Portal</h1>
            <p style={{ color: '#6b7280', margin: 0 }}>E-commerce Delivery System</p>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>📱 Phone Number</label>
              <input type="tel" placeholder="+254712345678" value={loginForm.phone} onChange={e => setLoginForm({ ...loginForm, phone: e.target.value })} style={{ width: '100%', padding: '0.875rem 1rem', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '1rem', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#667eea'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>🔒 Password</label>
              <input type="password" placeholder="Enter password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} style={{ width: '100%', padding: '0.875rem 1rem', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#667eea'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>Default password: <strong>driver123</strong></p>
            </div>
            <button type="submit" disabled={loginLoading} style={{ width: '100%', padding: '1rem', background: loginLoading ? '#9ca3af' : 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 700, cursor: loginLoading ? 'not-allowed' : 'pointer', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onMouseEnter={e => !loginLoading && (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              {loginLoading ? (<><span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', display: 'inline-block', animation: 'loginSpin 0.8s linear infinite' }} />Signing in...</>) : '🚗  Sign In'}
            </button>
          </form>
        </div>
        <style>{`@keyframes loginSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif', paddingBottom: '5rem' }}>
      <ToastContainer position="top-center" theme="colored" />
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '1rem 1.5rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🚗</div>
            <div>
              <div style={{ fontWeight: 700, color: '#111' }}>{driver?.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{driver?.phone}{isTracking && <span style={{ color: '#10b981', marginLeft: '8px' }}>● GPS Active</span>}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Sign Out</button>
        </div>
      </div>
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', padding: '0.875rem 0' }}>
        {[{ label: 'Available', count: availableOrders.length, color: '#f59e0b' }, { label: 'Active', count: activeOrders.length, color: '#10b981' }, { label: 'Completed', count: completedOrders.length, color: '#3b82f6' }].map(stat => (
          <div key={stat.label}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color }}>{stat.count}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', background: 'white', borderBottom: '2px solid #e5e7eb', position: 'sticky', top: '72px', zIndex: 90 }}>
        {[{ key: 'available', label: `Available (${availableOrders.length})` }, { key: 'active', label: `Active (${activeOrders.length})` }, { key: 'completed', label: `Completed (${completedOrders.length})` }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: '1rem 0.75rem', border: 'none', background: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: activeTab === tab.key ? 700 : 500, color: activeTab === tab.key ? '#111' : '#6b7280', borderBottom: activeTab === tab.key ? '2px solid #111' : '2px solid transparent', marginBottom: '-2px', transition: 'all 0.2s' }}>{tab.label}</button>
        ))}
      </div>
      <div style={{ padding: '1.25rem', maxWidth: '700px', margin: '0 auto' }}>
        {activeTab === 'available' && (
          <div>{availableOrders.length === 0 ? <EmptyState icon="📭" title="No orders yet" message="New orders will appear here when admin broadcasts them" /> : availableOrders.map(order => {
            const urgency = getUrgency(order.createdAt);
            return <OrderCard key={order._id} order={order} urgency={urgency} timeSince={timeSince} formatPrice={formatPrice} actionLoading={actionLoading} onAccept={() => acceptOrder(order)} />;
          })}</div>
        )}
        {activeTab === 'active' && (
          <div>{activeOrders.length === 0 ? <EmptyState icon="🚗" title="No active deliveries" message="Accept an order to start delivering" /> : activeOrders.map(order => (
            <ActiveOrderCard key={order._id} order={order} driver={driver} driverLocation={driverLocation} isTracking={isTracking} lastLocationUpdate={lastLocationUpdate} formatPrice={formatPrice} actionLoading={actionLoading} onDeliver={() => markAsDelivered(order)} onShowMap={() => { setSelectedOrder(order); setShowMap(true); setTimeout(() => initializeMap(order), 100); }} />
          ))}</div>
        )}
        {activeTab === 'completed' && (
          <div>{completedOrders.length === 0 ? <EmptyState icon="✅" title="No completed deliveries yet" message="Completed orders will appear here" /> : (
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {completedOrders.map((order, idx) => (
                <div key={order._id} style={{ padding: '1.25rem 1.5rem', borderBottom: idx < completedOrders.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#111', fontSize: '0.95rem' }}>#{order._id.slice(-8).toUpperCase()}</div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>{order.customerName} · {timeSince(order.updatedAt || order.createdAt)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#111', marginBottom: '4px' }}>{formatPrice(order.totalAmount)}</div>
                    <span style={{ padding: '4px 10px', background: '#10b981', color: 'white', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>✅ Done</span>
                  </div>
                </div>
              ))}
            </div>
          )}</div>
        )}
      </div>
      {showMap && selectedOrder && <MapModal order={selectedOrder} driverLocation={driverLocation} mapContainer={mapContainer} onClose={() => setShowMap(false)} />}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #e5e7eb', display: 'flex', boxShadow: '0 -2px 10px rgba(0,0,0,0.08)', zIndex: 100 }}>
        {[{ key: 'available', icon: '📦', label: 'Orders' }, { key: 'active', icon: '🚗', label: 'Active' }, { key: 'completed', icon: '✅', label: 'History' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: '0.875rem 0.5rem', border: 'none', background: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === tab.key ? '#111' : '#9ca3af' }}>
            <span style={{ fontSize: '1.4rem' }}>{tab.icon}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: activeTab === tab.key ? 700 : 500 }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const EmptyState = ({ icon, title, message }) => (
  <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
    <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.4 }}>{icon}</div>
    <h3 style={{ margin: '0 0 0.5rem', color: '#111', fontSize: '1.2rem' }}>{title}</h3>
    <p style={{ color: '#6b7280', margin: 0, fontSize: '0.95rem' }}>{message}</p>
  </div>
);

const OrderCard = ({ order, urgency, timeSince, formatPrice, actionLoading, onAccept }) => (
  <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', marginBottom: '1rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 700, color: '#111', fontSize: '1rem' }}>#{order._id.slice(-8).toUpperCase()}</div>
        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>{timeSince(order.createdAt)}</div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: urgency.bg, color: urgency.color }}>{urgency.label}</span>
        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid #10b981' }}>{order.paymentMethod === 'm-pesa' ? '📱 M-PESA' : '💵 COD'}</span>
      </div>
    </div>
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.2rem' }}>📍</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#111', marginBottom: '2px' }}>{order.address?.street || 'Address not set'}</div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{order.address?.city}{order.address?.city && order.address?.country ? ', ' : ''}{order.address?.country}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.875rem', background: '#f9fafb', borderRadius: '10px', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>TOTAL</div>
          <div style={{ fontWeight: 800, color: '#111', fontSize: '1.15rem' }}>{formatPrice(order.totalAmount)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>ITEMS</div>
          <div style={{ fontWeight: 700, color: '#111' }}>{order.items?.length || 0}</div>
        </div>
      </div>
      <button onClick={onAccept} disabled={actionLoading === order._id} style={{ width: '100%', padding: '14px', background: actionLoading === order._id ? '#6b7280' : '#111', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, cursor: actionLoading === order._id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        {actionLoading === order._id ? (<><span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', display: 'inline-block', animation: 'orderSpin 0.8s linear infinite' }} />Accepting...</>) : '✅ Accept Order'}
      </button>
    </div>
    <style>{`@keyframes orderSpin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ActiveOrderCard = ({ order, driver, driverLocation, isTracking, lastLocationUpdate, formatPrice, actionLoading, onDeliver, onShowMap }) => (
  <div style={{ background: 'white', borderRadius: '16px', border: '2px solid #10b981', marginBottom: '1rem', overflow: 'hidden', boxShadow: '0 4px 16px rgba(16,185,129,0.15)' }}>
    <div style={{ background: '#10b981', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', animation: 'activeBlip 1.5s infinite' }} />
        <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>DELIVERING NOW</span>
      </div>
      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: 600 }}>#{order._id.slice(-8).toUpperCase()}</span>
    </div>
    <div style={{ padding: '1.5rem' }}>
      <div style={{ padding: '0.875rem', borderRadius: '10px', marginBottom: '1rem', background: isTracking ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${isTracking ? '#10b981' : '#ef4444'}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1rem' }}>{isTracking ? '📡' : '📵'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isTracking ? '#10b981' : '#ef4444' }}>{isTracking ? 'GPS Active — Admin & Customer can see you' : 'GPS Inactive'}</div>
          {isTracking && driverLocation && (
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>{driverLocation.lat.toFixed(5)}, {driverLocation.lng.toFixed(5)}{lastLocationUpdate && ` · Updated ${lastLocationUpdate.toLocaleTimeString()}`}</div>
          )}
        </div>
      </div>
      <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '10px', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Deliver To</div>
        <div style={{ fontWeight: 700, color: '#111', marginBottom: '3px' }}>{order.customerName}</div>
        <div style={{ color: '#374151', fontSize: '0.9rem' }}>{order.address?.street || 'N/A'}</div>
        <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{order.address?.city}{order.address?.city && order.address?.country ? ', ' : ''}{order.address?.country}</div>
        {order.phone && <a href={`tel:${order.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6', fontWeight: 600, fontSize: '0.9rem', marginTop: '6px', textDecoration: 'none' }}>📞 {order.phone}</a>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.875rem', background: '#f9fafb', borderRadius: '10px', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>ORDER VALUE</div>
          <div style={{ fontWeight: 800, color: '#111', fontSize: '1.15rem' }}>{formatPrice(order.totalAmount)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>PAYMENT</div>
          <div style={{ fontWeight: 700, color: '#111', fontSize: '0.95rem' }}>{order.paymentMethod === 'm-pesa' ? '📱 M-PESA' : order.paymentMethod === 'cod' ? '💵 Collect Cash' : '💳'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <button onClick={onShowMap} style={{ flex: 1, padding: '12px', background: '#f3f4f6', color: '#111', border: '1px solid #e5e7eb', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>🗺️ View Map</button>
        {order.address?.latitude && order.address?.longitude && (
          <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.address.latitude},${order.address.longitude}`, '_blank')} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #4285F4, #34A853)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>🧭 Navigate</button>
        )}
      </div>
      <button onClick={onDeliver} disabled={actionLoading === order._id} style={{ width: '100%', padding: '15px', background: actionLoading === order._id ? '#6b7280' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 800, cursor: actionLoading === order._id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(16,185,129,0.4)', transition: 'all 0.2s' }}>
        {actionLoading === order._id ? (<><span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', display: 'inline-block', animation: 'deliverSpin 0.8s linear infinite' }} />Updating...</>) : '✅ Mark as Delivered'}
      </button>
    </div>
    <style>{`@keyframes activeBlip { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.5); } } @keyframes deliverSpin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const MapModal = ({ order, driverLocation, mapContainer, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
    <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 700, color: '#111' }}>🗺️ Delivery Route</h3>
          <p style={{ margin: '3px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>{order.address?.street || 'N/A'}</p>
        </div>
        <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>×</button>
      </div>
      <div ref={mapContainer} style={{ flex: 1, minHeight: '400px' }} />
      <div style={{ padding: '1rem 1.5rem', background: '#f9fafb', display: 'flex', gap: '0.75rem' }}>
        <button onClick={() => { const lat = order.address?.latitude || order.address?.lat; const lng = order.address?.longitude || order.address?.lng; if (lat && lng) window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank'); }} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #4285F4, #34A853)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>🗺️ Open Google Maps</button>
        <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#f3f4f6', color: '#111', border: '1px solid #e5e7eb', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Close</button>
      </div>
    </div>
  </div>
);

export default EcommerceDriverApp;
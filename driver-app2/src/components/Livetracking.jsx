import React, { useState, useEffect, useRef } from 'react';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2hlZmRyZWR6IiwiYSI6ImNtaDRwY2JhZzFvYXFmMXNiOTVmYnQ5aHkifQ.wdXtoBRNl0xYhiPAZxDRjA';
const BACKEND_URL = 'https://bens-repo-99lb.onrender.com';
const WS_URL = 'wss://bens-repo-99lb.onrender.com';

const LiveTracking = ({ orderId, onClose, getToken }) => {
  const [order, setOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarker = useRef(null);
  const customerMarker = useRef(null);
  const socketRef = useRef(null);

  // ══════════ FETCH ORDER DETAILS ══════════
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const token = await getToken({ template: 'MilikiAPI' });
        const res = await fetch(`${BACKEND_URL}/api/orders/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          const foundOrder = data.orders.find(o => o._id === orderId);
          if (foundOrder) setOrder(foundOrder);
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
      }
    };

    fetchOrderDetails();
  }, [orderId, getToken]);

  // ══════════ INITIALIZE MAPBOX ══════════
  useEffect(() => {
    if (!order || !mapRef.current) return;

    const initMap = () => {
      if (!window.mapboxgl) return;
      
      const mapboxgl = window.mapboxgl;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      if (mapInstance.current) mapInstance.current.remove();

      const customerLat = order.address?.latitude || order.address?.lat;
      const customerLng = order.address?.longitude || order.address?.lng;

      mapInstance.current = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [customerLng || 36.8219, customerLat || -1.2921],
        zoom: 13,
        pitch: 45
      });

      mapInstance.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Customer marker
      if (customerLat && customerLng) {
        const custEl = document.createElement('div');
        custEl.innerHTML = `
          <div style="background:#ef4444;color:white;padding:8px 14px;border-radius:20px;
            font-weight:700;font-size:12px;box-shadow:0 4px 16px rgba(239,68,68,0.55);
            white-space:nowrap;border:2px solid rgba(255,255,255,0.2);">
            📍 Your Location
          </div>`;
        
        customerMarker.current = new mapboxgl.Marker({ element: custEl, anchor: 'bottom' })
          .setLngLat([customerLng, customerLat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding:12px;background:#1a1a2e;border-radius:8px;">
              <strong style="color:#fff;font-size:14px;">📍 Delivery Address</strong><br/>
              <span style="color:#aaa;font-size:12px;">${order.address?.street || 'N/A'}</span>
            </div>`))
          .addTo(mapInstance.current);
      }
    };

    if (window.mapboxgl) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
      script.onload = initMap;
      document.head.appendChild(script);
      
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [order]);

  // ══════════ WEBSOCKET CONNECTION ══════════
  useEffect(() => {
    if (!order) return;

    const connect = (url) => {
      try {
        const ws = new WebSocket(url);
        socketRef.current = ws;

        ws.onopen = () => {
          console.log('📡 Customer tracking connected');
          setIsConnected(true);
          ws.send(JSON.stringify({
            type: 'ADMIN_SUBSCRIBE_ORDER',
            orderId: order._id
          }));
        };

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            
            if (msg.type === 'DRIVER_LOCATION_UPDATE' && msg.orderId === order._id) {
              const { lat, lng } = msg.location;
              setDriverLocation({ lat, lng });
              setLastUpdate(new Date());
              updateDriverMarker({ lat, lng });
              drawRoute({ lat, lng });
            }

            if (msg.type === 'DELIVERY_STATUS_UPDATE' && msg.orderId === order._id) {
              if (msg.status === 'Delivered') {
                onClose();
              }
            }
          } catch (err) {
            console.error('WS message error:', err);
          }
        };

        ws.onclose = () => {
          console.log('WS disconnected');
          setIsConnected(false);
          // Fallback to localhost
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

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [order]);

  // ══════════ UPDATE DRIVER MARKER ══════════
  const updateDriverMarker = ({ lat, lng }) => {
    if (!mapInstance.current || !window.mapboxgl) return;

    if (driverMarker.current) {
      driverMarker.current.setLngLat([lng, lat]);
    } else {
      const driverEl = document.createElement('div');
      driverEl.innerHTML = `
        <div style="position:relative;">
          <div style="background:#10b981;padding:10px 14px;border-radius:22px;font-size:20px;
            box-shadow:0 4px 18px rgba(16,185,129,0.65);border:2px solid rgba(255,255,255,0.3);
            animation:driverBob 2s infinite;">🚗</div>
          <div style="position:absolute;top:-5px;right:-5px;background:#ef4444;
            width:11px;height:11px;border-radius:50%;border:2px solid #0d1117;
            animation:livePing 1.2s infinite;"></div>
        </div>`;
      
      driverMarker.current = new window.mapboxgl.Marker({ element: driverEl, anchor: 'center' })
        .setLngLat([lng, lat])
        .setPopup(new window.mapboxgl.Popup({ offset: 30 }).setHTML(`
          <div style="padding:12px;background:#1a1a2e;border-radius:8px;">
            <strong style="color:#10b981;font-size:14px;">🚗 Driver — On The Way</strong><br/>
            <span style="color:#aaa;font-size:12px;">Live location</span>
          </div>`))
        .addTo(mapInstance.current);
    }

    // Auto-fit both markers
    if (customerMarker.current) {
      const bounds = new window.mapboxgl.LngLatBounds();
      bounds.extend([lng, lat]);
      bounds.extend(customerMarker.current.getLngLat());
      mapInstance.current.fitBounds(bounds, { padding: 90, maxZoom: 15, duration: 800 });
    }
  };

  // ══════════ DRAW ROUTE ══════════
  const drawRoute = async ({ lat, lng }) => {
    if (!mapInstance.current || !order) return;
    
    const customerLat = order.address?.latitude || order.address?.lat;
    const customerLng = order.address?.longitude || order.address?.lng;
    
    if (!customerLat || !customerLng) return;

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${lng},${lat};${customerLng},${customerLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (!data.routes?.[0]) return;

      const routeGeo = data.routes[0].geometry;
      const map = mapInstance.current;
      
      if (!map.isStyleLoaded()) return;

      if (map.getSource('driver-route')) {
        map.getSource('driver-route').setData({ type: 'Feature', geometry: routeGeo });
      } else {
        map.addSource('driver-route', {
          type: 'geojson',
          data: { type: 'Feature', geometry: routeGeo }
        });
        map.addLayer({
          id: 'driver-route-layer',
          type: 'line',
          source: 'driver-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 
            'line-color': '#10b981', 
            'line-width': 4, 
            'line-opacity': 0.85,
            'line-dasharray': [2, 2]
          }
        });
      }

      setEta(Math.round(data.routes[0].duration / 60));
    } catch (err) {
      console.error('Route drawing error:', err);
    }
  };

  if (!order) {
    return (
      <div className="tracking-modal-overlay">
        <div className="tracking-modal-content">
          <p style={{ textAlign: 'center', padding: '2rem' }}>Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tracking-modal-overlay" onClick={onClose}>
      <div 
        className="tracking-modal-content"
        style={{ maxWidth: '980px', background: '#0d1117', color: 'white' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.015)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ 
                margin: 0, 
                color: '#fff', 
                fontSize: '1.2rem', 
                fontWeight: 700 
              }}>
                🗺️ Live Tracking
              </h2>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 700,
                background: isConnected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: isConnected ? '#10b981' : '#ef4444',
                border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isConnected ? '#10b981' : '#ef4444',
                  animation: isConnected ? 'liveBlip 1.5s infinite' : 'none'
                }} />
                {isConnected ? 'Live' : 'Connecting…'}
              </span>
            </div>
            <p style={{ 
              margin: '4px 0 0', 
              color: '#6b7280', 
              fontSize: '0.85rem' 
            }}>
              Order #{order._id?.slice(-8).toUpperCase()}
              {order.driver?.name && <span style={{ color: '#10b981' }}> · 🚗 {order.driver.name}</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {eta !== null && (
              <div style={{
                padding: '7px 14px',
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid #10b981',
                borderRadius: '10px',
                color: '#10b981',
                fontWeight: 700,
                fontSize: '0.875rem'
              }}>
                ETA ~{eta} min
              </div>
            )}
            {lastUpdate && (
              <div style={{ color: '#4b5563', fontSize: '0.78rem' }}>
                Updated {lastUpdate.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={onClose}
              className="close-modal-btn"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Map */}
        <div ref={mapRef} style={{ height: '480px', minHeight: '480px' }} />

        {/* Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.015)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <div style={{ 
              fontSize: '0.72rem', 
              color: '#4b5563', 
              marginBottom: '3px', 
              textTransform: 'uppercase' 
            }}>
              Delivery Address
            </div>
            <div style={{ fontWeight: 500, color: '#e5e7eb', fontSize: '0.83rem' }}>
              {order.address?.street || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '0.72rem', 
              color: '#4b5563', 
              marginBottom: '3px', 
              textTransform: 'uppercase' 
            }}>
              Total
            </div>
            <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1.05rem' }}>
              KSH {order.totalAmount?.toLocaleString()}
            </div>
          </div>
          {order.address?.latitude && order.address?.longitude && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${order.address.latitude},${order.address.longitude}`,
                  '_blank'
                )}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'linear-gradient(135deg,#4285F4,#34A853)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                🗺️ Google Maps
              </button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes liveBlip { 
            0%,100% { opacity: 1; transform: scale(1); } 
            50% { opacity: 0.3; transform: scale(1.4); } 
          }
          @keyframes driverBob { 
            0%,100% { transform: scale(1); } 
            50% { transform: scale(1.07); } 
          }
          @keyframes livePing { 
            75%,100% { transform: scale(2.2); opacity: 0; } 
          }
        `}</style>
      </div>
    </div>
  );
};

export default LiveTracking;
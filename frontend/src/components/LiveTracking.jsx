import React, { useState, useEffect, useRef, useCallback } from 'react';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2hlZmRyZWR6IiwiYSI6ImNtaDRwY2JhZzFvYXFmMXNiOTVmYnQ5aHkifQ.wdXtoBRNl0xYhiPAZxDRjA';
const WS_URL       = 'wss://bens-repo-99lb.onrender.com';
const BACKEND_URL  = 'https://bens-repo-99lb.onrender.com';

const getBackoffDelay = (attempt) => Math.min(1000 * 2 ** attempt, 30000);

/**
 * Customer-facing LiveTracking modal.
 *
 * Props:
 *   order   — full order object (passed directly from Orders1, no secondary fetch)
 *   onClose — callback to close the modal
 *
 * Connection strategy:
 *   1. Raw WebSocket → sends ADMIN_SUBSCRIBE_ORDER, receives DRIVER_LOCATION_UPDATE
 *   2. If WS fails → REST poll GET /api/orders/:id/driver-location every 5s
 *   3. WS reconnects in background with exponential backoff; polling stops when WS recovers
 */
const LiveTracking = ({ order, onClose }) => {
  const [wsStatus,     setWsStatus]     = useState('connecting'); // 'connecting'|'live'|'polling'|'error'
  const [lastUpdate,   setLastUpdate]   = useState(null);
  const [eta,          setEta]          = useState(null);
  const [driverInfo,   setDriverInfo]   = useState(order?.driver || null);
  const [hasDriverPos, setHasDriverPos] = useState(false);

  const mapRef          = useRef(null);
  const mapInstance     = useRef(null);
  const driverMarker    = useRef(null);
  const customerMarker  = useRef(null);
  const socketRef       = useRef(null);
  const reconnectTimer  = useRef(null);
  const pollTimer       = useRef(null);
  const attemptRef      = useRef(0);
  const mountedRef      = useRef(true);

  const deliveryLat = order?.address?.latitude  || order?.address?.lat;
  const deliveryLng = order?.address?.longitude || order?.address?.lng;

  // ══════════ MAP INIT ══════════
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      if (!window.mapboxgl || !mapRef.current) return;
      const mapboxgl = window.mapboxgl;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      if (mapInstance.current) mapInstance.current.remove();

      mapInstance.current = new mapboxgl.Map({
        container: mapRef.current,
        style:  'mapbox://styles/mapbox/dark-v11',
        center: [deliveryLng || 36.8219, deliveryLat || -1.2921],
        zoom: 13, pitch: 45,
      });
      mapInstance.current.addControl(new mapboxgl.NavigationControl(),  'top-right');
      mapInstance.current.addControl(new mapboxgl.FullscreenControl(),  'top-right');

      // Customer pin — inside map.on('load') to avoid race condition
      mapInstance.current.on('load', () => {
        if (!deliveryLat || !deliveryLng) return;
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="background:#ef4444;color:white;padding:8px 14px;border-radius:20px;
            font-weight:700;font-size:12px;box-shadow:0 4px 16px rgba(239,68,68,0.55);
            white-space:nowrap;border:2px solid rgba(255,255,255,0.2);">
            📍 Your Location
          </div>`;
        customerMarker.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([deliveryLng, deliveryLat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding:12px;background:#1a1a2e;border-radius:8px;">
              <strong style="color:#fff;">📍 Delivery Address</strong><br/>
              <span style="color:#aaa;font-size:12px;">${order?.address?.street || 'N/A'}</span>
            </div>`))
          .addTo(mapInstance.current);
      });
    };

    if (window.mapboxgl) {
      initMap();
    } else {
      const script  = document.createElement('script');
      script.src    = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
      script.onload = initMap;
      document.head.appendChild(script);
      if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
        const link = document.createElement('link');
        link.href  = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
        link.rel   = 'stylesheet';
        document.head.appendChild(link);
      }
    }

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  // ══════════ DRIVER MARKER ══════════
  const updateDriverMarker = useCallback(({ lat, lng }) => {
    if (!mapInstance.current || !window.mapboxgl) return;
    setHasDriverPos(true);

    if (driverMarker.current) {
      driverMarker.current.setLngLat([lng, lat]);
    } else {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="position:relative;">
          <div style="background:#10b981;padding:10px 14px;border-radius:22px;font-size:20px;
            box-shadow:0 4px 18px rgba(16,185,129,0.65);border:2px solid rgba(255,255,255,0.3);">🚗</div>
          <div style="position:absolute;top:-5px;right:-5px;background:#ef4444;
            width:11px;height:11px;border-radius:50%;border:2px solid #0d1117;
            animation:livePing 1.2s infinite;"></div>
        </div>`;
      driverMarker.current = new window.mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(mapInstance.current);
    }

    if (customerMarker.current) {
      const bounds = new window.mapboxgl.LngLatBounds();
      bounds.extend([lng, lat]);
      bounds.extend(customerMarker.current.getLngLat());
      mapInstance.current.fitBounds(bounds, { padding: 90, maxZoom: 15, duration: 800 });
    }
  }, []);

  // ══════════ ROUTE ══════════
  const drawRoute = useCallback(async ({ lat, lng }) => {
    if (!mapInstance.current || !deliveryLat || !deliveryLng) return;
    if (!mapInstance.current.isStyleLoaded()) return;
    try {
      const res  = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${lng},${lat};${deliveryLng},${deliveryLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`);
      const data = await res.json();
      if (!data.routes?.[0]) return;
      const geo = data.routes[0].geometry;
      const map = mapInstance.current;
      if (map.getSource('driver-route')) {
        map.getSource('driver-route').setData({ type: 'Feature', geometry: geo });
      } else {
        map.addSource('driver-route', { type: 'geojson', data: { type: 'Feature', geometry: geo } });
        map.addLayer({
          id: 'driver-route-layer', type: 'line', source: 'driver-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#10b981', 'line-width': 4, 'line-opacity': 0.85, 'line-dasharray': [2, 2] },
        });
      }
      setEta(Math.round(data.routes[0].duration / 60));
    } catch (err) { console.error('Route error:', err); }
  }, [deliveryLat, deliveryLng]);

  // ══════════ HANDLE INCOMING LOCATION ══════════
  const handleLocation = useCallback(({ lat, lng, driverName }) => {
    if (!mountedRef.current) return;
    setLastUpdate(new Date());
    if (driverName) setDriverInfo(prev => ({ ...prev, name: driverName }));
    updateDriverMarker({ lat, lng });
    drawRoute({ lat, lng });
  }, [updateDriverMarker, drawRoute]);

  // ══════════ REST POLLING FALLBACK ══════════
  const stopPolling  = useCallback(() => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimer.current) return;
    setWsStatus('polling');
    console.log('📡 REST polling fallback active');

    const poll = async () => {
      if (!mountedRef.current) return;
      try {
        const res  = await fetch(`${BACKEND_URL}/api/orders/${order._id}/driver-location`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.location) {
            handleLocation({ lat: data.location.lat, lng: data.location.lng, driverName: data.driverName });
          }
        }
      } catch (_) { /* server may be waking */ }
    };

    poll();
    pollTimer.current = setInterval(poll, 5000);
  }, [order._id, handleLocation]);

  // ══════════ WEBSOCKET ══════════
  const connectWS = useCallback(() => {
    if (!mountedRef.current) return;
    setWsStatus('connecting');

    try {
      const ws = new WebSocket(WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        console.log('📡 WS connected');
        attemptRef.current = 0;
        setWsStatus('live');
        stopPolling();

        // Subscribe — matches what trackingService now handles
        ws.send(JSON.stringify({
          type:    'ADMIN_SUBSCRIBE_ORDER',
          orderId: order._id,
        }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

          if (msg.type === 'DRIVER_LOCATION_UPDATE' && msg.orderId === order._id) {
            handleLocation({
              lat:        msg.location.lat,
              lng:        msg.location.lng,
              driverName: msg.driverName,
            });
          }

          if (
            (msg.type === 'DELIVERY_STATUS_UPDATE' || msg.type === 'delivery:status:update') &&
            msg.orderId === order._id &&
            msg.status  === 'Delivered'
          ) {
            onClose();
          }
        } catch (err) { console.error('WS msg error:', err); }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setWsStatus('polling');
        attemptRef.current += 1;
        const delay = getBackoffDelay(attemptRef.current);
        console.log(`WS closed — retry #${attemptRef.current} in ${delay / 1000}s`);
        startPolling();
        reconnectTimer.current = setTimeout(connectWS, delay);
      };

      ws.onerror = () => { /* onclose fires after, handles retry */ };
    } catch (err) {
      console.error('WS init error:', err);
      startPolling();
    }
  }, [order._id, handleLocation, startPolling, stopPolling, onClose]);

  useEffect(() => {
    mountedRef.current = true;
    connectWS();
    return () => {
      mountedRef.current = false;
      socketRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      stopPolling();
    };
  }, []);

  // ══════════ STATUS BADGE ══════════
  const badges = {
    connecting: { bg: 'rgba(234,179,8,0.15)',   color: '#eab308', border: '#eab308', anim: true,  label: 'Connecting…' },
    live:       { bg: 'rgba(16,185,129,0.15)',   color: '#10b981', border: '#10b981', anim: true,  label: '● Live'      },
    polling:    { bg: 'rgba(99,102,241,0.15)',   color: '#818cf8', border: '#818cf8', anim: true,  label: '⟳ Syncing'  },
    error:      { bg: 'rgba(239,68,68,0.15)',    color: '#ef4444', border: '#ef4444', anim: false, label: 'Offline'     },
  };
  const badge = badges[wsStatus] || badges.connecting;

  // ══════════ RENDER ══════════
  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)',
        display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:'1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background:'#0d1117', borderRadius:'12px', width:'100%', maxWidth:'960px',
          maxHeight:'95vh', overflow:'hidden', display:'flex', flexDirection:'column',
          border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div style={{ padding:'1.25rem 1.75rem', borderBottom:'1px solid rgba(255,255,255,0.08)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background:'rgba(255,255,255,0.015)', flexWrap:'wrap', gap:'0.75rem' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
              <h2 style={{ margin:0, color:'#fff', fontSize:'1.2rem', fontWeight:700 }}>
                🗺️ Live Order Tracking
              </h2>
              <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:700,
                background:badge.bg, color:badge.color, border:`1px solid ${badge.border}`,
                display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:badge.color,
                  animation: badge.anim ? 'liveBlip 1.5s infinite' : 'none' }} />
                {badge.label}
              </span>
            </div>
            <p style={{ margin:'4px 0 0', color:'#6b7280', fontSize:'0.85rem' }}>
              Order #{order._id?.slice(-8).toUpperCase()}
              {driverInfo?.name && <span style={{ color:'#10b981' }}> · 🚗 {driverInfo.name}</span>}
            </p>
          </div>
          <div style={{ display:'flex', gap:'1rem', alignItems:'center', flexWrap:'wrap' }}>
            {eta !== null && (
              <div style={{ padding:'7px 14px', background:'rgba(16,185,129,0.12)',
                border:'1px solid #10b981', borderRadius:'10px',
                color:'#10b981', fontWeight:700, fontSize:'0.875rem' }}>
                ETA ~{eta} min
              </div>
            )}
            {lastUpdate && (
              <div style={{ color:'#4b5563', fontSize:'0.78rem' }}>
                Updated {lastUpdate.toLocaleTimeString()}
              </div>
            )}
            <button onClick={onClose}
              style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)',
                color:'#fff', width:'34px', height:'34px', borderRadius:'50%',
                cursor:'pointer', fontSize:'1.25rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
              ×
            </button>
          </div>
        </div>

        {/* ── WAITING BANNER ── */}
        {!hasDriverPos && (
          <div style={{ padding:'11px 20px', background:'rgba(99,102,241,0.1)',
            borderBottom:'1px solid rgba(99,102,241,0.2)',
            display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'14px', height:'14px', borderRadius:'50%',
              border:'2px solid rgba(99,102,241,0.3)', borderTopColor:'#818cf8',
              animation:'spin 0.9s linear infinite', flexShrink:0 }} />
            <span style={{ color:'#a5b4fc', fontSize:'13px' }}>
              Waiting for driver GPS signal — the map will update as soon as your driver starts moving.
            </span>
          </div>
        )}

        {/* ── MAP ── */}
        <div ref={mapRef} style={{ height:'440px', minHeight:'440px', flex:1 }} />

        {/* ── FOOTER ── */}
        <div style={{ padding:'1rem 1.75rem', borderTop:'1px solid rgba(255,255,255,0.08)',
          background:'rgba(255,255,255,0.015)',
          display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'1rem' }}>
          <div>
            <div style={{ fontSize:'0.72rem', color:'#4b5563', marginBottom:'3px', textTransform:'uppercase' }}>Delivery Address</div>
            <div style={{ fontWeight:500, color:'#e5e7eb', fontSize:'0.83rem' }}>{order.address?.street || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize:'0.72rem', color:'#4b5563', marginBottom:'3px', textTransform:'uppercase' }}>Order Total</div>
            <div style={{ fontWeight:700, color:'#10b981', fontSize:'1.05rem' }}>KSH {order.totalAmount?.toLocaleString()}</div>
          </div>
          {deliveryLat && deliveryLng && (
            <div style={{ display:'flex', alignItems:'flex-end' }}>
              <button
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${deliveryLat},${deliveryLng}`, '_blank')}
                style={{ width:'100%', padding:'10px',
                  background:'linear-gradient(135deg,#4285F4,#34A853)',
                  color:'white', border:'none', borderRadius:'8px',
                  fontWeight:700, cursor:'pointer', fontSize:'0.85rem' }}>
                🗺️ Open in Google Maps
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes liveBlip { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(1.4)} }
        @keyframes livePing  { 75%,100%{transform:scale(2.2);opacity:0} }
        @keyframes spin      { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
};

export default LiveTracking;
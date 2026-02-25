// backend/services/trackingService.js
// ═══════════════════════════════════════════════════════════════════════════════
// Real-time GPS tracking — bridges raw WebSocket clients (driver app + customer
// LiveTracking) with Socket.IO named-event clients (admin panel).
//
// ROOT CAUSE FIXED:
//   Driver app uses:  new WebSocket(url)  →  sends { type: 'DRIVER_LOCATION_UPDATE', ... }
//   Old service used: socket.on('driver:location:update', ...)  ← NEVER matched
//
//   Raw WebSocket frames arrive on the 'message' event in Socket.IO.
//   We parse those AND keep named-event handlers so both client types work.
// ═══════════════════════════════════════════════════════════════════════════════

let io;

// ── Connection maps ────────────────────────────────────────────────────────────
const adminClients    = new Map(); // socketId → socket
const driverClients   = new Map(); // driverId → socket
const customerClients = new Map(); // userId   → socket
const orderSubscriptions = new Map(); // orderId → Set<socketId>

// ── In-memory location cache ───────────────────────────────────────────────────
// Written every time a DRIVER_LOCATION_UPDATE arrives.
// Read by REST polling endpoint GET /api/orders/:id/driver-location.
export const driverLocationCache = {};

// ── Helpers ────────────────────────────────────────────────────────────────────
const addSubscriber = (orderId, socketId) => {
  if (!orderSubscriptions.has(orderId)) orderSubscriptions.set(orderId, new Set());
  orderSubscriptions.get(orderId).add(socketId);
};

const removeSubscriber = (orderId, socketId) => {
  const subs = orderSubscriptions.get(orderId);
  if (!subs) return;
  subs.delete(socketId);
  if (subs.size === 0) orderSubscriptions.delete(orderId);
};

// Send to ALL sockets subscribed to an order EXCEPT the sender
const relayToOrder = (orderId, senderSocketId, rawPayload, namedEvent, namedPayload) => {
  const subs = orderSubscriptions.get(orderId);
  if (!subs) return;
  subs.forEach((sid) => {
    if (sid === senderSocketId) return; // don't echo back
    const sock = io?.sockets?.sockets?.get(sid);
    if (!sock) return;
    // Raw WS clients receive 'message' event with JSON string
    sock.emit('message', typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload));
    // Socket.IO clients receive named events
    if (namedEvent) sock.emit(namedEvent, namedPayload || rawPayload);
  });
};

// ── Core message dispatcher ────────────────────────────────────────────────────
// Called for BOTH raw WebSocket 'message' events AND Socket.IO named events.
const dispatch = (socket, msg) => {
  const { type } = msg;

  // ── DRIVER_REGISTER ─────────────────────────────────────────────────────────
  if (type === 'DRIVER_REGISTER') {
    const { driverId, driverName } = msg;
    driverClients.set(driverId, socket);
    socket.role       = 'driver';
    socket.driverId   = driverId;
    socket.driverName = driverName;
    console.log(`🚗 Driver registered: ${driverName} (${driverId})`);

    // ACK in raw format so driver app console confirms connection
    socket.emit('message', JSON.stringify({
      type: 'DRIVER_REGISTERED',
      driverId,
      driverName,
      timestamp: new Date().toISOString(),
    }));
    socket.emit('driver:registered', { driverId, driverName, timestamp: new Date().toISOString() });
    return;
  }

  // ── DRIVER_LOCATION_UPDATE ──────────────────────────────────────────────────
  if (type === 'DRIVER_LOCATION_UPDATE') {
    const { orderId, location, driverId, driverName } = msg;
    const resolvedDriverId   = driverId   || socket.driverId   || 'unknown';
    const resolvedDriverName = driverName || socket.driverName || 'Driver';

    if (!orderId || !location?.lat || !location?.lng) {
      console.warn('⚠️  DRIVER_LOCATION_UPDATE missing orderId or location');
      return;
    }

    // 1. Update in-memory cache (read by REST polling fallback)
    driverLocationCache[orderId] = {
      lat:        location.lat,
      lng:        location.lng,
      driverName: resolvedDriverName,
      updatedAt:  new Date(),
    };

    console.log(
      `📍 ${resolvedDriverName}: [${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}] → order ${orderId.slice(-6)}`
    );

    // 2. Build the outbound payloads
    const rawOut = JSON.stringify({
      type:       'DRIVER_LOCATION_UPDATE',
      orderId,
      driverId:   resolvedDriverId,
      driverName: resolvedDriverName,
      location,
      timestamp:  new Date().toISOString(),
    });
    const namedOut = {
      type: 'location:update', orderId,
      driverId: resolvedDriverId, driverName: resolvedDriverName,
      location, timestamp: new Date().toISOString(),
    };

    // 3. Relay to all order subscribers (customers + watching admins)
    relayToOrder(orderId, socket.id, rawOut, 'driver:location:update', namedOut);

    // 4. Also push to all-watching admins who aren't subscribed to a specific order
    adminClients.forEach((adminSock) => {
      if (adminSock.watchAll && adminSock.id !== socket.id) {
        adminSock.emit('message', rawOut);
        adminSock.emit('driver:location:update', namedOut);
      }
    });
    return;
  }

  // ── ADMIN_SUBSCRIBE_ORDER (raw WS name used by customer LiveTracking.jsx) ───
  if (type === 'ADMIN_SUBSCRIBE_ORDER') {
    const { orderId } = msg;
    if (!orderId) return;

    addSubscriber(orderId, socket.id);
    socket.role = socket.role || 'subscriber';
    socket.subscribedOrder = orderId;
    adminClients.set(socket.id, socket);

    console.log(`👁️  Socket ${socket.id} (${socket.role}) subscribed to order ${orderId.slice(-6)}`);

    // ACK in raw format
    socket.emit('message', JSON.stringify({
      type: 'SUBSCRIBED', orderId, timestamp: new Date().toISOString(),
    }));
    socket.emit('subscribed', { orderId, timestamp: new Date().toISOString() });

    // Immediately send cached location if we have one
    const cached = driverLocationCache[orderId];
    if (cached) {
      console.log(`📦 Sending cached location for order ${orderId.slice(-6)}`);
      const cachedMsg = JSON.stringify({
        type:       'DRIVER_LOCATION_UPDATE',
        orderId,
        driverName: cached.driverName,
        location:   { lat: cached.lat, lng: cached.lng },
        timestamp:  cached.updatedAt.toISOString(),
      });
      socket.emit('message', cachedMsg);
      socket.emit('driver:location:update', {
        type: 'location:update', orderId,
        driverName: cached.driverName,
        location: { lat: cached.lat, lng: cached.lng },
        timestamp: cached.updatedAt.toISOString(),
      });
    }
    return;
  }

  // ── DELIVERY_STATUS_UPDATE ──────────────────────────────────────────────────
  if (type === 'DELIVERY_STATUS_UPDATE') {
    const { orderId, status, driverId } = msg;
    const rawOut = JSON.stringify({ type, orderId, status, driverId, timestamp: new Date().toISOString() });
    relayToOrder(orderId, socket.id, rawOut, 'delivery:status:update', { orderId, status, driverId });
    adminClients.forEach((s) => {
      s.emit('message', rawOut);
      s.emit('delivery:status:update', { orderId, status, driverId });
    });
    return;
  }
};

// ── Initialize ─────────────────────────────────────────────────────────────────
export const initializeTracking = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log('📡 New connection:', socket.id);

    // ════════════════════════════════════════════════════════
    // RAW WEBSOCKET messages — driver app + customer LiveTracking
    // Socket.IO delivers plain WS frames as the 'message' event.
    // ════════════════════════════════════════════════════════
    socket.on('message', (data) => {
      try {
        const msg = typeof data === 'string' ? JSON.parse(data) : data;
        dispatch(socket, msg);
      } catch (err) {
        console.error('❌ Bad WS message:', err.message);
      }
    });

    // ════════════════════════════════════════════════════════
    // SOCKET.IO NAMED EVENTS — admin panel / future clients
    // ════════════════════════════════════════════════════════
    socket.on('driver:register',        (d) => dispatch(socket, { type: 'DRIVER_REGISTER',        ...d }));
    socket.on('driver:location:update', (d) => dispatch(socket, { type: 'DRIVER_LOCATION_UPDATE', ...d }));
    socket.on('admin:subscribe:order',  (d) => dispatch(socket, { type: 'ADMIN_SUBSCRIBE_ORDER',  ...d }));
    socket.on('delivery:status:update', (d) => dispatch(socket, { type: 'DELIVERY_STATUS_UPDATE', ...d }));

    // Admin watch-all  
    socket.on('admin:watch:all', () => {
      adminClients.set(socket.id, socket);
      socket.role     = 'admin';
      socket.watchAll = true;
      console.log(`👁️  Admin ${socket.id} watching all deliveries`);
      socket.emit('watching:all', { timestamp: new Date().toISOString() });
    });

    // Customer subscribe (Socket.IO style, keeps backward compat)
    socket.on('customer:subscribe:order', ({ orderId, userId }) => {
      customerClients.set(userId, socket);
      socket.role           = 'customer';
      socket.userId         = userId;
      socket.subscribedOrder = orderId;
      addSubscriber(orderId, socket.id);
      console.log(`👤 Customer ${userId} subscribed to order ${orderId.slice(-6)}`);
      socket.emit('subscribed', { orderId, timestamp: new Date().toISOString() });
    });

    // Ping/pong
    socket.on('ping', () => socket.emit('pong', { timestamp: new Date().toISOString() }));

    // ════════════════════════════════════════════════════════
    // DISCONNECT cleanup
    // ════════════════════════════════════════════════════════
    socket.on('disconnect', () => {
      console.log(`📡 Disconnected: ${socket.id} (${socket.role || 'unknown'})`);

      if (socket.subscribedOrder) removeSubscriber(socket.subscribedOrder, socket.id);
      adminClients.delete(socket.id);
      if (socket.driverId)  driverClients.delete(socket.driverId);
      if (socket.userId)    customerClients.delete(socket.userId);
    });

    socket.on('error', (err) => console.error(`❌ Socket error (${socket.id}):`, err.message));
  });

  setInterval(() => {
    console.log(
      `📊 WS — admins:${adminClients.size} drivers:${driverClients.size}` +
      ` customers:${customerClients.size} subscriptions:${orderSubscriptions.size}` +
      ` cache:${Object.keys(driverLocationCache).length}`
    );
  }, 60000);
};

// ── Called from HTTP routes ────────────────────────────────────────────────────
export const broadcastNewOrder = (orderData) => {
  if (!io) return;
  const rawMsg = JSON.stringify({ type: 'NEW_ORDER_AVAILABLE', ...orderData, timestamp: new Date().toISOString() });
  console.log(`📢 Broadcasting order to ${driverClients.size} drivers`);
  driverClients.forEach((sock) => {
    sock.emit('message',         rawMsg);         // raw WS (driver app)
    sock.emit('order:available', orderData);       // Socket.IO
  });
};

export const notifyStatusChange = (orderId, status, driverId) => {
  if (!io) return;
  const rawMsg  = JSON.stringify({ type: 'DELIVERY_STATUS_UPDATE', orderId, status, driverId, timestamp: new Date().toISOString() });
  const payload = { orderId, status, driverId, timestamp: new Date().toISOString() };
  console.log(`📦 Status: ${orderId.slice(-6)} → ${status}`);

  const subs = orderSubscriptions.get(orderId);
  if (subs) {
    subs.forEach((sid) => {
      const sock = io?.sockets?.sockets?.get(sid);
      if (sock) {
        sock.emit('message', rawMsg);
        sock.emit('delivery:status:update', payload);
        sock.emit('DELIVERY_STATUS_UPDATE',  payload); // extra alias for LiveTracking.jsx
      }
    });
  }
  adminClients.forEach((sock) => {
    sock.emit('message', rawMsg);
    sock.emit('delivery:status:update', payload);
  });
};

export const getStats = () => ({
  adminClients:        adminClients.size,
  driverClients:       driverClients.size,
  customerClients:     customerClients.size,
  activeSubscriptions: orderSubscriptions.size,
  cachedOrders:        Object.keys(driverLocationCache).length,
});

export default { initializeTracking, broadcastNewOrder, notifyStatusChange, getStats };
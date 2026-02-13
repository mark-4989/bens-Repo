// backend/services/trackingService.js
// Real-time GPS tracking service for e-commerce delivery system

let io;

// Track connections by role
const adminClients = new Map();      // socketId → socket (admins watching deliveries)
const driverClients = new Map();     // driverId → socket (drivers sending GPS)
const customerClients = new Map();   // userId → socket (customers tracking orders)
const orderSubscriptions = new Map(); // orderId → Set of socketIds

/**
 * Initialize Socket.IO tracking service
 * @param {Server} socketIo - Socket.IO server instance
 */
export const initializeTracking = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log('📡 New Socket.IO connection:', socket.id);

    // ════════════════════════════════════════════════════
    // ADMIN: SUBSCRIBE TO SPECIFIC ORDER
    // ════════════════════════════════════════════════════
    socket.on('admin:subscribe:order', (data) => {
      const { orderId } = data;
      
      adminClients.set(socket.id, socket);
      socket.role = 'admin';
      socket.subscribedOrder = orderId;
      
      // Add to order subscriptions
      if (!orderSubscriptions.has(orderId)) {
        orderSubscriptions.set(orderId, new Set());
      }
      orderSubscriptions.get(orderId).add(socket.id);
      
      console.log(`👁️  Admin ${socket.id} subscribed to order: ${orderId}`);
      
      socket.emit('subscribed', {
        orderId,
        timestamp: new Date().toISOString()
      });
    });

    // ════════════════════════════════════════════════════
    // ADMIN: WATCH ALL DELIVERIES
    // ════════════════════════════════════════════════════
    socket.on('admin:watch:all', () => {
      adminClients.set(socket.id, socket);
      socket.role = 'admin';
      socket.watchAll = true;
      
      console.log(`👁️  Admin ${socket.id} watching all deliveries`);
      
      socket.emit('watching:all', {
        timestamp: new Date().toISOString()
      });
    });

    // ════════════════════════════════════════════════════
    // CUSTOMER: SUBSCRIBE TO THEIR ORDER
    // ════════════════════════════════════════════════════
    socket.on('customer:subscribe:order', (data) => {
      const { orderId, userId } = data;
      
      customerClients.set(userId, socket);
      socket.role = 'customer';
      socket.userId = userId;
      socket.subscribedOrder = orderId;
      
      // Add to order subscriptions
      if (!orderSubscriptions.has(orderId)) {
        orderSubscriptions.set(orderId, new Set());
      }
      orderSubscriptions.get(orderId).add(socket.id);
      
      console.log(`👤 Customer ${userId} subscribed to order: ${orderId}`);
      
      socket.emit('subscribed', {
        orderId,
        timestamp: new Date().toISOString()
      });
    });

    // ════════════════════════════════════════════════════
    // DRIVER: REGISTER
    // ════════════════════════════════════════════════════
    socket.on('driver:register', (data) => {
      const { driverId, driverName } = data;
      
      driverClients.set(driverId, socket);
      socket.role = 'driver';
      socket.driverId = driverId;
      socket.driverName = driverName;
      
      console.log(`🚗 Driver registered: ${driverName} (${driverId})`);
      
      socket.emit('driver:registered', {
        driverId,
        driverName,
        timestamp: new Date().toISOString()
      });
    });

    // ════════════════════════════════════════════════════
    // DRIVER: SEND GPS LOCATION UPDATE
    // ════════════════════════════════════════════════════
    socket.on('driver:location:update', (data) => {
      const { driverId, orderId, location } = data;
      const driverName = socket.driverName || 'Driver';
      
      const payload = {
        type: 'location:update',
        driverId,
        driverName,
        orderId,
        location, // { lat, lng }
        timestamp: new Date().toISOString()
      };

      // Log location update
      if (location?.lat && location?.lng) {
        console.log(
          `📍 Location from ${driverName}: [${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}] for order ${orderId}`
        );
      }

      // Broadcast to all subscribers of this order
      const subscribers = orderSubscriptions.get(orderId);
      if (subscribers) {
        subscribers.forEach((subscriberSocketId) => {
          const subscriberSocket = io.sockets.sockets.get(subscriberSocketId);
          if (subscriberSocket) {
            subscriberSocket.emit('driver:location:update', payload);
          }
        });
      }

      // Broadcast to all-watching admins
      adminClients.forEach((adminSocket) => {
        if (adminSocket.watchAll) {
          adminSocket.emit('driver:location:update', payload);
        }
      });
    });

    // ════════════════════════════════════════════════════
    // DELIVERY STATUS UPDATE
    // ════════════════════════════════════════════════════
    socket.on('delivery:status:update', (data) => {
      const { orderId, status, driverId } = data;
      
      const payload = {
        type: 'status:update',
        orderId,
        status,
        driverId,
        timestamp: new Date().toISOString()
      };

      console.log(`📦 Delivery status update: ${orderId} → ${status}`);

      // Broadcast to all subscribers of this order
      const subscribers = orderSubscriptions.get(orderId);
      if (subscribers) {
        subscribers.forEach((subscriberSocketId) => {
          const subscriberSocket = io.sockets.sockets.get(subscriberSocketId);
          if (subscriberSocket) {
            subscriberSocket.emit('delivery:status:update', payload);
          }
        });
      }

      // Broadcast to all admins
      adminClients.forEach((adminSocket) => {
        adminSocket.emit('delivery:status:update', payload);
      });
    });

    // ════════════════════════════════════════════════════
    // NEW ORDER NOTIFICATION (from admin broadcast)
    // ════════════════════════════════════════════════════
    socket.on('order:broadcast', (data) => {
      const { orderId, orderNumber, customerName, address, totalAmount } = data;
      
      const payload = {
        type: 'order:available',
        orderId,
        orderNumber,
        customerName,
        address,
        totalAmount,
        timestamp: new Date().toISOString()
      };

      console.log(`📢 Broadcasting new order ${orderNumber} to all drivers`);

      // Broadcast to all connected drivers
      driverClients.forEach((driverSocket) => {
        driverSocket.emit('order:available', payload);
      });
    });

    // ════════════════════════════════════════════════════
    // PING/PONG FOR CONNECTION HEALTH
    // ════════════════════════════════════════════════════
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // ════════════════════════════════════════════════════
    // DISCONNECT HANDLER
    // ════════════════════════════════════════════════════
    socket.on('disconnect', () => {
      console.log(`📡 Socket disconnected: ${socket.id} (${socket.role || 'unknown'})`);

      // Clean up admin
      if (socket.role === 'admin') {
        adminClients.delete(socket.id);
        
        // Clean up order subscriptions
        if (socket.subscribedOrder) {
          const subs = orderSubscriptions.get(socket.subscribedOrder);
          if (subs) {
            subs.delete(socket.id);
            if (subs.size === 0) {
              orderSubscriptions.delete(socket.subscribedOrder);
            }
          }
        }
      }

      // Clean up driver
      if (socket.role === 'driver' && socket.driverId) {
        driverClients.delete(socket.driverId);
        console.log(`🚗 Driver disconnected: ${socket.driverId}`);
      }

      // Clean up customer
      if (socket.role === 'customer' && socket.userId) {
        customerClients.delete(socket.userId);
        
        // Clean up order subscriptions
        if (socket.subscribedOrder) {
          const subs = orderSubscriptions.get(socket.subscribedOrder);
          if (subs) {
            subs.delete(socket.id);
            if (subs.size === 0) {
              orderSubscriptions.delete(socket.subscribedOrder);
            }
          }
        }
        console.log(`👤 Customer disconnected: ${socket.userId}`);
      }
    });

    // ════════════════════════════════════════════════════
    // ERROR HANDLER
    // ════════════════════════════════════════════════════
    socket.on('error', (error) => {
      console.error(`❌ Socket error (${socket.id}):`, error.message);
    });
  });

  // Log stats every 60 seconds
  setInterval(() => {
    console.log(`
📊 Socket.IO Stats:
   • Admin clients: ${adminClients.size}
   • Driver clients: ${driverClients.size}
   • Customer clients: ${customerClients.size}
   • Active subscriptions: ${orderSubscriptions.size}
    `);
  }, 60000);
};

/**
 * Broadcast new order to all drivers (called from HTTP route)
 */
export const broadcastNewOrder = (orderData) => {
  if (!io) return;

  const payload = {
    type: 'order:available',
    ...orderData,
    timestamp: new Date().toISOString()
  };

  console.log(`📢 Broadcasting new order ${orderData.orderNumber} to ${driverClients.size} drivers`);

  driverClients.forEach((driverSocket) => {
    driverSocket.emit('order:available', payload);
  });
};

/**
 * Notify status change (called from HTTP route)
 */
export const notifyStatusChange = (orderId, status, driverId) => {
  if (!io) return;

  const payload = {
    type: 'status:update',
    orderId,
    status,
    driverId,
    timestamp: new Date().toISOString()
  };

  console.log(`📦 Notifying status change: ${orderId} → ${status}`);

  // Notify subscribers
  const subscribers = orderSubscriptions.get(orderId);
  if (subscribers) {
    subscribers.forEach((subscriberSocketId) => {
      const socket = io.sockets.sockets.get(subscriberSocketId);
      if (socket) {
        socket.emit('delivery:status:update', payload);
      }
    });
  }

  // Notify all admins
  adminClients.forEach((adminSocket) => {
    adminSocket.emit('delivery:status:update', payload);
  });
};

/**
 * Get connection stats
 */
export const getStats = () => {
  return {
    adminClients: adminClients.size,
    driverClients: driverClients.size,
    customerClients: customerClients.size,
    activeSubscriptions: orderSubscriptions.size,
  };
};

export default {
  initializeTracking,
  broadcastNewOrder,
  notifyStatusChange,
  getStats,
};
// backend/routes/OrderRoute.js
// ─── REPLACE your existing OrderRoute.js with this ──────────────────────────
// KEY ADDITIONS: notification triggers at every lifecycle event
import express from 'express';
import adminAuth from '../middleware/requireAdmin.js';
import { verifyClerkToken } from '../middleware/verifyClerkToken.js';
import Order from '../models/OrderModel.js';
import { broadcastNewOrder, notifyStatusChange, driverLocationCache } from '../services/trackingService.js';
import {
  notifyOrderPlaced,
  notifyOrderPacked,
  notifyDriverOnRoute,
  notifyOrderDelivered,
  notifyOrderCancelled,
  notifyDriverAssigned,
} from '../controllers/NotificationController.js';

const orderRouter = express.Router();

// ✅ Health check
orderRouter.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Order routes working!',
    endpoints: {
      admin:  ['GET /api/orders/all', 'GET /api/orders/:id', 'PUT /api/orders/:id/status', 'PUT /api/orders/:id/payment', 'PUT /api/orders/:id/assign-driver', 'POST /api/orders/:id/broadcast', 'DELETE /api/orders/:id'],
      driver: ['POST /api/orders/driver/login', 'GET /api/orders/driver/available', 'GET /api/orders/driver/mine', 'PUT /api/orders/driver/:id/accept', 'PUT /api/orders/driver/:id/status'],
      client: ['POST /api/orders/create', 'GET /api/orders/user', 'PUT /api/orders/:id/cancel', 'GET /api/orders/:id/driver-location'],
    },
  });
});

// ════════════════════════════════════════════════
// CLIENT ROUTES
// ════════════════════════════════════════════════

// ✅ Create order — fires "order_placed" notification
orderRouter.post('/create', verifyClerkToken, async (req, res) => {
  try {
    const { products, totalAmount, paymentMethod, deliveryInfo } = req.body;

    if (!products || !totalAmount || !deliveryInfo) {
      return res.status(400).json({ success: false, message: 'Missing required fields: products, totalAmount, or deliveryInfo' });
    }
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'Products must be a non-empty array' });
    }

    const formattedItems = products.map((item) => ({
      productId: item.productId || item._id,
      name:      item.name,
      price:     item.price,
      quantity:  item.quantity,
      size:      item.size || 'N/A',
      image:     item.image || '',
    }));

    const newOrder = new Order({
      userId:       req.userId,
      customerName: `${deliveryInfo.firstName} ${deliveryInfo.lastName}`,
      email:        deliveryInfo.email,
      phone:        deliveryInfo.phone,
      address: {
        street:       deliveryInfo.street,
        city:         deliveryInfo.city,
        state:        deliveryInfo.state       || '',
        zipcode:      deliveryInfo.zipcode     || '',
        country:      deliveryInfo.country     || '',
        latitude:     deliveryInfo.latitude,
        longitude:    deliveryInfo.longitude,
        locationType: deliveryInfo.locationType,
      },
      items:         formattedItems,
      totalAmount,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: 'Pending',
      status:        'Order Received',
      cancellable:   true,
    });

    await newOrder.save();
    console.log('✅ Order created:', newOrder._id);

    // 🔔 Notify customer their order was placed
    await notifyOrderPlaced(newOrder);

    res.json({
      success: true,
      message: 'Order placed successfully!',
      order: {
        orderId:       newOrder._id,
        status:        newOrder.status,
        totalAmount:   newOrder.totalAmount,
        paymentMethod: newOrder.paymentMethod,
        createdAt:     newOrder.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
  }
});

// ✅ Get user's own orders
orderRouter.get('/user', verifyClerkToken, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message });
  }
});

// ✅ Cancel order — fires "order_cancelled" notification
orderRouter.put('/:id/cancel', verifyClerkToken, async (req, res) => {
  try {
    const { id }  = req.params;
    const order   = await Order.findOne({ _id: id, userId: req.userId });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!order.cancellable || order.status === 'Delivered' || order.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'This order cannot be cancelled' });
    }

    order.status      = 'Cancelled';
    order.cancellable = false;
    await order.save();

    // 🔔 Notify customer
    await notifyOrderCancelled(order, 'Cancelled by customer');

    res.json({ success: true, message: 'Order cancelled', order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel order', error: error.message });
  }
});

// ════════════════════════════════════════════════
// PUBLIC POLLING FALLBACK
// ════════════════════════════════════════════════
orderRouter.get('/:id/driver-location', async (req, res) => {
  try {
    const { id } = req.params;
    const cached = driverLocationCache[id];
    if (cached) {
      return res.json({ success: true, location: { lat: cached.lat, lng: cached.lng }, driverName: cached.driverName || null, updatedAt: cached.updatedAt, source: 'cache' });
    }

    const order = await Order.findById(id).select('status driver currentDriverLocation trackingEnabled').lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'Cargo on Route') return res.json({ success: false, message: 'Order not currently on route' });

    const loc = order.currentDriverLocation;
    if (loc?.latitude && loc?.longitude) {
      return res.json({ success: true, location: { lat: loc.latitude, lng: loc.longitude }, driverName: order.driver?.name || null, updatedAt: loc.timestamp || null, source: 'db' });
    }

    return res.json({ success: true, location: null, message: 'Waiting for driver GPS signal' });
  } catch (error) {
    console.error('❌ driver-location poll error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ════════════════════════════════════════════════
// DRIVER ROUTES
// ════════════════════════════════════════════════
const driverAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Driver not authenticated' });
  const token = header.split(' ')[1];
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [driverId, phone] = decoded.split(':');
    req.driverId    = driverId;
    req.driverPhone = phone;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid driver token' });
  }
};

// Driver login (unchanged)
orderRouter.post('/driver/login', async (req, res) => {
  try {
    const { driverId, phone } = req.body;
    if (!driverId || !phone) return res.status(400).json({ success: false, message: 'driverId and phone required' });
    const token = Buffer.from(`${driverId}:${phone}`).toString('base64');
    res.json({ success: true, token, driverId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Driver login failed' });
  }
});

// Driver available orders
orderRouter.get('/driver/available', driverAuth, async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ 'driver.id': null }, { 'driver.id': { $exists: false } }, { 'driver.id': '' }],
      status: { $in: ['Order Received', 'Cargo Packed'] },
    }).sort({ createdAt: 1 });
    res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch available orders' });
  }
});

// Driver's own orders
orderRouter.get('/driver/mine', driverAuth, async (req, res) => {
  try {
    const orders = await Order.find({ 'driver.id': req.driverId }).sort({ createdAt: -1 });
    res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch your orders' });
  }
});

// Driver accepts order — fires "order_on_route" notification
orderRouter.put('/driver/:id/accept', driverAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { driverName, driverPhone, vehicleType } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.driver?.id) return res.status(409).json({ success: false, message: 'Order already taken' });

    const updated = await Order.findByIdAndUpdate(
      id,
      {
        status: 'Cargo on Route', cancellable: false,
        driver: { id: req.driverId, name: driverName || `Driver (${req.driverPhone})`, phone: driverPhone || req.driverPhone, vehicle: vehicleType || 'motorcycle' },
        driverAssignedAt: new Date(), driverName: driverName || `Driver (${req.driverPhone})`, driverPhone: driverPhone || req.driverPhone, trackingEnabled: true,
      },
      { new: true }
    );

    notifyStatusChange(id, 'Cargo on Route', req.driverId);

    // 🔔 Notify customer driver is on the way
    await notifyDriverOnRoute(updated);

    res.json({ success: true, message: 'Order accepted! Start delivery.', order: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to accept order', error: error.message });
  }
});

// Driver updates status — fires "order_delivered" notification
orderRouter.put('/driver/:id/status', driverAuth, async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    if (!['Cargo on Route', 'Delivered'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status for driver' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: id, 'driver.id': req.driverId },
      { status, ...(status === 'Delivered' && { actualDeliveryTime: new Date(), trackingEnabled: false }) },
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, message: 'Order not found or not yours' });

    notifyStatusChange(id, status, req.driverId);

    // 🔔 Notify customer
    if (status === 'Delivered') {
      await notifyOrderDelivered(order);
      delete driverLocationCache[id];
    }

    res.json({ success: true, message: `Status updated to ${status}`, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
  }
});

// ════════════════════════════════════════════════
// ADMIN ROUTES
// ════════════════════════════════════════════════

orderRouter.get('/all', adminAuth, async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message });
  }
});

// Broadcast to driver app — fires "order_packed" notification
orderRouter.post('/:id/broadcast', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const order  = await Order.findByIdAndUpdate(
      id, { status: 'Cargo Packed', cancellable: false, 'driver.id': null }, { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    broadcastNewOrder({ orderId: id, orderNumber: id.slice(-8).toUpperCase(), customerName: order.customerName, address: order.address?.street, totalAmount: order.totalAmount });

    // 🔔 Notify customer order is packed
    await notifyOrderPacked(order);

    console.log(`📢 Order ${id} broadcasted to Driver App`);
    res.json({ success: true, message: 'Order broadcasted to Driver App', order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to broadcast', error: error.message });
  }
});

// Get single order
orderRouter.get('/:id', adminAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch order', error: error.message });
  }
});

// Update order status (Admin) — fires appropriate notification
orderRouter.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    const validStatuses = ['Order Received', 'Cargo Packed', 'Cargo on Route', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status value' });

    const order = await Order.findByIdAndUpdate(
      id, { status, cancellable: status === 'Order Received' || status === 'Cargo Packed' }, { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    notifyStatusChange(id, status, null);

    // 🔔 Fire appropriate notification per status
    if (status === 'Cargo Packed')    await notifyOrderPacked(order);
    if (status === 'Cargo on Route')  await notifyDriverOnRoute(order);
    if (status === 'Delivered')       await notifyOrderDelivered(order);
    if (status === 'Cancelled')       await notifyOrderCancelled(order, 'Cancelled by admin');

    res.json({ success: true, message: 'Status updated', order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
  }
});

// Manually assign driver (Admin) — fires "driver_assigned" notification
orderRouter.put('/:id/assign-driver', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId, driverName, driverPhone, vehicleType } = req.body;

    const order = await Order.findByIdAndUpdate(
      id,
      { status: 'Cargo on Route', cancellable: false, driver: { id: driverId, name: driverName, phone: driverPhone, vehicle: vehicleType }, driverAssignedAt: new Date(), driverName, driverPhone, trackingEnabled: true },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // 🔔 Notify customer a driver was assigned
    await notifyDriverAssigned(order);

    res.json({ success: true, message: 'Driver assigned', order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign driver', error: error.message });
  }
});

// Update payment status (Admin)
orderRouter.put('/:id/payment', adminAuth, async (req, res) => {
  try {
    const { id }            = req.params;
    const { paymentStatus } = req.body;
    const valid = ['Pending', 'Paid', 'Failed', 'Refunded'];
    if (!valid.includes(paymentStatus)) return res.status(400).json({ success: false, message: 'Invalid payment status' });

    const order = await Order.findByIdAndUpdate(id, { paymentStatus }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: 'Payment status updated', order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update payment status', error: error.message });
  }
});

// Delete order (Admin)
orderRouter.delete('/:id', adminAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'Cancelled') return res.status(400).json({ success: false, message: 'Only cancelled orders can be deleted' });
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete order', error: error.message });
  }
});

export default orderRouter;
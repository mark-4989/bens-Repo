// backend/controllers/NotificationController.js
// ═══════════════════════════════════════════════════════════════════
// Central notification engine. Called from:
//   - OrderRoute.js  (order placed, status changes, driver assigned)
//   - MpesaController.js  (payment success / failure)
//   - UserController.js   (sign-in welcome)
//   - DriverController.js (driver accepted order)
// ═══════════════════════════════════════════════════════════════════
import Notification from '../models/NotificationModel.js';

// ─── Notification type definitions ───────────────────────────────────────────
// Each entry maps a trigger event to an icon, title template & message template.
// Templates receive a `data` object and return a string.
const TEMPLATES = {
  welcome: {
    icon: '👋',
    title: () => 'Welcome back!',
    message: (d) => `Good to see you again, ${d.name || 'there'}! Browse our latest deals.`,
  },
  order_placed: {
    icon: '🛍️',
    title: () => 'Order Confirmed!',
    message: (d) =>
      `Your order #${d.orderId} for KSH ${d.totalAmount?.toLocaleString()} has been received. We're getting it ready!`,
  },
  order_packed: {
    icon: '📦',
    title: () => 'Order Packed',
    message: (d) =>
      `Your order #${d.orderId} has been packed and is waiting for pickup by a driver.`,
  },
  order_on_route: {
    icon: '🚗',
    title: () => 'Driver On The Way!',
    message: (d) =>
      `${d.driverName || 'Your driver'} is heading to you with order #${d.orderId}. ${d.driverPhone ? `Call them: ${d.driverPhone}` : ''}`.trim(),
  },
  order_delivered: {
    icon: '✅',
    title: () => 'Order Delivered!',
    message: (d) =>
      `Order #${d.orderId} has been delivered. Enjoy! Thank you for shopping with us.`,
  },
  order_cancelled: {
    icon: '❌',
    title: () => 'Order Cancelled',
    message: (d) =>
      `Order #${d.orderId} has been cancelled. ${d.reason ? `Reason: ${d.reason}` : 'Contact support if this was a mistake.'}`,
  },
  payment_success: {
    icon: '💳',
    title: () => 'Payment Successful',
    message: (d) =>
      `KSH ${d.amount?.toLocaleString()} received for order #${d.orderId}. Receipt: ${d.receipt || 'N/A'}`,
  },
  payment_failed: {
    icon: '⚠️',
    title: () => 'Payment Failed',
    message: (d) =>
      `Payment for order #${d.orderId} failed. ${d.reason || 'Please try again or use a different method.'}`,
  },
  payment_pending: {
    icon: '⏳',
    title: () => 'Payment Pending',
    message: (d) =>
      `Your M-Pesa prompt has been sent for order #${d.orderId}. Enter your PIN to complete payment.`,
  },
  driver_assigned: {
    icon: '🏍️',
    title: () => 'Driver Assigned',
    message: (d) =>
      `${d.driverName} has been assigned to your order #${d.orderId}. ${d.vehicle ? `Vehicle: ${d.vehicle}.` : ''}`,
  },
  promo: {
    icon: '🎉',
    title: (d) => d.promoTitle || 'Special Offer!',
    message: (d) => d.promoMessage || 'Check out our latest deals and promotions.',
  },
};

// ─── Core helper: create a single notification ───────────────────────────────
export const createNotification = async ({ userId, type, data = {}, orderId = null }) => {
  try {
    const template = TEMPLATES[type];
    if (!template) {
      console.warn(`⚠️ Unknown notification type: ${type}`);
      return null;
    }

    const notification = await Notification.create({
      userId,
      type,
      title:   template.title(data),
      message: template.message(data),
      icon:    template.icon,
      orderId: orderId || data.orderObjectId || null,
      read:    false,
      metadata: data,
    });

    console.log(`🔔 Notification [${type}] → user ${userId}`);
    return notification;
  } catch (error) {
    console.error('❌ createNotification error:', error.message);
    return null; // Never throw — notifications are non-critical
  }
};

// ─── Batch helper: notify multiple users at once ─────────────────────────────
export const createNotifications = async (notifications) => {
  return Promise.all(notifications.map(createNotification));
};

// ═══════════════════════════════════════════════════════════════════
// ORDER LIFECYCLE TRIGGERS
// Call these from OrderRoute.js after each state change
// ═══════════════════════════════════════════════════════════════════

/** Called right after order is saved in POST /api/orders/create */
export const notifyOrderPlaced = async (order) => {
  const shortId = order._id.toString().slice(-8).toUpperCase();
  await createNotification({
    userId:  order.userId,
    type:    'order_placed',
    orderId: order._id,
    data: {
      orderId:     shortId,
      totalAmount: order.totalAmount,
      orderObjectId: order._id,
    },
  });
};

/** Called when admin sets status → "Cargo Packed" (broadcast) */
export const notifyOrderPacked = async (order) => {
  const shortId = order._id.toString().slice(-8).toUpperCase();
  await createNotification({
    userId:  order.userId,
    type:    'order_packed',
    orderId: order._id,
    data:    { orderId: shortId, orderObjectId: order._id },
  });
};

/** Called when driver accepts order → status "Cargo on Route" */
export const notifyDriverOnRoute = async (order) => {
  const shortId = order._id.toString().slice(-8).toUpperCase();
  await createNotification({
    userId:  order.userId,
    type:    'order_on_route',
    orderId: order._id,
    data: {
      orderId:     shortId,
      driverName:  order.driver?.name || order.driverName,
      driverPhone: order.driver?.phone || order.driverPhone,
      orderObjectId: order._id,
    },
  });
};

/** Called when driver sets status → "Delivered" */
export const notifyOrderDelivered = async (order) => {
  const shortId = order._id.toString().slice(-8).toUpperCase();
  await createNotification({
    userId:  order.userId,
    type:    'order_delivered',
    orderId: order._id,
    data:    { orderId: shortId, orderObjectId: order._id },
  });
};

/** Called when order is cancelled (by user or admin) */
export const notifyOrderCancelled = async (order, reason = null) => {
  const shortId = order._id.toString().slice(-8).toUpperCase();
  await createNotification({
    userId:  order.userId,
    type:    'order_cancelled',
    orderId: order._id,
    data:    { orderId: shortId, reason, orderObjectId: order._id },
  });
};

/** Called when admin manually assigns a driver */
export const notifyDriverAssigned = async (order) => {
  const shortId = order._id.toString().slice(-8).toUpperCase();
  await createNotification({
    userId:  order.userId,
    type:    'driver_assigned',
    orderId: order._id,
    data: {
      orderId:    shortId,
      driverName: order.driver?.name || order.driverName,
      vehicle:    order.driver?.vehicle,
      orderObjectId: order._id,
    },
  });
};

// ═══════════════════════════════════════════════════════════════════
// PAYMENT TRIGGERS  (call from MpesaController)
// ═══════════════════════════════════════════════════════════════════

export const notifyPaymentSuccess = async (order, receipt) => {
  const shortId = order._id.toString().slice(-8).toUpperCase();
  await createNotification({
    userId:  order.userId,
    type:    'payment_success',
    orderId: order._id,
    data: {
      orderId:  shortId,
      amount:   order.totalAmount,
      receipt:  receipt || order.mpesaReceiptNumber,
      orderObjectId: order._id,
    },
  });
};

export const notifyPaymentFailed = async (order, reason) => {
  const shortId = order._id.toString().slice(-8).toUpperCase();
  await createNotification({
    userId:  order.userId,
    type:    'payment_failed',
    orderId: order._id,
    data:    { orderId: shortId, reason, orderObjectId: order._id },
  });
};

export const notifyPaymentPending = async (order) => {
  const shortId = order._id.toString().slice(-8).toUpperCase();
  await createNotification({
    userId:  order.userId,
    type:    'payment_pending',
    orderId: order._id,
    data:    { orderId: shortId, orderObjectId: order._id },
  });
};

// ═══════════════════════════════════════════════════════════════════
// AUTH TRIGGERS  (call from verifyClerkToken middleware or UserController)
// ═══════════════════════════════════════════════════════════════════

export const notifyWelcome = async (userId, name) => {
  // Only send welcome once per day (avoid spam on every page load)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await Notification.findOne({
    userId,
    type: 'welcome',
    createdAt: { $gte: today },
  });

  if (existing) return null; // Already welcomed today

  return createNotification({
    userId,
    type: 'welcome',
    data: { name },
  });
};

// ═══════════════════════════════════════════════════════════════════
// REST API HANDLERS  (mounted on NotificationRoute.js)
// ═══════════════════════════════════════════════════════════════════

/** GET /api/notifications */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const skip   = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, read: false }),
    ]);

    res.json({
      success: true,
      notifications,
      unreadCount,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('❌ getNotifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

/** GET /api/notifications/unread-count */
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.userId, read: false });
    res.json({ success: true, unreadCount: count });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get count' });
  }
};

/** PUT /api/notifications/:id/read */
export const markAsRead = async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { read: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, notification: n });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

/** PUT /api/notifications/mark-all-read */
export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId, read: false }, { read: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

/** DELETE /api/notifications/:id */
export const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
};

/** DELETE /api/notifications/clear-all */
export const clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.userId });
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to clear notifications' });
  }
};

/** POST /api/notifications/welcome  (called after Clerk sign-in webhook or first load) */
export const triggerWelcome = async (req, res) => {
  try {
    const userId = req.userId;
    const name   = req.body.name || req.user?.firstName || '';
    const n = await notifyWelcome(userId, name);
    res.json({ success: true, sent: !!n, notification: n });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send welcome' });
  }
};
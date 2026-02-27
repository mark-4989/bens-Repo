// backend/models/NotificationModel.js
// ─── REPLACE your existing NotificationModel.js with this ───────────────────
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'welcome',
        'order_placed',
        'order_packed',
        'order_on_route',
        'order_delivered',
        'order_cancelled',
        'driver_assigned',
        'payment_success',
        'payment_failed',
        'payment_pending',
        'promo',
        'general',
        // Keep legacy types for backward compat
        'payment_success',
        'new_payment',
        'order_status',
      ],
      required: true,
    },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    icon:    { type: String, default: '🔔' },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Order',
      default: null,
    },
    read:     { type: Boolean, default: false, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Compound index for user queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
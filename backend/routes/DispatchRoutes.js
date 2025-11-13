// backend/routes/DispatchRoutes.js
// Add this new file for WhatsApp dispatch functionality

import express from 'express';
import Order from '../models/OrderModel.js';

const dispatchRouter = express.Router();

/**
 * DISPATCH ORDER TO WHATSAPP GROUP
 * POST /api/dispatch/whatsapp
 * Body: { orderId, driverId, driverName, driverPhone, groupNumber }
 */
dispatchRouter.post('/whatsapp', async (req, res) => {
  try {
    const { orderId, driverId, driverName, driverPhone, groupNumber } = req.body;

    // Get order details
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Format order details for WhatsApp
    const orderSummary = `
🚚 *NEW DELIVERY ASSIGNMENT*

📦 *Order Details:*
Order ID: ${order._id.toString().slice(-8).toUpperCase()}
Total: KSH ${order.totalAmount?.toLocaleString()}
Items: ${order.items?.length || 0} item(s)
Payment: ${order.paymentMethod?.toUpperCase()} - ${order.paymentStatus}

📍 *Delivery Location:*
Customer: ${order.customerName || 'Customer'}
Phone: ${order.phone || 'N/A'}
Address: ${order.address?.street || ''}, ${order.address?.city || ''}
${order.deliveryInfo?.latitude ? `GPS: ${order.deliveryInfo.latitude}, ${order.deliveryInfo.longitude}` : ''}

👤 *Assigned Driver:*
Driver ID: ${driverId}
Name: ${driverName}
Phone: ${driverPhone}

🔗 *Driver App Link:*
${process.env.FRONTEND_URL || 'https://clientside-teal.vercel.app'}/driver/tracking

📝 *Instructions:*
1. Open the Driver App link above
2. Enter Driver ID: ${driverId}
3. Enter Order ID: ${order._id}
4. Click "Start Tracking"
5. Keep GPS on during delivery

⏰ Created: ${new Date().toLocaleString()}
    `.trim();

    // Create WhatsApp link
    const whatsappMessage = encodeURIComponent(orderSummary);
    const whatsappLink = groupNumber
      ? `https://wa.me/${groupNumber}?text=${whatsappMessage}`
      : `https://wa.me/?text=${whatsappMessage}`;

    // Update order with dispatch info
    await Order.findByIdAndUpdate(orderId, {
      $set: {
        'driver.id': driverId,
        'driver.name': driverName,
        'driver.phone': driverPhone,
        dispatchedAt: new Date(),
        dispatchedTo: 'WhatsApp',
        trackingEnabled: true
      }
    });

    console.log('✅ Order dispatched to WhatsApp:', orderId);

    res.json({
      success: true,
      message: 'Order prepared for WhatsApp dispatch',
      whatsappLink,
      orderSummary
    });

  } catch (error) {
    console.error('❌ Dispatch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dispatch order',
      error: error.message
    });
  }
});

/**
 * DISPATCH ORDER VIA SMS (Optional - requires Twilio/Africa's Talking)
 * POST /api/dispatch/sms
 */
dispatchRouter.post('/sms', async (req, res) => {
  try {
    const { orderId, driverPhone } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const message = `
New Delivery: Order #${order._id.toString().slice(-8).toUpperCase()}
Amount: KSH ${order.totalAmount}
Location: ${order.address?.city}
Track: ${process.env.FRONTEND_URL}/driver/tracking
Order ID: ${order._id}
    `.trim();

    // TODO: Integrate with SMS provider (Twilio, Africa's Talking, etc.)
    // For now, just return the message

    res.json({
      success: true,
      message: 'SMS dispatch prepared (integration needed)',
      smsContent: message,
      recipient: driverPhone
    });

  } catch (error) {
    console.error('❌ SMS dispatch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dispatch SMS',
      error: error.message
    });
  }
});

/**
 * GET DISPATCH HISTORY
 * GET /api/dispatch/history/:orderId
 */
dispatchRouter.get('/history/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      dispatch: {
        dispatchedAt: order.dispatchedAt,
        dispatchedTo: order.dispatchedTo,
        driver: order.driver,
        trackingEnabled: order.trackingEnabled
      }
    });

  } catch (error) {
    console.error('❌ History fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dispatch history',
      error: error.message
    });
  }
});

export default dispatchRouter;
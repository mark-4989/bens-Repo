// backend/controllers/MpesaController.js
import axios from 'axios';
import Order from '../models/OrderModel.js';
import Notification from '../models/NotificationModel.js';

/**
 * Generate M-Pesa Access Token
 */
const getAccessToken = async () => {
  try {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64');

    const url = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('❌ M-Pesa token error:', error.response?.data || error.message);
    throw new Error('Failed to get M-Pesa access token');
  }
};

/**
 * Generate Password for STK Push
 */
const generatePassword = () => {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64');
  
  return { password, timestamp };
};

/**
 * Initiate STK Push (Lipa Na M-Pesa)
 */
export const initiateSTKPush = async (req, res) => {
  try {
    const { orderId, phoneNumber } = req.body;
    const userId = req.userId;

    console.log('📱 Initiating STK Push for order:', orderId);

    // Validate inputs
    if (!orderId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and phone number are required'
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to user
    if (order.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this order'
      });
    }

    // Check if already paid
    if (order.paymentStatus === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }

    // Format phone number (remove + and ensure starts with 254)
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    }
    if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.slice(1);
    }

    console.log('📞 Formatted phone:', formattedPhone);

    // Get access token
    const accessToken = await getAccessToken();
    const { password, timestamp } = generatePassword();

    // STK Push request
    const url = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(order.totalAmount), // M-Pesa only accepts whole numbers
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: orderId,
      TransactionDesc: `Payment for Order ${orderId.slice(-8)}`
    };

    console.log('📤 Sending STK Push request...');

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ STK Push initiated:', response.data);

    // Store the CheckoutRequestID in order for tracking
    order.mpesaCheckoutRequestId = response.data.CheckoutRequestID;
    await order.save();

    res.json({
      success: true,
      message: 'Payment request sent to your phone. Please enter your M-Pesa PIN.',
      checkoutRequestId: response.data.CheckoutRequestID,
      merchantRequestId: response.data.MerchantRequestID
    });

  } catch (error) {
    console.error('❌ STK Push error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.response?.data?.errorMessage || error.message
    });
  }
};

/**
 * M-Pesa Callback Handler
 */
export const mpesaCallback = async (req, res) => {
  try {
    console.log('📥 M-Pesa Callback received:', JSON.stringify(req.body, null, 2));

    const { Body } = req.body;
    const { stkCallback } = Body;

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = stkCallback;

    // Always respond 200 OK to M-Pesa immediately
    res.status(200).json({ success: true });

    // Process the callback asynchronously
    if (ResultCode === 0) {
      // Payment successful
      console.log('✅ Payment successful:', CheckoutRequestID);

      // Extract payment details from metadata
      const metadata = CallbackMetadata?.Item || [];
      const amount = metadata.find(item => item.Name === 'Amount')?.Value;
      const mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
      const transactionDate = metadata.find(item => item.Name === 'TransactionDate')?.Value;
      const phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;

      // Find order by CheckoutRequestID
      const order = await Order.findOne({ mpesaCheckoutRequestId: CheckoutRequestID });

      if (order) {
        // Update order payment status
        order.paymentStatus = 'Paid';
        order.paymentMethod = 'm-pesa';
        order.mpesaReceiptNumber = mpesaReceiptNumber;
        order.mpesaTransactionDate = transactionDate;
        order.mpesaPhoneNumber = phoneNumber;
        order.paidAmount = amount;
        await order.save();

        console.log('✅ Order updated:', order._id);

        // Create notifications for customer and admin
        await createPaymentNotifications(order, mpesaReceiptNumber);

      } else {
        console.log('⚠️ Order not found for CheckoutRequestID:', CheckoutRequestID);
      }

    } else {
      // Payment failed or cancelled
      console.log('❌ Payment failed:', ResultDesc);

      const order = await Order.findOne({ mpesaCheckoutRequestId: CheckoutRequestID });
      if (order) {
        order.paymentStatus = 'Failed';
        order.mpesaFailureReason = ResultDesc;
        await order.save();

        // Notify customer of failure
        await Notification.create({
          userId: order.userId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: `Payment for order ${order._id.toString().slice(-8)} failed: ${ResultDesc}`,
          orderId: order._id
        });
      }
    }

  } catch (error) {
    console.error('❌ Callback processing error:', error);
    // Still respond 200 to M-Pesa even if our processing fails
    res.status(200).json({ success: true });
  }
};

/**
 * Create notifications after successful payment
 */
const createPaymentNotifications = async (order, receiptNumber) => {
  try {
    // Customer notification
    await Notification.create({
      userId: order.userId,
      type: 'payment_success',
      title: '✅ Payment Successful',
      message: `Your payment of KSH ${order.totalAmount} for order ${order._id.toString().slice(-8)} was successful. Receipt: ${receiptNumber}`,
      orderId: order._id,
      read: false
    });

    // Admin notification
    await Notification.create({
      userId: 'admin', // Special admin user ID
      type: 'new_payment',
      title: '💰 New Payment Received',
      message: `Payment of KSH ${order.totalAmount} received for order ${order._id.toString().slice(-8)}. Customer: ${order.customerName}`,
      orderId: order._id,
      read: false
    });

    console.log('✅ Notifications created');
  } catch (error) {
    console.error('❌ Notification creation error:', error);
  }
};

/**
 * Query STK Push Status (for manual checking)
 */
export const querySTKStatus = async (req, res) => {
  try {
    const { checkoutRequestId } = req.body;

    const accessToken = await getAccessToken();
    const { password, timestamp } = generatePassword();

    const url = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('❌ Query status error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to query payment status',
      error: error.message
    });
  }
};
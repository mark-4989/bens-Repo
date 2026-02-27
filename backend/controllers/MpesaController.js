// backend/controllers/MpesaController.js
// ─── ADD notification imports at top ────────────────────────────────────────
import axios from 'axios';
import Order from '../models/OrderModel.js';
import Notification from '../models/NotificationModel.js';
import {
  notifyPaymentSuccess,
  notifyPaymentFailed,
  notifyPaymentPending,
} from './NotificationController.js';

const getAccessToken = async () => {
  try {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const url = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    const response = await axios.get(url, { headers: { Authorization: `Basic ${auth}` } });
    return response.data.access_token;
  } catch (error) {
    console.error('❌ M-Pesa token error:', error.response?.data || error.message);
    throw new Error('Failed to get M-Pesa access token');
  }
};

const generatePassword = () => {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  const password  = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');
  return { password, timestamp };
};

export const initiateSTKPush = async (req, res) => {
  try {
    const { orderId, phoneNumber } = req.body;
    const userId = req.userId;

    if (!orderId || !phoneNumber) return res.status(400).json({ success: false, message: 'Order ID and phone number are required' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.userId !== userId) return res.status(403).json({ success: false, message: 'Unauthorized' });
    if (order.paymentStatus === 'Paid') return res.status(400).json({ success: false, message: 'Order is already paid' });

    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (formattedPhone.startsWith('0'))    formattedPhone = '254' + formattedPhone.slice(1);
    if (formattedPhone.startsWith('+254')) formattedPhone = formattedPhone.slice(1);

    const accessToken = await getAccessToken();
    const { password, timestamp } = generatePassword();

    const url = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password, Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(order.totalAmount),
      PartyA: formattedPhone, PartyB: process.env.MPESA_SHORTCODE, PhoneNumber: formattedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: orderId,
      TransactionDesc: `Payment for Order ${orderId.slice(-8)}`,
    };

    const response = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });

    order.mpesaCheckoutRequestId = response.data.CheckoutRequestID;
    await order.save();

    // 🔔 Notify customer M-Pesa prompt sent
    await notifyPaymentPending(order);

    res.json({
      success: true,
      message: 'Payment request sent to your phone. Please enter your M-Pesa PIN.',
      checkoutRequestId: response.data.CheckoutRequestID,
      merchantRequestId: response.data.MerchantRequestID,
    });
  } catch (error) {
    console.error('❌ STK Push error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to initiate payment', error: error.response?.data?.errorMessage || error.message });
  }
};

export const mpesaCallback = async (req, res) => {
  try {
    const { Body }       = req.body;
    const { stkCallback } = Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    // Always ACK to Safaricom immediately
    res.status(200).json({ success: true });

    if (ResultCode === 0) {
      const metadata          = CallbackMetadata?.Item || [];
      const amount            = metadata.find(i => i.Name === 'Amount')?.Value;
      const mpesaReceiptNumber = metadata.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
      const transactionDate   = metadata.find(i => i.Name === 'TransactionDate')?.Value;
      const phoneNumber       = metadata.find(i => i.Name === 'PhoneNumber')?.Value;

      const order = await Order.findOne({ mpesaCheckoutRequestId: CheckoutRequestID });
      if (order) {
        order.paymentStatus        = 'Paid';
        order.paymentMethod        = 'm-pesa';
        order.mpesaReceiptNumber   = mpesaReceiptNumber;
        order.mpesaTransactionDate = transactionDate;
        order.mpesaPhoneNumber     = phoneNumber;
        order.paidAmount           = amount;
        await order.save();

        // 🔔 Notify customer of successful payment
        await notifyPaymentSuccess(order, mpesaReceiptNumber);

        // Admin notification (using legacy direct Notification.create)
        await Notification.create({
          userId:  'admin',
          type:    'new_payment',
          title:   '💰 New Payment Received',
          message: `Payment of KSH ${order.totalAmount} received for order ${order._id.toString().slice(-8)}. Customer: ${order.customerName}`,
          orderId: order._id,
          icon:    '💰',
        });
      }
    } else {
      const order = await Order.findOne({ mpesaCheckoutRequestId: CheckoutRequestID });
      if (order) {
        order.paymentStatus       = 'Failed';
        order.mpesaFailureReason  = ResultDesc;
        await order.save();

        // 🔔 Notify customer payment failed
        await notifyPaymentFailed(order, ResultDesc);
      }
    }
  } catch (error) {
    console.error('❌ Callback processing error:', error);
    res.status(200).json({ success: true }); // Still ACK
  }
};

export const querySTKStatus = async (req, res) => {
  try {
    const { checkoutRequestId } = req.body;
    const accessToken = await getAccessToken();
    const { password, timestamp } = generatePassword();

    const url = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';

    const response = await axios.post(url,
      { BusinessShortCode: process.env.MPESA_SHORTCODE, Password: password, Timestamp: timestamp, CheckoutRequestID: checkoutRequestId },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('❌ Query status error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to query payment status', error: error.message });
  }
};
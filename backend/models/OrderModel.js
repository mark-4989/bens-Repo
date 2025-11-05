import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: { 
      type: String, 
      required: true,
      index: true 
    },
    customerName: { 
      type: String,
      default: "Customer"
    },
    email: { 
      type: String 
    },
    phone: {
      type: String
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipcode: String,
      country: String,
      // ✅ NEW: GPS coordinates for delivery
      latitude: Number,
      longitude: Number,
      locationType: {
        type: String,
        enum: ['pin', 'current', 'address'],
        default: 'address'
      }
    },
    items: [
      {
        productId: { 
          type: String,
          required: true
        },
        name: {
          type: String,
          required: true
        },
        price: {
          type: Number,
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        size: String,
        image: String,
      },
    ],
    totalAmount: { 
      type: Number, 
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "stripe", "m-pesa"],
      default: "cod"
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Failed"],
      default: "Pending"
    },
    status: {
      type: String,
      enum: ["Order Received", "Cargo Packed", "Cargo on Route", "Delivered", "Cancelled"],
      default: "Order Received",
    },
    cancellable: {
      type: Boolean,
      default: true
    },
    
    // ✅ NEW: Tracking & Driver Information
    driverName: {
      type: String
    },
    driverPhone: {
      type: String
    },
    vehicleNumber: {
      type: String
    },
    deliveryLocation: {
      lat: Number,
      lng: Number
    },
    warehouseLocation: {
      lat: Number,
      lng: Number
    },
    currentDriverLocation: {
      latitude: Number,
      longitude: Number,
      timestamp: Date
    },
    estimatedDeliveryTime: {
      type: Number // in minutes
    },
    actualDeliveryTime: {
      type: Date
    },
    trackingEnabled: {
      type: Boolean,
      default: false
    },
    
    // M-Pesa payment fields
    mpesaCheckoutRequestId: {
      type: String
    },
    mpesaReceiptNumber: {
      type: String
    },
    mpesaTransactionDate: {
      type: String
    },
    mpesaPhoneNumber: {
      type: String
    },
    mpesaFailureReason: {
      type: String
    },
    paidAmount: {
      type: Number
    }
  },
  { 
    timestamps: true // Automatically adds createdAt and updatedAt
  }
);

// Index for faster queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ trackingEnabled: 1, status: 1 }); // ✅ NEW: For tracking queries

const Order = mongoose.model("Order", orderSchema);
export default Order;
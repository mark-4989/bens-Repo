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
    
    // ✅ ENHANCED: Address with GPS coordinates
    address: {
      street: String,
      city: String,
      state: String,
      zipcode: String,
      country: String,
      // ✅ Customer delivery location (from LocationPicker)
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
    
    // ✅ NEW: Driver Information (assigned by admin)
    driver: {
      id: {
        type: String,
        default: null
      },
      name: {
        type: String,
        default: null
      },
      phone: {
        type: String,
        default: null
      },
      vehicle: {
        type: String,
        default: null
      }
    },
    
    driverAssignedAt: {
      type: Date,
      default: null
    },
    
    // ✅ KEEP your existing tracking fields (for compatibility)
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
    
    // ✅ M-Pesa payment fields (keep these for payment integration)
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
    },
    
    // ✅ NEW: Enhanced delivery info from PlaceOrder form
    deliveryInfo: {
      firstName: String,
      lastName: String,
      email: String,
      street: String,
      city: String,
      state: String,
      zipcode: String,
      country: String,
      phone: String,
      latitude: Number,   // From LocationPicker
      longitude: Number,  // From LocationPicker
      locationType: String
    }
  },
  { 
    timestamps: true // Automatically adds createdAt and updatedAt
  }
);

// ✅ Indexes for faster queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ trackingEnabled: 1, status: 1 });
orderSchema.index({ 'driver.id': 1 }); // NEW: Index for driver queries

const Order = mongoose.model("Order", orderSchema);
export default Order;
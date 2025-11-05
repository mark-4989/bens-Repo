// backend/routes/OrderRoute.js
import express from "express";
import adminAuth from "../middleware/requireAdmin.js";
import { verifyClerkToken } from "../middleware/verifyClerkToken.js";
import Order from "../models/OrderModel.js";

const orderRouter = express.Router();

// ✅ Health check - MUST BE FIRST
orderRouter.get("/health", (req, res) => {
  console.log("✅ Orders health check");
  res.json({
    success: true,
    message: "Order routes are working! 🎉",
    endpoints: {
      admin: [
        "GET /api/orders/all",
        "GET /api/orders/:id",
        "PUT /api/orders/:id/status",
        "PUT /api/orders/:id/payment",
        "DELETE /api/orders/:id"
      ],
      client: [
        "POST /api/orders/create",
        "GET /api/orders/user",
        "PUT /api/orders/:id/cancel"
      ]
    }
  });
});

// ✅ CREATE ORDER - Client endpoint (WITH AUTH)
orderRouter.post("/create", verifyClerkToken, async (req, res) => {
  try {
    console.log("📦 Creating new order");
    console.log("👤 Authenticated User ID:", req.userId);
    console.log("📝 Order data received:", req.body);
    
    const { products, totalAmount, paymentMethod, deliveryInfo } = req.body;
    
    // Validate required fields
    if (!products || !totalAmount || !deliveryInfo) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: products, totalAmount, or deliveryInfo"
      });
    }

    // Validate products array
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products must be a non-empty array"
      });
    }

    // Format items for order model
    const formattedItems = products.map(item => ({
      productId: item.productId || item._id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      size: item.size || "N/A",
      image: item.image || ""
    }));

    // ✅ Use authenticated user ID from Clerk
    const newOrder = new Order({
      userId: req.userId, // From Clerk auth
      customerName: `${deliveryInfo.firstName} ${deliveryInfo.lastName}`,
      email: deliveryInfo.email,
      phone: deliveryInfo.phone,
      address: {
        street: deliveryInfo.street,
        city: deliveryInfo.city,
        state: deliveryInfo.state || "",
        zipcode: deliveryInfo.zipcode || "",
        country: deliveryInfo.country || ""
      },
      items: formattedItems,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod || "cod",
      paymentStatus: paymentMethod === "cod" ? "Pending" : "Pending",
      status: "Order Received",
      cancellable: true
    });

    // Save to database
    await newOrder.save();
    
    console.log("✅ Order saved to database:", newOrder._id);
    console.log("✅ Associated with user:", req.userId);
    
    res.json({
      success: true,
      message: "Order placed successfully! We will process it shortly.",
      order: {
        orderId: newOrder._id,
        status: newOrder.status,
        totalAmount: newOrder.totalAmount,
        paymentMethod: newOrder.paymentMethod,
        createdAt: newOrder.createdAt
      }
    });
    
  } catch (error) {
    console.error("❌ Error creating order:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to create order. Please try again.",
      error: error.message
    });
  }
});

// ✅ Get user's own orders (Client - WITH AUTH & DEBUGGING)
orderRouter.get("/user", verifyClerkToken, async (req, res) => {
  try {
    console.log("🔍 GET /api/orders/user called");
    console.log("👤 req.userId:", req.userId);
    console.log("👤 req.user:", req.user);
    
    const userId = req.userId;
    
    if (!userId) {
      console.error("❌ No userId found after auth");
      return res.status(401).json({
        success: false,
        message: "User not authenticated - no userId"
      });
    }

    console.log("🔍 Querying orders for userId:", userId);
    
    // Fetch user's orders, sorted by newest first
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${orders.length} orders for user ${userId}`);
    
    if (orders.length > 0) {
      console.log("📦 First order:", {
        id: orders[0]._id,
        userId: orders[0].userId,
        status: orders[0].status
      });
    }
    
    res.json({
      success: true,
      orders,
      count: orders.length
    });
  } catch (error) {
    console.error("❌ Error in GET /user:");
    console.error("Error message:", error.message);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ✅ Cancel order (Client - authenticated)
orderRouter.put("/:id/cancel", verifyClerkToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log(`🚫 User ${userId} attempting to cancel order ${id}`);

    // Find order that belongs to this user
    const order = await Order.findOne({ _id: id, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or you don't have permission"
      });
    }

    // Check if order can be cancelled
    if (!order.cancellable) {
      return res.status(400).json({
        success: false,
        message: "This order cannot be cancelled"
      });
    }

    if (order.status === "Delivered" || order.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel delivered or already cancelled orders"
      });
    }

    // Mark as cancelled
    order.status = "Cancelled";
    order.cancellable = false;
    await order.save();

    console.log(`✅ Order ${id} cancelled successfully`);

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order
    });
  } catch (error) {
    console.error("❌ Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error.message
    });
  }
});

// ✅ Get all orders (Admin only)
orderRouter.get("/all", adminAuth, async (req, res) => {
  try {
    console.log("📦 Fetching all orders for admin");
    
    // Fetch all orders from database, sorted by newest first
    const orders = await Order.find({}).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${orders.length} orders`);
    res.json({
      success: true,
      orders,
      count: orders.length
    });
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message
    });
  }
});

// ✅ Get single order by ID (Admin only)
orderRouter.get("/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔍 Fetching order:", id);
    
    // Find order by ID
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    console.log("✅ Order found:", order._id);
    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error("❌ Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message
    });
  }
});

// ✅ Update order status (Admin only) - CHANGED from POST to PUT
orderRouter.put("/:id/status", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    console.log(`🔄 Updating order ${id} status to: ${status}`);
    
    // Validate status
    const validStatuses = ["Order Received", "Cargo Packed", "Cargo on Route", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value"
      });
    }

    // Update order status in database
    const order = await Order.findByIdAndUpdate(
      id,
      { 
        status,
        cancellable: status === "Order Received" || status === "Cargo Packed"
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    console.log("✅ Order status updated:", order.status);
    res.json({
      success: true,
      message: "Order status updated successfully",
      order
    });
  } catch (error) {
    console.error("❌ Error updating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order",
      error: error.message
    });
  }
});

// ✅ NEW: Update payment status (Admin only)
orderRouter.put("/:id/payment", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    console.log(`💳 Updating order ${id} payment status to: ${paymentStatus}`);
    
    // Validate payment status
    const validPaymentStatuses = ["Pending", "Paid", "Failed", "Refunded"];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status value"
      });
    }

    // Update payment status in database
    const order = await Order.findByIdAndUpdate(
      id,
      { paymentStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    console.log("✅ Payment status updated:", order.paymentStatus);
    res.json({
      success: true,
      message: "Payment status updated successfully",
      order
    });
  } catch (error) {
    console.error("❌ Error updating payment status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment status",
      error: error.message
    });
  }
});

// ✅ NEW: Delete order (Admin only - for cancelled orders)
orderRouter.delete("/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Attempting to delete order: ${id}`);
    
    // Find the order first
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Optional: Only allow deletion of cancelled orders
    if (order.status !== "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Only cancelled orders can be deleted"
      });
    }

    // Delete the order
    await Order.findByIdAndDelete(id);
    
    console.log(`✅ Order ${id} deleted successfully`);
    res.json({
      success: true,
      message: "Order deleted successfully"
    });
  } catch (error) {
    console.error("❌ Error deleting order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: error.message
    });
  }
});

export default orderRouter;
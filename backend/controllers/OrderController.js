// backend/controllers/OrderController.js
import Order from "../models/OrderModel.js";

// Create order
export const createOrder = async (req, res) => {
  try {
    const { products, totalAmount, paymentMethod, deliveryInfo } = req.body;
    const userId = req.userId;

    if (!products || products.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Products are required" 
      });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid total amount" 
      });
    }

    const paymentStatus = paymentMethod === 'cod' ? 'Pending' : 'Paid';

    const newOrder = new Order({
      userId,
      customerName: deliveryInfo?.firstName && deliveryInfo?.lastName 
        ? `${deliveryInfo.firstName} ${deliveryInfo.lastName}`
        : "Customer",
      email: deliveryInfo?.email || "",
      phone: deliveryInfo?.phone || "",
      address: {
        street: deliveryInfo?.street || "",
        city: deliveryInfo?.city || "",
        state: deliveryInfo?.state || "",
        zipcode: deliveryInfo?.zipcode || "",
        country: deliveryInfo?.country || "",
        latitude: deliveryInfo?.latitude,
        longitude: deliveryInfo?.longitude,
        locationType: deliveryInfo?.locationType
      },
      items: products.map(p => ({
        productId: p.productId || p._id,
        name: p.name,
        price: p.price,
        quantity: p.quantity,
        size: p.size,
        image: p.image
      })),
      totalAmount,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus,
      status: "Order Received",
      cancellable: true
    });

    await newOrder.save();
    console.log("✅ Order created:", newOrder._id);

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder
    });
  } catch (error) {
    console.error("❌ Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message
    });
  }
};

// Get ALL orders (Admin only)
export const getAllOrders = async (req, res) => {
  try {
    const userRole = req.userRole;
    
    console.log("🔍 Admin check - Role:", userRole);

    // TEMPORARY: Allow all authenticated users (remove this after setting admin role)
    // TODO: Uncomment below line and remove the next line after setting admin role in Clerk
    // if (userRole !== 'admin') {
    if (false) { // TEMPORARY - Always allow
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
        debug: { userRole }
      });
    }

    const orders = await Order.find({}).sort({ createdAt: -1 });
    
    console.log(`✅ Fetched ${orders.length} orders`);

    res.json({
      success: true,
      orders,
      totalOrders: orders.length
    });
  } catch (error) {
    console.error("❌ Get all orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message
    });
  }
};

// Get user's own orders
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.userId;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error("❌ Get user orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your orders"
    });
  }
};

// Cancel order (User)
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const order = await Order.findOne({ _id: id, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check if order can be cancelled
    if (!order.cancellable) {
      return res.status(400).json({
        success: false,
        message: "This order cannot be cancelled"
      });
    }

    if (order.status === "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel delivered orders"
      });
    }

    // Mark as cancelled
    order.status = "Cancelled";
    order.cancellable = false;
    await order.save();

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order
    });
  } catch (error) {
    console.error("❌ Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order"
    });
  }
};

// ✅ NEW: Delete cancelled order (Admin only)
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.userRole;
    
    console.log("🗑️ Delete order request for:", id);
    
    // TEMPORARY: Allow all (remove after setting admin role)
    // if (userRole !== 'admin') {
    if (false) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Only allow deletion of cancelled orders
    if (order.status !== "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Only cancelled orders can be deleted"
      });
    }

    await Order.findByIdAndDelete(id);
    console.log(`✅ Order ${id} deleted successfully`);

    res.json({
      success: true,
      message: "Order deleted successfully"
    });
  } catch (error) {
    console.error("❌ Delete order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete order"
    });
  }
};

// Update order status (Admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = req.userRole;
    
    // TEMPORARY: Allow all (remove after setting admin role)
    // if (userRole !== 'admin') {
    if (false) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }

    const validStatuses = ["Order Received", "Cargo Packed", "Cargo on Route", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      });
    }

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

    console.log(`✅ Order ${id} status updated to: ${status}`);

    res.json({
      success: true,
      message: "Order status updated successfully",
      order
    });
  } catch (error) {
    console.error("❌ Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status"
    });
  }
};

// Update payment status (Admin)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    const userRole = req.userRole;
    
    // TEMPORARY: Allow all
    // if (userRole !== 'admin') {
    if (false) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }

    const validPaymentStatuses = ["Paid", "Pending", "Failed"];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status`
      });
    }

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

    res.json({
      success: true,
      message: "Payment status updated successfully",
      order
    });
  } catch (error) {
    console.error("❌ Update payment status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment status"
    });
  }
};
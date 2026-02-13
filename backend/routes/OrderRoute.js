// backend/routes/OrderRoute.js
import express from "express";
import adminAuth from "../middleware/requireAdmin.js";
import { verifyClerkToken } from "../middleware/verifyClerkToken.js";
import Order from "../models/OrderModel.js";
import { broadcastNewOrder, notifyStatusChange } from "../services/trackingService.js";

const orderRouter = express.Router();

// ✅ Health check
orderRouter.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Order routes working!",
    endpoints: {
      admin: [
        "GET  /api/orders/all",
        "GET  /api/orders/:id",
        "PUT  /api/orders/:id/status",
        "PUT  /api/orders/:id/payment",
        "PUT  /api/orders/:id/assign-driver",
        "POST /api/orders/:id/broadcast",
        "DELETE /api/orders/:id",
      ],
      driver: [
        "GET /api/orders/driver/available   (status=Cargo Packed, no driver)",
        "GET /api/orders/driver/mine        (orders assigned to this driver)",
        "PUT /api/orders/driver/:id/accept  (driver accepts broadcast order)",
      ],
      client: [
        "POST /api/orders/create",
        "GET  /api/orders/user",
        "PUT  /api/orders/:id/cancel",
      ],
    },
  });
});

// ════════════════════════════════════════════════
// CLIENT ROUTES
// ════════════════════════════════════════════════

// ✅ Create order
orderRouter.post("/create", verifyClerkToken, async (req, res) => {
  try {
    const { products, totalAmount, paymentMethod, deliveryInfo } = req.body;

    if (!products || !totalAmount || !deliveryInfo) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: products, totalAmount, or deliveryInfo",
      });
    }
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: "Products must be a non-empty array" });
    }

    const formattedItems = products.map((item) => ({
      productId: item.productId || item._id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      size: item.size || "N/A",
      image: item.image || "",
    }));

    const newOrder = new Order({
      userId: req.userId,
      customerName: `${deliveryInfo.firstName} ${deliveryInfo.lastName}`,
      email: deliveryInfo.email,
      phone: deliveryInfo.phone,
      address: {
        street: deliveryInfo.street,
        city: deliveryInfo.city,
        state: deliveryInfo.state || "",
        zipcode: deliveryInfo.zipcode || "",
        country: deliveryInfo.country || "",
        latitude: deliveryInfo.latitude,
        longitude: deliveryInfo.longitude,
        locationType: deliveryInfo.locationType,
      },
      items: formattedItems,
      totalAmount,
      paymentMethod: paymentMethod || "cod",
      paymentStatus: paymentMethod === "cod" ? "Pending" : "Pending",
      status: "Order Received",
      cancellable: true,
    });

    await newOrder.save();
    console.log("✅ Order created:", newOrder._id);

    res.json({
      success: true,
      message: "Order placed successfully!",
      order: {
        orderId: newOrder._id,
        status: newOrder.status,
        totalAmount: newOrder.totalAmount,
        paymentMethod: newOrder.paymentMethod,
        createdAt: newOrder.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Create order error:", error);
    res.status(500).json({ success: false, message: "Failed to create order", error: error.message });
  }
});

// ✅ Get user's own orders
orderRouter.get("/user", verifyClerkToken, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch orders", error: error.message });
  }
});

// ✅ Cancel order (client)
orderRouter.put("/:id/cancel", verifyClerkToken, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({ _id: id, userId: req.userId });

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.cancellable || order.status === "Delivered" || order.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "This order cannot be cancelled" });
    }

    order.status = "Cancelled";
    order.cancellable = false;
    await order.save();

    res.json({ success: true, message: "Order cancelled", order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to cancel order", error: error.message });
  }
});

// ════════════════════════════════════════════════
// DRIVER ROUTES  (token-based, no Clerk required)
// ════════════════════════════════════════════════

// Simple driver auth middleware — checks Authorization: Bearer <driverToken>
// The token is the driver's _id (or a JWT you issue at login).
// For now we use a simple header check; swap for JWT.verify() when ready.
const driverAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Driver not authenticated" });
  }
  // Token is driverId:phone (base64) — simple, replace with JWT in production
  const token = header.split(" ")[1];
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [driverId, phone] = decoded.split(":");
    req.driverId = driverId;
    req.driverPhone = phone;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid driver token" });
  }
};

// ✅ Driver login  POST /api/orders/driver/login
orderRouter.post("/driver/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: "Phone and password required" });
    }

    // ── Find a driver record. Right now we check against any order's driverPhone
    //    as a quick bootstrap. Replace with a real Driver model when ready. ──
    // For demo: accept any phone + password "driver123"
    // TODO: create a Driver model with hashed passwords
    const DEMO_PASSWORD = process.env.DRIVER_PASSWORD || "driver123";
    if (password !== DEMO_PASSWORD) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Build a temporary driverId from phone
    const driverId = `driver_${phone.replace(/\D/g, "")}`;
    const token = Buffer.from(`${driverId}:${phone}`).toString("base64");

    res.json({
      success: true,
      token,
      driver: {
        _id: driverId,
        phone,
        name: `Driver (${phone})`, // Replace with DB lookup when Driver model exists
        status: "available",
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Login failed", error: error.message });
  }
});

// ✅ GET available (broadcasted) orders  — orders in "Cargo Packed" with no driver yet
orderRouter.get("/driver/available", driverAuth, async (req, res) => {
  try {
    const orders = await Order.find({
      status: "Cargo Packed",
      "driver.id": null,
    })
      .sort({ createdAt: -1 })
      .select("_id customerName address items totalAmount paymentMethod createdAt");

    res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch available orders", error: error.message });
  }
});

// ✅ GET driver's own active/completed orders
orderRouter.get("/driver/mine", driverAuth, async (req, res) => {
  try {
    const orders = await Order.find({ "driver.id": req.driverId }).sort({ createdAt: -1 });
    res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch your orders", error: error.message });
  }
});

// ✅ Driver accepts a broadcasted order
orderRouter.put("/driver/:id/accept", driverAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { driverName, driverPhone, vehicleType } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Prevent double-accept
    if (order.driver?.id) {
      return res.status(409).json({ success: false, message: "Order already taken by another driver" });
    }

    const updated = await Order.findByIdAndUpdate(
      id,
      {
        status: "Cargo on Route",
        cancellable: false,
        driver: {
          id: req.driverId,
          name: driverName || `Driver (${req.driverPhone})`,
          phone: driverPhone || req.driverPhone,
          vehicle: vehicleType || "motorcycle",
        },
        driverAssignedAt: new Date(),
        // Legacy fields for backward compat
        driverName: driverName || `Driver (${req.driverPhone})`,
        driverPhone: driverPhone || req.driverPhone,
        trackingEnabled: true,
      },
      { new: true }
    );

    // ✅ Notify admin & customers via Socket.IO
    notifyStatusChange(id, "Cargo on Route", req.driverId);

    res.json({ success: true, message: "Order accepted! Start delivery.", order: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to accept order", error: error.message });
  }
});

// ✅ Driver updates delivery status (picked-up → on-the-way → delivered)
orderRouter.put("/driver/:id/status", driverAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const driverStatuses = ["Cargo on Route", "Delivered"];
    if (!driverStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status for driver" });
    }

    const order = await Order.findOneAndUpdate(
      { _id: id, "driver.id": req.driverId },
      {
        status,
        ...(status === "Delivered" && {
          actualDeliveryTime: new Date(),
          trackingEnabled: false,
        }),
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, message: "Order not found or not yours" });

    // ✅ Notify admins & customers via Socket.IO
    notifyStatusChange(id, status, req.driverId);

    res.json({ success: true, message: `Status updated to ${status}`, order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
});

// ════════════════════════════════════════════════
// ADMIN ROUTES
// ════════════════════════════════════════════════

// ✅ Get all orders (Admin)
orderRouter.get("/all", adminAuth, async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch orders", error: error.message });
  }
});

// ✅ NEW: Broadcast order to Driver App (Admin presses "Broadcast to Driver App")
// Sets status → "Cargo Packed" so it appears in driver's available orders list
orderRouter.post("/:id/broadcast", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByIdAndUpdate(
      id,
      {
        status: "Cargo Packed",
        cancellable: false,
        "driver.id": null, // Clear any previous driver assignment
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // ✅ Notify all driver clients via Socket.IO
    broadcastNewOrder({
      orderId: id,
      orderNumber: id.slice(-8).toUpperCase(),
      customerName: order.customerName,
      address: order.address?.street,
      totalAmount: order.totalAmount,
    });

    console.log(`📢 Order ${id} broadcasted to Driver App`);
    res.json({ success: true, message: "Order broadcasted to Driver App", order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to broadcast", error: error.message });
  }
});

// ✅ Get single order (Admin)
orderRouter.get("/:id", adminAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch order", error: error.message });
  }
});

// ✅ Update order status (Admin)
orderRouter.put("/:id/status", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Order Received", "Cargo Packed", "Cargo on Route", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status, cancellable: status === "Order Received" || status === "Cargo Packed" },
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, message: "Status updated", order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
});

// ✅ Manually assign driver (Admin — for pre-registering a specific driver)
orderRouter.put("/:id/assign-driver", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId, driverName, driverPhone, vehicleType } = req.body;

    const order = await Order.findByIdAndUpdate(
      id,
      {
        status: "Cargo on Route",
        cancellable: false,
        driver: { id: driverId, name: driverName, phone: driverPhone, vehicle: vehicleType },
        driverAssignedAt: new Date(),
        driverName,
        driverPhone,
        trackingEnabled: true,
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, message: "Driver assigned", order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to assign driver", error: error.message });
  }
});

// ✅ Update payment status (Admin)
orderRouter.put("/:id/payment", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    const valid = ["Pending", "Paid", "Failed", "Refunded"];
    if (!valid.includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: "Invalid payment status" });
    }

    const order = await Order.findByIdAndUpdate(id, { paymentStatus }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, message: "Payment status updated", order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update payment status", error: error.message });
  }
});

// ✅ Delete order (Admin — cancelled orders only)
orderRouter.delete("/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.status !== "Cancelled") {
      return res.status(400).json({ success: false, message: "Only cancelled orders can be deleted" });
    }

    await Order.findByIdAndDelete(id);
    res.json({ success: true, message: "Order deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete order", error: error.message });
  }
});

export default orderRouter;
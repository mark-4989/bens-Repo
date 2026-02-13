import express from "express";
import cors from "cors";
import "dotenv/config";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import userRouter from "./routes/UserRoute.js";
import productRouter from "./routes/ProductRoute.js";
import orderRouter from "./routes/OrderRoute.js";
import trackingRouter from "./routes/TrackingRoutes.js";
import dispatchRouter from "./routes/DispatchRoutes.js";

// App Config
const app = express();
const port = process.env.PORT || 4000;
connectDB();
connectCloudinary();

// Middlewares
app.use(express.json());

// ✅ CORS Configuration
const corsOptions = {
  origin: [
    "https://bens-repo.vercel.app",
    "https://clientside-teal.vercel.app",
    "https://www.bens-repo.vercel.app",
    "https://www.clientside-teal.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://localhost:4000",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    return res.status(200).end();
  }
  next();
});

// ✅ API Endpoints
app.use("/api/user", userRouter);
app.use("/api/product", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/tracking", trackingRouter);
app.use("/api/dispatch", dispatchRouter);

// Health checks
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Working - Forever Ecommerce Backend",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    routes: {
      users: "/api/user",
      products: "/api/product",
      orders: "/api/orders",
      tracking: "/api/tracking",
      dispatch: "/api/dispatch",
    },
  });
});
app.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is healthy", uptime: process.uptime() });
});

app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ════════════════════════════════════════════════════════
// ✅ WebSocket Server — Real-time Driver Location Tracking
// ════════════════════════════════════════════════════════
const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer });

// Track connections by role
const adminClients = new Set();      // Admin panels watching deliveries
const driverClients = new Map();     // driverId → ws (drivers sending locations)
const orderSubscriptions = new Map(); // orderId → Set<ws> (admins watching specific orders)

wss.on("connection", (ws) => {
  console.log("📡 New WebSocket connection");

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        // ── Admin connects and subscribes to a specific order ──
        case "ADMIN_SUBSCRIBE_ORDER": {
          adminClients.add(ws);
          const orderId = msg.orderId;
          if (!orderSubscriptions.has(orderId)) {
            orderSubscriptions.set(orderId, new Set());
          }
          orderSubscriptions.get(orderId).add(ws);
          ws._subscribedOrder = orderId;
          console.log(`👁️  Admin subscribed to order ${orderId}`);
          ws.send(JSON.stringify({ type: "SUBSCRIBED", orderId }));
          break;
        }

        // ── Admin connects to watch ALL active deliveries ──
        case "ADMIN_WATCH_ALL": {
          adminClients.add(ws);
          ws._watchAll = true;
          console.log("👁️  Admin watching all deliveries");
          ws.send(JSON.stringify({ type: "WATCHING_ALL" }));
          break;
        }

        // ── Driver registers itself ──
        case "DRIVER_REGISTER": {
          ws._driverId = msg.driverId;
          ws._driverName = msg.driverName;
          driverClients.set(msg.driverId, ws);
          console.log(`🚗 Driver registered: ${msg.driverName} (${msg.driverId})`);
          ws.send(JSON.stringify({ type: "REGISTERED", driverId: msg.driverId }));
          break;
        }

        // ── Driver sends live location update ──
        case "DRIVER_LOCATION_UPDATE": {
          const payload = {
            type: "DRIVER_LOCATION_UPDATE",
            driverId: msg.driverId || ws._driverId,
            driverName: msg.driverName || ws._driverName,
            orderId: msg.orderId,
            location: msg.location,  // { lat, lng }
            timestamp: new Date().toISOString(),
          };

          console.log(`📍 Location from driver ${payload.driverId}: ${payload.location?.lat}, ${payload.location?.lng}`);

          // Push to admin clients subscribed to this specific order
          const subscribers = orderSubscriptions.get(msg.orderId);
          if (subscribers) {
            subscribers.forEach((client) => {
              if (client.readyState === 1) client.send(JSON.stringify(payload));
            });
          }

          // Push to all admins watching everything
          adminClients.forEach((client) => {
            if (client._watchAll && client.readyState === 1) {
              client.send(JSON.stringify(payload));
            }
          });
          break;
        }

        // ── Driver or admin notifies a delivery status change ──
        case "DELIVERY_STATUS_UPDATE": {
          const statusPayload = {
            type: "DELIVERY_STATUS_UPDATE",
            orderId: msg.orderId,
            status: msg.status,
            driverId: msg.driverId,
            timestamp: new Date().toISOString(),
          };

          // Broadcast to all admin clients
          adminClients.forEach((client) => {
            if (client.readyState === 1) client.send(JSON.stringify(statusPayload));
          });
          console.log(`📦 Delivery status update: ${msg.orderId} → ${msg.status}`);
          break;
        }

        default:
          console.log("❓ Unknown WS message type:", msg.type);
      }
    } catch (err) {
      console.error("❌ WS message parse error:", err);
    }
  });

  ws.on("close", () => {
    // Clean up admin subscriptions
    adminClients.delete(ws);
    if (ws._subscribedOrder) {
      const subs = orderSubscriptions.get(ws._subscribedOrder);
      if (subs) {
        subs.delete(ws);
        if (subs.size === 0) orderSubscriptions.delete(ws._subscribedOrder);
      }
    }
    // Clean up driver registration
    if (ws._driverId) {
      driverClients.delete(ws._driverId);
      console.log(`🚗 Driver disconnected: ${ws._driverId}`);
    }
  });

  ws.on("error", (err) => console.error("WS error:", err));
});

// Make wss accessible to routes (for broadcasting from HTTP handlers)
app.set("wss", wss);
app.set("adminClients", adminClients);
app.set("orderSubscriptions", orderSubscriptions);

// ────────────────────────────────────────────────────────
httpServer.listen(port, () => {
  console.log("╔═══════════════════════════════════════╗");
  console.log("🚀 Forever Ecommerce Backend Server");
  console.log("╚═══════════════════════════════════════╝");
  console.log(`📡 HTTP  → PORT ${port}`);
  console.log(`🔌 WS    → ws://localhost:${port}`);
  console.log(`🌐 ENV   → ${process.env.NODE_ENV || "development"}`);
  console.log("\n✅ Routes:");
  console.log("   /api/user · /api/product · /api/orders");
  console.log("   /api/tracking · /api/dispatch");
  console.log("   WebSocket: DRIVER_LOCATION_UPDATE ← NEW");
  console.log("╚═══════════════════════════════════════╝\n");
});

export default app;
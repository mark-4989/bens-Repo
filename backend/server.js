import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import userRouter from "./routes/UserRoute.js";
import productRouter from "./routes/ProductRoute.js";
import orderRouter from "./routes/OrderRoute.js";
import trackingRouter from "./routes/TrackingRoutes.js";

// App Config
const app = express();
const port = process.env.PORT || 4000;
connectDB();
connectCloudinary();

// Middlewares
app.use(express.json());

// CORS Configuration - UPDATED FOR PRODUCTION
const corsOptions = {
  origin: [
    // Production URLs (Vercel deployments)
    "https://foreverecommerce-2-gae4.vercel.app", // Admin Panel
    "https://foreverecommerce-2.vercel.app",      // Client Frontend
    
    // Add www versions if needed
    "https://www.foreverecommerce-2.vercel.app",
    
    // Development URLs (for local testing)
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200, // For legacy browser support
};

app.use(cors(corsOptions));

// ✅ FIX: Change this line from app.options(/.*/, ...) to middleware
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }
  next();
});

// API Endpoints
app.use("/api/user", userRouter);
app.use("/api/product", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/tracking", trackingRouter);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Working - Forever Ecommerce Backend",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Health check for products
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Start server
app.listen(port, () => {
  console.log("╔═══════════════════════════════════════╗");
  console.log("🚀 Forever Ecommerce Backend Server");
  console.log("╚═══════════════════════════════════════╝");
  console.log(`📡 Server started on PORT: ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 URL: ${process.env.NODE_ENV === "production" ? "https://foreverecommerce-2.onrender.com" : `http://localhost:${port}`}`);
  console.log("╚═══════════════════════════════════════╝");
});

export default app;
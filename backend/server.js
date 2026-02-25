// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import cors from "cors";
import http from 'http';
import { Server } from 'socket.io';
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import userRouter from "./routes/UserRoute.js";
import productRouter from "./routes/ProductRoute.js";
import orderRouter from "./routes/OrderRoute.js";
import driverRouter from "./routes/DriverRoute.js";           // ← NEW

const app = express();
const server = http.createServer(app);

// ════════════════════════════════════════════════════════
// SOCKET.IO INITIALIZATION
// ════════════════════════════════════════════════════════
const io = new Server(server, {
  cors: {
    origin: [
      // Production URLs
      'https://bens-repo.vercel.app',
      'https://clientside-teal.vercel.app',
      'https://www.bens-repo.vercel.app',
      'https://www.clientside-teal.vercel.app',
      'https://bens-repo-driver-app.vercel.app', // ← Driver PWA
      // Development URLs
      'http://localhost:5173', // Admin Dashboard
      'http://localhost:5174', // Client App
      'http://localhost:5175', // Driver App
      'http://localhost:3000',
      'http://localhost:4000',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// Initialize real-time tracking service
import { initializeTracking } from './services/trackingService.js';
initializeTracking(io);

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 4000;

// ════════════════════════════════════════════════════════
// DATABASE CONNECTION
// ════════════════════════════════════════════════════════
connectDB();
connectCloudinary();

// ════════════════════════════════════════════════════════
// MIDDLEWARE
// ════════════════════════════════════════════════════════
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
const corsOptions = {
  origin: [
    'https://bens-repo.vercel.app',
    'https://clientside-teal.vercel.app',
    'https://www.bens-repo.vercel.app',
    'https://www.clientside-teal.vercel.app',
    'https://bens-repo-driver-app.vercel.app', // ← Driver PWA
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'http://localhost:4000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Handle preflight
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

// ════════════════════════════════════════════════════════
// HEALTH CHECK ROUTES
// ════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  res.json({
    message: '🛍️ Welcome to Forever E-commerce API!',
    status: 'Server is running smoothly',
    socketio: 'enabled',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      users:   '/api/user',
      products:'/api/product',
      orders:  '/api/orders',
      drivers: '/api/drivers',  // ← NEW
      health:  '/health',
    }
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working! 🎉',
    socketio: 'enabled',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Forever E-commerce API is running',
    socketio: 'enabled',
    uptime: process.uptime(),
    features: {
      authentication: 'active',
      orders: 'active',
      products: 'active',
      users: 'active',
      payments: 'active',
      tracking: 'active',
      driverApp: 'active',
      customerTracking: 'active',
      adminTracking: 'active',
      realTime: 'active',
    }
  });
});

// ════════════════════════════════════════════════════════
// API ROUTES
// ════════════════════════════════════════════════════════
app.use("/api/user",    userRouter);
app.use("/api/product", productRouter);
app.use("/api/orders",  orderRouter);
app.use("/api/drivers", driverRouter);  // ← NEW: Driver app backend

// ════════════════════════════════════════════════════════
// ERROR HANDLING MIDDLEWARE
// ════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`
  });
});

// ════════════════════════════════════════════════════════
// START SERVER
// ════════════════════════════════════════════════════════
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║   🛍️  Forever E-commerce API Server Started     ║
  ╠══════════════════════════════════════════════════╣
  ║   Port: ${PORT}                                    
  ║   Environment: ${process.env.NODE_ENV || 'development'}
  ║   URL: http://localhost:${PORT}
  ╠══════════════════════════════════════════════════╣
  ║   📋 API ENDPOINTS:
  ║   • Users:     /api/user
  ║   • Products:  /api/product
  ║   • Orders:    /api/orders
  ║   • Health:    /health
  ╠══════════════════════════════════════════════════╣
  ║   🔌 Socket.IO: ENABLED
  ║   📱 Driver App: ENABLED
  ║   👤 Customer Tracking: ENABLED
  ║   👨‍💼 Admin Tracking: ENABLED
  ║   📍 GPS Tracking: ENABLED ← NEW!
  ║   🔔 Real-time Updates: ENABLED
  ║   🎨 Cloudinary: ENABLED
  ║   🔐 Clerk Auth: ENABLED
  ║   💳 M-Pesa: ENABLED
  ╚══════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;
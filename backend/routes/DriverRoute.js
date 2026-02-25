// backend/routes/DriverRoute.js
// ═══════════════════════════════════════════════════════════════════════════════
// All /api/drivers/* endpoints.
//
// Public (no auth):
//   POST   /api/drivers/login          driver phone+password → JWT
//   POST   /api/drivers/seed           dev seed (safe: skips if drivers exist)
//   GET    /api/drivers/stats          admin dashboard stats
//   GET    /api/drivers                admin list all drivers
//   POST   /api/drivers                admin create driver
//   PUT    /api/drivers/:id            admin update driver
//   DELETE /api/drivers/:id            admin delete driver
//
// Protected (driverAuth JWT required):
//   GET    /api/drivers/available      orders with no driver assigned
//   GET    /api/drivers/mine           this driver's orders
//   PUT    /api/drivers/:orderId/accept     claim an order
//   PUT    /api/drivers/:orderId/status     mark Delivered
//   PUT    /api/drivers/location            push GPS update
// ═══════════════════════════════════════════════════════════════════════════════
import express     from 'express';
import driverAuth  from '../middleware/driverAuth.js';
import {
  driverLogin,
  getAvailableOrders,
  getMyOrders,
  acceptOrder,
  updateDeliveryStatus,
  updateLocation,
  getDriverStats,
  getAllDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  seedDrivers,
} from '../controllers/DriverController.js';

const driverRouter = express.Router();

// ── Public routes (no JWT needed) ─────────────────────────────────────────────
driverRouter.post('/login',       driverLogin);
driverRouter.post('/seed',        seedDrivers);
driverRouter.get('/stats',        getDriverStats);

// ── Admin CRUD (add your admin auth middleware here when ready) ────────────────
driverRouter.get('/',             getAllDrivers);
driverRouter.post('/',            createDriver);
driverRouter.put('/:id',          updateDriver);
driverRouter.delete('/:id',       deleteDriver);

// ── Driver-authenticated routes ───────────────────────────────────────────────
// Order queues
driverRouter.get('/available',    driverAuth, getAvailableOrders);
driverRouter.get('/mine',         driverAuth, getMyOrders);

// GPS push (REST fallback when Socket.IO isn't connected)
driverRouter.put('/location',     driverAuth, updateLocation);

// Order lifecycle — note these must come AFTER /available and /mine
// so Express doesn't try to match "available" or "mine" as :orderId
driverRouter.put('/:orderId/accept', driverAuth, acceptOrder);
driverRouter.put('/:orderId/status', driverAuth, updateDeliveryStatus);

export default driverRouter;
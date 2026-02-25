// backend/controllers/DriverController.js
// ═══════════════════════════════════════════════════════════════════════════════
// Handles all driver-facing API logic:
//   POST   /api/drivers/login                — phone + password → JWT
//   GET    /api/drivers/available            — delivery orders with no driver
//   GET    /api/drivers/mine                 — this driver's orders
//   PUT    /api/drivers/:orderId/accept      — claim an order
//   PUT    /api/drivers/:orderId/status      — mark Delivered
//   PUT    /api/drivers/location             — push GPS update
//   GET    /api/drivers                      — admin: list all drivers
//   POST   /api/drivers                      — admin: create driver
//   PUT    /api/drivers/:id                  — admin: update driver
//   DELETE /api/drivers/:id                  — admin: remove driver
//   POST   /api/drivers/seed                 — dev: seed sample drivers
//   GET    /api/drivers/stats                — admin: dashboard stats
// ═══════════════════════════════════════════════════════════════════════════════
import jwt    from 'jsonwebtoken';
import Driver from '../models/DriverModel.js';
import Order  from '../models/OrderModel.js';

// ─── helpers ──────────────────────────────────────────────────────────────────
const signToken = (driverId) =>
  jwt.sign({ driverId }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Strip password and return a clean driver object + token
const safeDriver = (driver) => {
  const obj = driver.toObject ? driver.toObject() : { ...driver };
  delete obj.password;
  return obj;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/drivers/login
// Body: { phone, password }
// Returns: { success, driver, token }
// ─────────────────────────────────────────────────────────────────────────────
export const driverLogin = async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    if (!password || (!phone && !email)) {
      return res.status(400).json({
        success: false,
        message: 'Phone (or email) and password are required.',
      });
    }

    // Find by phone first, fall back to email
    const query = phone ? { phone } : { email: email.toLowerCase() };
    const driver = await Driver.findOne(query).select('+password'); // re-include hidden field

    if (!driver) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const valid = await driver.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Update last login
    driver.lastLogin  = new Date();
    driver.lastActive = new Date();
    if (driver.status === 'offline') {
      driver.status      = 'active';
      driver.isAvailable = true;
    }
    await driver.save();

    const token = signToken(driver._id.toString());

    console.log(`✅ Driver logged in: ${driver.driverId} (${driver.firstName} ${driver.lastName})`);

    res.json({
      success: true,
      message: 'Login successful',
      driver:  safeDriver(driver),    // driver app reads data.driver OR data.data
      data:    safeDriver(driver),    // belt-and-suspenders: both keys present
      token,
    });
  } catch (error) {
    console.error('❌ driverLogin error:', error);
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/drivers/available   (requires driverAuth)
// Returns all delivery orders that have no driver assigned yet
// and are in a state a driver can pick up (Order Received / Cargo Packed)
// ─────────────────────────────────────────────────────────────────────────────
export const getAvailableOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      // Delivery orders only (has a delivery address with GPS)
      'address.latitude':  { $exists: true, $ne: null },
      'address.longitude': { $exists: true, $ne: null },
      // No driver assigned yet
      $or: [
        { 'driver.id': null },
        { 'driver.id': { $exists: false } },
        { 'driver.id': '' },
      ],
      // Not yet in transit or completed
      status: { $in: ['Order Received', 'Cargo Packed'] },
    }).sort({ createdAt: 1 }); // oldest first so urgent orders surface first

    res.json({ success: true, orders });
  } catch (error) {
    console.error('❌ getAvailableOrders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch available orders' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/drivers/mine   (requires driverAuth)
// Returns all orders assigned to the logged-in driver
// ─────────────────────────────────────────────────────────────────────────────
export const getMyOrders = async (req, res) => {
  try {
    const driverId = req.driverId;

    const orders = await Order.find({
      'driver.id': driverId,
    }).sort({ updatedAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    console.error('❌ getMyOrders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch your orders' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/drivers/:orderId/accept   (requires driverAuth)
// Body: { driverName, driverPhone }
// Claims an order — sets driver fields, moves status to "Cargo on Route"
// ─────────────────────────────────────────────────────────────────────────────
export const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverName, driverPhone } = req.body;
    const driverId = req.driverId;
    const driver   = req.driver;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Check it's still unclaimed (race condition guard)
    if (order.driver?.id && order.driver.id !== '') {
      return res.status(409).json({
        success: false,
        message: 'Order was already claimed by another driver.',
      });
    }

    const name  = driverName  || `${driver.firstName} ${driver.lastName}`;
    const phone = driverPhone || driver.phone;

    // Write to both driver sub-object (new) and flat fields (legacy compat)
    order.driver = {
      id:      driverId,
      name,
      phone,
      vehicle: driver.vehicleModel
        ? `${driver.vehicleColor || ''} ${driver.vehicleModel}`.trim()
        : driver.vehicleType,
    };
    order.driverName       = name;
    order.driverPhone      = phone;
    order.driverAssignedAt = new Date();
    order.status           = 'Cargo on Route';
    order.cancellable      = false;
    order.trackingEnabled  = true;

    await order.save();

    // Update driver's currentDelivery + status
    await Driver.findByIdAndUpdate(driverId, {
      status:          'on-delivery',
      isAvailable:     false,
      currentDelivery: order._id,
      lastActive:      new Date(),
    });

    // Emit real-time event to admin / customer via Socket.IO if io is available
    const io = req.app.get('io');
    if (io) {
      io.emit('ORDER_STATUS_UPDATE', { orderId: order._id, status: order.status, driver: order.driver });
    }

    console.log(`✅ Order ${order._id} accepted by driver ${driverId}`);

    res.json({ success: true, message: 'Order accepted! Start your delivery.', order });
  } catch (error) {
    console.error('❌ acceptOrder error:', error);
    res.status(500).json({ success: false, message: 'Failed to accept order', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/drivers/:orderId/status   (requires driverAuth)
// Body: { status: 'Delivered' }
// Only "Delivered" is accepted from the driver side for safety
// ─────────────────────────────────────────────────────────────────────────────
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status }  = req.body;
    const driverId    = req.driverId;

    // Drivers may only mark as Delivered
    if (status !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Drivers can only set status to "Delivered".',
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Ensure the order belongs to this driver
    if (order.driver?.id !== driverId) {
      return res.status(403).json({
        success: false,
        message: 'This order is not assigned to you.',
      });
    }

    order.status              = 'Delivered';
    order.cancellable         = false;
    order.trackingEnabled     = false;
    order.actualDeliveryTime  = new Date();

    // Auto-mark COD orders as paid on delivery
    if (order.paymentMethod === 'cod') {
      order.paymentStatus = 'Paid';
    }

    await order.save();

    // Free driver back to available
    await Driver.findByIdAndUpdate(driverId, {
      status:          'active',
      isAvailable:     true,
      currentDelivery: null,
      lastActive:      new Date(),
      $inc:            { 'performance.completedDeliveries': 1, 'performance.totalDeliveries': 1 },
    });

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('ORDER_STATUS_UPDATE', { orderId: order._id, status: 'Delivered' });
      io.emit('DELIVERY_STATUS_UPDATE', { orderId: order._id, status: 'Delivered' }); // customer tracking
    }

    console.log(`✅ Order ${order._id} marked Delivered by driver ${driverId}`);

    res.json({ success: true, message: 'Order marked as delivered!', order });
  } catch (error) {
    console.error('❌ updateDeliveryStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/drivers/location   (requires driverAuth)
// Body: { orderId, latitude, longitude }
// Driver app pushes GPS update every 5 s via both REST + Socket.IO
// ─────────────────────────────────────────────────────────────────────────────
export const updateLocation = async (req, res) => {
  try {
    const { orderId, latitude, longitude } = req.body;
    const driverId = req.driverId;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'latitude and longitude required.' });
    }

    // Persist location to Driver doc
    await Driver.findByIdAndUpdate(driverId, {
      currentLocation:    { type: 'Point', coordinates: [longitude, latitude] },
      lastLocationUpdate: new Date(),
      lastActive:         new Date(),
    });

    // Persist to Order.currentDriverLocation for historical trail
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        currentDriverLocation: { latitude, longitude, timestamp: new Date() },
      });
    }

    // Broadcast to admin and customer via Socket.IO
    const io = req.app.get('io');
    if (io && orderId) {
      io.emit('DRIVER_LOCATION_UPDATE', {
        orderId,
        driverId,
        location: { lat: latitude, lng: longitude },
        timestamp: new Date(),
      });
    }

    res.json({ success: true, message: 'Location updated.' });
  } catch (error) {
    console.error('❌ updateLocation error:', error);
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/drivers/stats   (admin — no auth guard added here, add if needed)
// ─────────────────────────────────────────────────────────────────────────────
export const getDriverStats = async (req, res) => {
  try {
    const [total, active, onDelivery, offline] = await Promise.all([
      Driver.countDocuments(),
      Driver.countDocuments({ status: 'active', isAvailable: true }),
      Driver.countDocuments({ status: 'on-delivery' }),
      Driver.countDocuments({ status: 'offline' }),
    ]);

    res.json({ success: true, data: { total, active, onDelivery, offline } });
  } catch (error) {
    console.error('❌ getDriverStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/drivers   (admin)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllDrivers = async (req, res) => {
  try {
    const { status, available } = req.query;
    const query = {};
    if (status)    query.status      = status;
    if (available !== undefined) query.isAvailable = available === 'true';

    const drivers = await Driver.find(query)
      .populate('currentDelivery', 'status customerName totalAmount')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: drivers.length, drivers });
  } catch (error) {
    console.error('❌ getAllDrivers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch drivers' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/drivers   (admin: create driver)
// ─────────────────────────────────────────────────────────────────────────────
export const createDriver = async (req, res) => {
  try {
    const { password, ...rest } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    // Auto-generate profile image from initials
    const initials = `${rest.firstName?.charAt(0) || 'D'}${rest.lastName?.charAt(0) || 'R'}`;
    const profileImage = `https://ui-avatars.com/api/?name=${initials}&background=10b981&color=fff&size=150&bold=true`;

    const driver = new Driver({ ...rest, password, profileImage });
    await driver.save(); // pre-save hook hashes password + generates driverId

    res.status(201).json({
      success: true,
      message: `Driver ${driver.driverId} created successfully.`,
      driver:  safeDriver(driver),
    });
  } catch (error) {
    console.error('❌ createDriver error:', error);
    // Duplicate key errors (email / phone already used)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ success: false, message: `${field} is already registered.` });
    }
    res.status(500).json({ success: false, message: 'Failed to create driver', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/drivers/:id   (admin: update driver)
// ─────────────────────────────────────────────────────────────────────────────
export const updateDriver = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    const driver = await Driver.findById(req.params.id).select('+password');
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }

    Object.assign(driver, updateData);
    if (password) driver.password = password; // pre-save hook hashes it

    await driver.save();

    res.json({ success: true, message: 'Driver updated.', driver: safeDriver(driver) });
  } catch (error) {
    console.error('❌ updateDriver error:', error);
    res.status(500).json({ success: false, message: 'Failed to update driver' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/drivers/:id   (admin)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }
    res.json({ success: true, message: 'Driver removed successfully.' });
  } catch (error) {
    console.error('❌ deleteDriver error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete driver' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/drivers/seed   (dev / initial setup)
// Seeds 3 sample drivers so you can test login immediately.
// Default password for all: driver123
// ─────────────────────────────────────────────────────────────────────────────
export const seedDrivers = async (req, res) => {
  try {
    const existing = await Driver.countDocuments();
    if (existing > 0) {
      return res.json({
        success: true,
        message: `${existing} drivers already exist. Skipping seed.`,
        hint:    'DELETE /api/drivers/seed?force=true to re-seed.',
      });
    }

    const samples = [
      {
        firstName: 'John',      lastName: 'Mwangi',
        email: 'john.mwangi@bens.com', phone: '+254712345678',
        password: 'driver123',
        licenseNumber: 'DL123456', vehicleType: 'motorcycle',
        vehicleRegistration: 'KAA 123B', vehicleModel: 'Honda CB150', vehicleColor: 'Red',
        status: 'active', isAvailable: true,
        currentLocation: { type: 'Point', coordinates: [36.8219, -1.2921] },
      },
      {
        firstName: 'Mary',      lastName: 'Kamau',
        email: 'mary.kamau@bens.com', phone: '+254723456789',
        password: 'driver123',
        licenseNumber: 'DL234567', vehicleType: 'car',
        vehicleRegistration: 'KBB 234C', vehicleModel: 'Toyota Vitz', vehicleColor: 'Blue',
        status: 'active', isAvailable: true,
        currentLocation: { type: 'Point', coordinates: [36.8300, -1.2800] },
      },
      {
        firstName: 'Peter',     lastName: 'Ochieng',
        email: 'peter.ochieng@bens.com', phone: '+254734567890',
        password: 'driver123',
        licenseNumber: 'DL345678', vehicleType: 'motorcycle',
        vehicleRegistration: 'KCC 345D', vehicleModel: 'Yamaha YBR', vehicleColor: 'Black',
        status: 'offline', isAvailable: false,
        currentLocation: { type: 'Point', coordinates: [36.8100, -1.3000] },
      },
    ];

    // Use create() so the pre-save hook runs per document (hashes passwords + generates IDs)
    const created = [];
    for (const d of samples) {
      const doc = new Driver(d);
      await doc.save();
      created.push(safeDriver(doc));
    }

    console.log(`✅ Seeded ${created.length} sample drivers`);

    res.status(201).json({
      success: true,
      count:   created.length,
      drivers: created,
      message: 'Sample drivers created. Login with phone + password "driver123".',
    });
  } catch (error) {
    console.error('❌ seedDrivers error:', error);
    res.status(500).json({ success: false, message: 'Failed to seed drivers', error: error.message });
  }
};
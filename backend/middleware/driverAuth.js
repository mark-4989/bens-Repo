// backend/middleware/driverAuth.js
// ═══════════════════════════════════════════════════════════════════════════════
// JWT auth middleware for /api/drivers/* routes.
// Sets req.driverId (string) and req.driver (lean object) on every protected call.
// Uses the same JWT_SECRET as the rest of the app — no new env var needed.
// ═══════════════════════════════════════════════════════════════════════════════
import jwt        from 'jsonwebtoken';
import Driver     from '../models/DriverModel.js';

const driverAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Driver token required. Please log in.',
      });
    }

    const token = authHeader.slice(7); // strip "Bearer "

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired driver token. Please log in again.',
      });
    }

    // Verify driver still exists in DB (catches deleted accounts)
    const driver = await Driver.findById(decoded.driverId).lean();
    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Driver account not found.',
      });
    }

    req.driverId = driver._id.toString();
    req.driver   = driver; // full lean object available in controller
    next();
  } catch (error) {
    console.error('❌ driverAuth error:', error);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

export default driverAuth;
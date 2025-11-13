// backend/routes/TrackingRoutes.js
// ✅ Create this file in your backend/routes/ folder

import express from 'express';
import Order from '../models/OrderModel.js'; // Adjust path if needed

const trackingRouter = express.Router();

// ✅ In-memory storage for real-time tracking data
// For production, use Redis or MongoDB
const trackingData = new Map();

/**
 * UPDATE DRIVER LOCATION
 * POST /api/tracking/update
 * Body: { orderId, driverId, currentLocation, speed, heading }
 */
trackingRouter.post('/update', async (req, res) => {
  try {
    const { orderId, driverId, currentLocation, speed, heading, timestamp } = req.body;

    console.log('📍 Location update received:', {
      orderId,
      driverId,
      location: currentLocation
    });

    if (!orderId || !driverId || !currentLocation) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderId, driverId, currentLocation'
      });
    }

    // Validate location data
    if (!currentLocation.lat || !currentLocation.lng) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location data'
      });
    }

    // Get or create tracking record
    let tracking = trackingData.get(orderId);
    
    if (!tracking) {
      // Get order details from database to get destination
      const order = await Order.findById(orderId);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Create new tracking record
      tracking = {
        orderId,
        driver: {
          id: driverId,
          name: order.driver?.name || 'Driver ' + driverId.slice(-4),
          phone: order.driver?.phone || '+254700000000',
          vehicle: order.driver?.vehicle || 'Vehicle'
        },
        destination: {
          lat: order.deliveryInfo?.latitude || order.address?.latitude || -1.2921,
          lng: order.deliveryInfo?.longitude || order.address?.longitude || 36.8219,
          address: order.address?.street || 'Delivery Address'
        },
        status: 'active',
        startedAt: new Date()
      };
    }

    // Update current location
    tracking.currentLocation = {
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      accuracy: currentLocation.accuracy || 0
    };
    tracking.speed = speed || 0;
    tracking.heading = heading || 0;
    tracking.lastUpdated = timestamp || new Date().toISOString();

    // Calculate ETA
    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      tracking.destination.lat,
      tracking.destination.lng
    );
    
    const avgSpeed = speed > 0 ? speed : 30; // Assume 30 km/h if no speed
    tracking.eta = Math.round((distance / avgSpeed) * 60); // ETA in minutes
    tracking.distance = distance;

    // Save to storage
    trackingData.set(orderId, tracking);

    console.log(`✅ Location updated for order ${orderId}:`, {
      location: currentLocation,
      speed,
      eta: tracking.eta,
      distance: tracking.distance
    });

    res.json({
      success: true,
      message: 'Location updated successfully',
      tracking: {
        eta: tracking.eta,
        distance: tracking.distance,
        speed: tracking.speed
      }
    });

  } catch (error) {
    console.error('❌ Tracking update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tracking data',
      error: error.message
    });
  }
});

/**
 * GET TRACKING DATA FOR ORDER
 * GET /api/tracking/:orderId
 */
trackingRouter.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log('🔍 Tracking data requested for order:', orderId);

    // Get tracking data
    const tracking = trackingData.get(orderId);

    if (!tracking) {
      // Check if order exists and is in transit
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // If order is not in "Cargo on Route" status, tracking is not available
      if (order.status !== 'Cargo on Route') {
        console.log(`⚠️ Order ${orderId} is not in transit. Status: ${order.status}`);
        return res.status(400).json({
          success: false,
          message: `Tracking is not available. Order is currently "${order.status}". Live tracking will be available once the order is "Cargo on Route".`,
          status: order.status
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Tracking data not available yet. Driver has not started tracking.'
      });
    }

    // Check if tracking data is stale (older than 2 minutes)
    const lastUpdate = new Date(tracking.lastUpdated);
    const now = new Date();
    const timeDiff = (now - lastUpdate) / 1000 / 60; // minutes

    if (timeDiff > 2) {
      tracking.stale = true;
      tracking.staleMinutes = Math.round(timeDiff);
    }

    console.log('✅ Tracking data found:', {
      orderId,
      lastUpdate: tracking.lastUpdated,
      eta: tracking.eta
    });

    res.json({
      success: true,
      tracking: {
        orderId: tracking.orderId,
        currentLocation: tracking.currentLocation,
        destination: tracking.destination,
        driver: tracking.driver,
        speed: tracking.speed,
        heading: tracking.heading,
        eta: tracking.eta,
        distance: tracking.distance,
        lastUpdated: tracking.lastUpdated,
        stale: tracking.stale || false,
        staleMinutes: tracking.staleMinutes || 0
      }
    });

  } catch (error) {
    console.error('❌ Tracking fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tracking data',
      error: error.message
    });
  }
});

/**
 * ASSIGN DRIVER TO ORDER
 * POST /api/tracking/assign
 * Body: { orderId, driverId, driverName, driverPhone, vehicle }
 */
trackingRouter.post('/assign', async (req, res) => {
  try {
    const { orderId, driverId, driverName, driverPhone, vehicle } = req.body;

    console.log('🚗 Assigning driver to order:', { orderId, driverId, driverName });

    if (!orderId || !driverId) {
      return res.status(400).json({
        success: false,
        message: 'Missing orderId or driverId'
      });
    }

    // Update order with driver info
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        driver: {
          id: driverId,
          name: driverName || 'Driver',
          phone: driverPhone || '',
          vehicle: vehicle || 'N/A'
        },
        driverAssignedAt: new Date(),
        trackingEnabled: true // Enable tracking
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('✅ Driver assigned successfully');

    res.json({
      success: true,
      message: 'Driver assigned successfully',
      order
    });

  } catch (error) {
    console.error('❌ Driver assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign driver',
      error: error.message
    });
  }
});

/**
 * CLEAR TRACKING DATA (for testing or when delivery complete)
 * DELETE /api/tracking/:orderId
 */
trackingRouter.delete('/:orderId', (req, res) => {
  const { orderId } = req.params;
  
  if (trackingData.has(orderId)) {
    trackingData.delete(orderId);
    console.log('🗑️ Tracking data cleared for order:', orderId);
    res.json({
      success: true,
      message: 'Tracking data cleared'
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'No tracking data found for this order'
    });
  }
});

/**
 * GET ALL ACTIVE TRACKING SESSIONS (for debugging)
 * GET /api/tracking/active/all
 */
trackingRouter.get('/active/all', (req, res) => {
  const activeSessions = Array.from(trackingData.entries()).map(([orderId, data]) => ({
    orderId,
    driver: data.driver?.name,
    lastUpdated: data.lastUpdated,
    eta: data.eta,
    speed: data.speed
  }));

  res.json({
    success: true,
    count: activeSessions.length,
    sessions: activeSessions
  });
});

// ✅ Helper function to calculate distance (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // Distance in km
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

export default trackingRouter;
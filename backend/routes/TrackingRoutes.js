// backend/routes/TrackingRoute.js
import express from "express";
import { verifyClerkToken } from "../middleware/verifyClerkToken.js";
import Order from "../models/OrderModel.js";
import adminAuth from "../middleware/requireAdmin.js";

const trackingRouter = express.Router();

// Store active tracking sessions (in production, use Redis)
const activeTracks = new Map();

// Get tracking data for an order
trackingRouter.get("/:orderId", verifyClerkToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.userId;

    const order = await Order.findOne({ _id: orderId, userId });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or access denied"
      });
    }

    if (order.status !== "Cargo on Route") {
      return res.status(400).json({
        success: false,
        message: "Order is not currently in transit",
        status: order.status
      });
    }

    let trackingData = activeTracks.get(orderId);
    
    if (!trackingData) {
      trackingData = {
        orderId,
        driver: {
          name: order.driverName || "Driver",
          phone: order.driverPhone || "+254700000000",
          vehicle: order.vehicleNumber || "KXX-000X"
        },
        currentLocation: order.warehouseLocation || {
          lat: -1.2864,
          lng: 36.8172
        },
        destination: order.deliveryLocation || {
          lat: order.address?.latitude || -1.2921,
          lng: order.address?.longitude || 36.8219
        },
        eta: order.estimatedDeliveryTime || 30,
        lastUpdated: new Date(),
        speed: 0,
        heading: 0
      };
      activeTracks.set(orderId, trackingData);
    }

    res.json({
      success: true,
      tracking: trackingData
    });
  } catch (error) {
    console.error("❌ Tracking fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tracking data"
    });
  }
});

// Update driver location (Admin/Driver app)
trackingRouter.post("/:orderId/update", adminAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { latitude, longitude, speed, heading } = req.body;

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const trackingData = activeTracks.get(orderId) || {};
    trackingData.currentLocation = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude)
    };
    trackingData.speed = speed || 0;
    trackingData.heading = heading || 0;
    trackingData.lastUpdated = new Date();

    if (trackingData.destination) {
      const distance = calculateDistance(
        trackingData.currentLocation,
        trackingData.destination
      );
      trackingData.eta = speed > 0 ? Math.round((distance / speed) * 60) : 30;
    }

    activeTracks.set(orderId, trackingData);

    order.currentDriverLocation = {
      latitude,
      longitude,
      timestamp: new Date()
    };
    await order.save();

    res.json({
      success: true,
      message: "Location updated",
      tracking: trackingData
    });
  } catch (error) {
    console.error("❌ Location update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update location"
    });
  }
});

// Calculate distance (Haversine formula)
function calculateDistance(point1, point2) {
  const R = 6371;
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

export default trackingRouter;
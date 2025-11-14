// backend/routes/tracking.js
const express = require("express");
const router = express.Router();
const { clerkClient, requireAuth } = require("@clerk/clerk-sdk-node");
const Order = require("../models/Order");

// In-memory storage for active deliveries (replace with Redis in production)
const activeDeliveries = new Map();

// 🚀 GET tracking data for an order
router.get("/:orderId", requireAuth(), async (req, res) => {
  try {
    const { orderId } = req.params;

    // Fetch the order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order is in transit
    if (order.status !== "Cargo on Route") {
      return res.status(400).json({
        success: false,
        message: `Order is not currently in transit. Current status: ${order.status}`,
        status: order.status,
      });
    }

    // Get tracking data from in-memory storage
    const trackingData = activeDeliveries.get(orderId);

    if (!trackingData) {
      return res.status(404).json({
        success: false,
        message: "Tracking data not available. Driver hasn't started tracking yet.",
      });
    }

    // Return tracking data
    res.json({
      success: true,
      tracking: trackingData,
    });
  } catch (error) {
    console.error("Tracking fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tracking data",
      error: error.message,
    });
  }
});

// 🚀 UPDATE driver location (called by driver's device)
router.post("/update/:orderId", requireAuth(), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { lat, lng, speed, heading } = req.body;

    // Validate input
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    // Fetch the order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Get or create tracking data
    let trackingData = activeDeliveries.get(orderId);

    if (!trackingData) {
      // Initialize tracking data
      trackingData = {
        orderId: orderId,
        driver: {
          name: "Driver", // You can enhance this with actual driver info
          phone: "+254712345678", // Get from order or driver profile
          vehicle: "Toyota Probox KCB 123X",
        },
        currentLocation: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        },
        destination: {
          lat: order.deliveryLocation?.lat || -1.2921, // Use order's delivery location
          lng: order.deliveryLocation?.lng || 36.8219,
        },
        speed: speed || 0,
        heading: heading || 0,
        eta: 25, // Calculate based on distance
        lastUpdated: new Date(),
      };
    } else {
      // Update existing tracking data
      trackingData.currentLocation = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      };
      trackingData.speed = speed || 0;
      trackingData.heading = heading || 0;
      trackingData.lastUpdated = new Date();

      // Recalculate ETA based on distance and speed
      const distance = calculateDistance(
        trackingData.currentLocation,
        trackingData.destination
      );
      trackingData.eta = calculateETA(distance, speed || 30);
    }

    // Store updated tracking data
    activeDeliveries.set(orderId, trackingData);

    res.json({
      success: true,
      message: "Location updated successfully",
      tracking: trackingData,
    });
  } catch (error) {
    console.error("Tracking update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update location",
      error: error.message,
    });
  }
});

// 🚀 START tracking for an order (called when driver accepts delivery)
router.post("/start/:orderId", requireAuth(), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverName, driverPhone, vehicle, destinationLat, destinationLng } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Initialize tracking
    const trackingData = {
      orderId: orderId,
      driver: {
        name: driverName || "Driver",
        phone: driverPhone || "+254712345678",
        vehicle: vehicle || "Delivery Vehicle",
      },
      currentLocation: {
        lat: -1.2921, // Default to Nairobi - driver should update immediately
        lng: 36.8219,
      },
      destination: {
        lat: destinationLat || order.deliveryLocation?.lat || -1.2921,
        lng: destinationLng || order.deliveryLocation?.lng || 36.8219,
      },
      speed: 0,
      heading: 0,
      eta: 30, // Initial estimate
      lastUpdated: new Date(),
    };

    activeDeliveries.set(orderId, trackingData);

    res.json({
      success: true,
      message: "Tracking started successfully",
      tracking: trackingData,
    });
  } catch (error) {
    console.error("Start tracking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start tracking",
      error: error.message,
    });
  }
});

// 🚀 STOP tracking (called when delivery is completed)
router.post("/stop/:orderId", requireAuth(), async (req, res) => {
  try {
    const { orderId } = req.params;

    activeDeliveries.delete(orderId);

    res.json({
      success: true,
      message: "Tracking stopped successfully",
    });
  } catch (error) {
    console.error("Stop tracking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stop tracking",
      error: error.message,
    });
  }
});

// 🛠️ Helper: Calculate distance between two points (Haversine formula)
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // in kilometers
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// 🛠️ Helper: Calculate ETA in minutes
function calculateETA(distanceKm, speedKmh) {
  if (speedKmh === 0) return Math.round(distanceKm * 3); // Assume 20 km/h average
  const hours = distanceKm / speedKmh;
  return Math.round(hours * 60); // Convert to minutes
}

// 🔍 ADMIN: Get all active deliveries
router.get("/admin/active", requireAuth(), async (req, res) => {
  try {
    const activeTrackingData = Array.from(activeDeliveries.entries()).map(
      ([orderId, data]) => ({
        orderId,
        ...data,
      })
    );

    res.json({
      success: true,
      count: activeTrackingData.length,
      deliveries: activeTrackingData,
    });
  } catch (error) {
    console.error("Get active deliveries error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active deliveries",
    });
  }
});

module.exports = router;
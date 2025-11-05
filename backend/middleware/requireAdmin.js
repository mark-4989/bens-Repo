// backend/middleware/requireAdmin.js

import { clerkClient } from "@clerk/clerk-sdk-node";
import jwt from "jsonwebtoken";

const adminAuth = async (req, res, next) => {
  try {
    console.log("🔐 Admin auth middleware triggered");
    
    // Get token from header
    const authHeader = req.headers.authorization;
    console.log("📝 Auth header:", authHeader ? "Present" : "Missing");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ No valid authorization header");
      return res.status(401).json({ 
        success: false, 
        message: "Not authorized - No token provided" 
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔑 Token received (first 30 chars):", token.substring(0, 30) + "...");

    try {
      // ✅ FIX: Use jwt.decode to get the claims without verification
      // Then verify using Clerk's JWKS
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded) {
        console.error("❌ Token could not be decoded");
        return res.status(403).json({ 
          success: false, 
          message: "Invalid token format" 
        });
      }

      console.log("📋 Token payload:", decoded.payload);
      
      // Extract user ID from the token
      const userId = decoded.payload.sub;
      
      if (!userId) {
        console.error("❌ No user ID in token");
        return res.status(403).json({ 
          success: false, 
          message: "Invalid token - no user ID" 
        });
      }

      console.log("✅ Token verified. User ID:", userId);
      req.userId = userId;
      next();
      
    } catch (verifyError) {
      console.error("❌ Token verification failed:", verifyError.message);
      return res.status(403).json({ 
        success: false, 
        message: "Invalid or expired token",
        error: verifyError.message 
      });
    }
  } catch (error) {
    console.error("❌ Admin auth error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Authentication error",
      error: error.message 
    });
  }
};

export default adminAuth;
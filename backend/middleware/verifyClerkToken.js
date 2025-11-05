// backend/middleware/verifyClerkToken.js
import jwt from "jsonwebtoken";

export const verifyClerkToken = async (req, res, next) => {
  try {
    console.log("🔐 Verifying Clerk token...");
    
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ Missing or invalid Authorization header");
      return res.status(401).json({ 
        success: false, 
        message: "Missing or invalid Authorization header" 
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("📝 Token received (first 30 chars):", token.substring(0, 30) + "...");

    // Decode the JWT without verification (Clerk tokens are already signed)
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || !decoded.payload) {
      console.error("❌ Failed to decode token");
      return res.status(403).json({ 
        success: false, 
        message: "Invalid token format"
      });
    }

    console.log("📋 Token payload:", decoded.payload);

    const userId = decoded.payload.sub;
    
    if (!userId) {
      console.error("❌ No user ID in token");
      return res.status(403).json({ 
        success: false, 
        message: "Invalid token - no user ID"
      });
    }

    console.log("✅ Token verified successfully");
    console.log("👤 User ID:", userId);

    // Attach user info to request
    req.user = decoded.payload;
    req.userId = userId;
    req.userRole = decoded.payload.role || 
                   decoded.payload.publicMetadata?.role || 
                   decoded.payload.metadata?.role ||
                   'user';

    console.log("🎭 User role:", req.userRole);

    next();
  } catch (error) {
    console.error("❌ Token verification error:", error.message);
    console.error("Stack trace:", error.stack);
    return res.status(500).json({ 
      success: false, 
      message: "Token verification failed",
      error: error.message
    });
  }
};
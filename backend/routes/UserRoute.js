import express from "express";
import { syncOrUpdateUser, addOrderToUser } from "../controllers/UserController.js";

const router = express.Router();

// Sync or update user data (called after sign up or profile update)
router.post("/sync", syncOrUpdateUser);

// Add order to user's order history
router.post("/add-order", addOrderToUser);

export default router;
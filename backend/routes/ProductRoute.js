import express from "express";
import {
  addProduct,
  listProduct,
  removeProduct,
  singleProduct,
  updateProduct  // ✅ ADD THIS IMPORT
} from "../controllers/ProductController.js";
import upload from "../middleware/Multer.js";
import adminAuth from "../middleware/requireAdmin.js";

const productRouter = express.Router();

// Admin routes (protected with authentication)
productRouter.post(
  "/add",
  adminAuth,
  upload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
    { name: "image4", maxCount: 1 },
  ]),
  addProduct
);

productRouter.post("/remove", adminAuth, removeProduct);

// ✅ ADD THIS: Update product route (for editing)
productRouter.post(
  "/update",
  adminAuth,
  upload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
    { name: "image4", maxCount: 1 },
  ]),
  updateProduct
);

// Public routes (no authentication needed for client frontend)
productRouter.get("/list", listProduct); // ✅ GET - Public access for client
productRouter.post("/list", adminAuth, listProduct); // ✅ POST - Admin access (backward compatible)
productRouter.post("/single", singleProduct);

// Health check for products endpoint
productRouter.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Product routes are working",
    endpoints: {
      public: [
        "GET /api/product/list",
        "POST /api/product/single"
      ],
      admin: [
        "POST /api/product/add",
        "POST /api/product/remove",
        "POST /api/product/update",  // ✅ ADD THIS
        "POST /api/product/list"
      ]
    }
  });
});

export default productRouter;
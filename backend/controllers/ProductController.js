import { v2 as cloudinary } from "cloudinary";
import productModel from "../models/ProductModel.js";

// ✅ ADD PRODUCT - Updated to handle all new fields
const addProduct = async (req, res) => {
  try {
    console.log("📦 Adding new product");
    console.log("📝 Request body:", req.body);
    console.log("🖼️ Files received:", req.files ? Object.keys(req.files) : "No files");

    const {
      name,
      description,
      price,
      category,
      subCategory,
      detailedCategory,
      sizes,
      bestseller,
      // ✅ NEW FIELDS
      isLatestCollection,
      isTrending,
      isNewArrival,
      onPromo,
      discount,
      originalPrice,
      inStock,
      stockQuantity,
      brand,
      ageRestricted,
      minimumAge,
      tags,
      rating,
      reviewCount
    } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category || !subCategory) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, description, price, category, or subCategory"
      });
    }

    // Upload images to Cloudinary
    const image1 = req.files?.image1?.[0];
    const image2 = req.files?.image2?.[0];
    const image3 = req.files?.image3?.[0];
    const image4 = req.files?.image4?.[0];

    const images = [image1, image2, image3, image4].filter((item) => item !== undefined);

    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product image is required"
      });
    }

    console.log(`📤 Uploading ${images.length} images to Cloudinary...`);
    const imagesUrl = await Promise.all(
      images.map(async (item) => {
        let result = await cloudinary.uploader.upload(item.path, {
          resource_type: "image",
          folder: "products"
        });
        return result.secure_url;
      })
    );
    console.log("✅ Images uploaded successfully");

    // Parse arrays/JSON fields
    let parsedSizes = [];
    try {
      parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    } catch (error) {
      console.error("❌ Error parsing sizes:", error);
      return res.status(400).json({
        success: false,
        message: "Invalid sizes format. Must be JSON array."
      });
    }

    // ✅ Parse tags if it's a JSON string
    let parsedTags = [];
    try {
      if (tags) {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      }
    } catch (error) {
      console.error("❌ Error parsing tags:", error);
      parsedTags = [];
    }

    // Create product data object
    const productData = {
      name,
      description,
      price: Number(price),
      image: imagesUrl,
      category,
      subCategory,
      detailedCategory: detailedCategory || "",
      sizes: parsedSizes,
      bestseller: bestseller === "true" || bestseller === true,
      date: Date.now(),
      // ✅ NEW FIELDS
      isLatestCollection: isLatestCollection === "true" || isLatestCollection === true,
      isTrending: isTrending === "true" || isTrending === true,
      isNewArrival: isNewArrival === "true" || isNewArrival === true,
      onPromo: onPromo === "true" || onPromo === true,
      discount: Number(discount) || 0,
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      inStock: inStock === "true" || inStock === true,
      stockQuantity: Number(stockQuantity) || 100,
      brand: brand || "",
      ageRestricted: ageRestricted === "true" || ageRestricted === true,
      minimumAge: Number(minimumAge) || 0,
      tags: parsedTags,
      rating: Number(rating) || 0,
      reviewCount: Number(reviewCount) || 0
    };

    console.log("💾 Saving product to database...");
    const product = new productModel(productData);
    await product.save();

    console.log("✅ Product added successfully:", product._id);
    res.json({
      success: true,
      message: "Product added successfully",
      product
    });

  } catch (error) {
    console.error("❌ Error in addProduct:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add product",
      error: error.message
    });
  }
};

// ✅ UPDATE PRODUCT - Updated to handle all new fields
const updateProduct = async (req, res) => {
  try {
    console.log("✏️ Updating product");
    console.log("📝 Request body:", req.body);

    const {
      id,
      name,
      description,
      price,
      category,
      subCategory,
      detailedCategory,
      sizes,
      bestseller,
      // ✅ NEW FIELDS
      isLatestCollection,
      isTrending,
      isNewArrival,
      onPromo,
      discount,
      originalPrice,
      inStock,
      stockQuantity,
      brand,
      ageRestricted,
      minimumAge,
      tags,
      rating,
      reviewCount
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    // Find existing product
    const existingProduct = await productModel.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Handle image updates if new images provided
    let imagesUrl = existingProduct.image; // Keep existing images by default

    const image1 = req.files?.image1?.[0];
    const image2 = req.files?.image2?.[0];
    const image3 = req.files?.image3?.[0];
    const image4 = req.files?.image4?.[0];

    const newImages = [image1, image2, image3, image4].filter((item) => item !== undefined);

    if (newImages.length > 0) {
      console.log(`📤 Uploading ${newImages.length} new images...`);
      const newImagesUrl = await Promise.all(
        newImages.map(async (item) => {
          let result = await cloudinary.uploader.upload(item.path, {
            resource_type: "image",
            folder: "products"
          });
          return result.secure_url;
        })
      );
      
      // Replace old images with new ones
      imagesUrl = newImagesUrl;
      console.log("✅ New images uploaded");
    }

    // Parse sizes
    let parsedSizes = existingProduct.sizes;
    try {
      if (sizes) {
        parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
      }
    } catch (error) {
      console.error("❌ Error parsing sizes:", error);
    }

    // ✅ Parse tags
    let parsedTags = existingProduct.tags || [];
    try {
      if (tags) {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      }
    } catch (error) {
      console.error("❌ Error parsing tags:", error);
    }

    // Update product data
    const updateData = {
      name: name || existingProduct.name,
      description: description || existingProduct.description,
      price: price ? Number(price) : existingProduct.price,
      image: imagesUrl,
      category: category || existingProduct.category,
      subCategory: subCategory || existingProduct.subCategory,
      detailedCategory: detailedCategory !== undefined ? detailedCategory : existingProduct.detailedCategory,
      sizes: parsedSizes,
      bestseller: bestseller !== undefined ? (bestseller === "true" || bestseller === true) : existingProduct.bestseller,
      // ✅ NEW FIELDS
      isLatestCollection: isLatestCollection !== undefined ? (isLatestCollection === "true" || isLatestCollection === true) : existingProduct.isLatestCollection,
      isTrending: isTrending !== undefined ? (isTrending === "true" || isTrending === true) : existingProduct.isTrending,
      isNewArrival: isNewArrival !== undefined ? (isNewArrival === "true" || isNewArrival === true) : existingProduct.isNewArrival,
      onPromo: onPromo !== undefined ? (onPromo === "true" || onPromo === true) : existingProduct.onPromo,
      discount: discount !== undefined ? Number(discount) : existingProduct.discount,
      originalPrice: originalPrice !== undefined ? (originalPrice ? Number(originalPrice) : undefined) : existingProduct.originalPrice,
      inStock: inStock !== undefined ? (inStock === "true" || inStock === true) : existingProduct.inStock,
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : existingProduct.stockQuantity,
      brand: brand !== undefined ? brand : existingProduct.brand,
      ageRestricted: ageRestricted !== undefined ? (ageRestricted === "true" || ageRestricted === true) : existingProduct.ageRestricted,
      minimumAge: minimumAge !== undefined ? Number(minimumAge) : existingProduct.minimumAge,
      tags: parsedTags,
      rating: rating !== undefined ? Number(rating) : existingProduct.rating,
      reviewCount: reviewCount !== undefined ? Number(reviewCount) : existingProduct.reviewCount
    };

    console.log("💾 Updating product in database...");
    const updatedProduct = await productModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    console.log("✅ Product updated successfully:", updatedProduct._id);
    res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct
    });

  } catch (error) {
    console.error("❌ Error in updateProduct:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message
    });
  }
};

// LIST PRODUCTS - No changes needed
const listProduct = async (req, res) => {
  try {
    console.log("📋 Fetching all products");
    const products = await productModel.find({}).sort({ date: -1 });
    
    console.log(`✅ Found ${products.length} products`);
    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error("❌ Error in listProduct:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message
    });
  }
};

// REMOVE PRODUCT - No changes needed
const removeProduct = async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    console.log("🗑️ Removing product:", id);
    
    const product = await productModel.findByIdAndDelete(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    console.log("✅ Product removed successfully");
    res.json({
      success: true,
      message: "Product removed successfully"
    });
  } catch (error) {
    console.error("❌ Error in removeProduct:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove product",
      error: error.message
    });
  }
};

// SINGLE PRODUCT - No changes needed
const singleProduct = async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    console.log("🔍 Fetching product:", productId);
    const product = await productModel.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    console.log("✅ Product found");
    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error("❌ Error in singleProduct:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message
    });
  }
};

export { addProduct, listProduct, removeProduct, singleProduct, updateProduct };
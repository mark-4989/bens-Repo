import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true 
    },
    image: { 
        type: Array, 
        required: true 
    },
    category: { 
        type: String, 
        required: true,
        enum: [
            'food-cupboard',
            'fresh-foods',
            'baby-kids',
            'electronics',
            'liquor-store',
            'promos',
            'clothing',
            'home-garden',
            'health-beauty',
            'sports-outdoors',
            'other'
        ]
    },
    subCategory: { 
        type: String, 
        required: true
        // Examples of subcategories (can be flexible):
        // food-cupboard: grains-cereals, cooking-oils, canned-foods, spices-seasonings, beverages
        // fresh-foods: fruits-vegetables, meat-poultry, fish-seafood, dairy-products, bakery
        // baby-kids: baby-food-formula, diapers-wipes, baby-care, kids-clothing, toys-games
        // electronics: mobile-phones, computers-laptops, tvs-audio, home-appliances, gaming
        // liquor-store: wines, spirits, beer-cider, liqueurs, bar-accessories
    },
    // NEW: Detailed category for third-level navigation
    detailedCategory: {
        type: String,
        required: false
        // Examples: 'rice', 'beef', 'smartphones', 'red-wine', 'diapers'
    },
    sizes: { 
        type: Array, 
        required: true 
    },
    bestseller: { 
        type: Boolean,
        default: false
    },
    // NEW: Display sections
    isLatestCollection: {
        type: Boolean,
        default: false
    },
    isTrending: {
        type: Boolean,
        default: false
    },
    isNewArrival: {
        type: Boolean,
        default: false
    },
    // NEW: Featured in promotions
    onPromo: {
        type: Boolean,
        default: false
    },
    // NEW: Discount percentage (for promos)
    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    // NEW: Original price (before discount)
    originalPrice: {
        type: Number,
        required: false
    },
    // NEW: Stock availability
    inStock: {
        type: Boolean,
        default: true
    },
    // NEW: Stock quantity
    stockQuantity: {
        type: Number,
        default: 100,
        min: 0
    },
    // NEW: Product brand
    brand: {
        type: String,
        required: false
    },
    // NEW: Age restriction (for liquor store)
    ageRestricted: {
        type: Boolean,
        default: false
    },
    // NEW: Minimum age required
    minimumAge: {
        type: Number,
        required: false,
        default: 0
    },
    // NEW: Product tags for better search
    tags: {
        type: [String],
        default: []
    },
    // NEW: Product rating
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    // NEW: Number of reviews
    reviewCount: {
        type: Number,
        default: 0,
        min: 0
    },
    date: { 
        type: Number, 
        required: true 
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for faster queries
productSchema.index({ category: 1, subCategory: 1 });
productSchema.index({ name: 'text', description: 'text' }); // For search functionality
productSchema.index({ bestseller: 1 });
productSchema.index({ onPromo: 1 });
productSchema.index({ price: 1 });

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function() {
    if (this.discount > 0 && this.originalPrice) {
        return this.originalPrice - (this.originalPrice * this.discount / 100);
    }
    return this.price;
});

// Method to check if product is available
productSchema.methods.isAvailable = function() {
    return this.inStock && this.stockQuantity > 0;
};

// Static method to get products by category
productSchema.statics.findByCategory = function(category, subCategory = null) {
    const query = { category };
    if (subCategory) {
        query.subCategory = subCategory;
    }
    return this.find(query);
};

// Static method to get promotional products
productSchema.statics.getPromotions = function() {
    return this.find({ onPromo: true, inStock: true });
};

// Static method to get bestsellers
productSchema.statics.getBestsellers = function(limit = 10) {
    return this.find({ bestseller: true, inStock: true }).limit(limit);
};

const productModel = mongoose.models.product || mongoose.model("product", productSchema);

export default productModel;
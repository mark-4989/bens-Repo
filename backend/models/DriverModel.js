// backend/models/DriverModel.js
// ═══════════════════════════════════════════════════════════════════════════════
// Drivers authenticate with phone + password and receive a JWT.
// Completely separate from Clerk user accounts.
// ═══════════════════════════════════════════════════════════════════════════════
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const driverSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    driverId:  { type: String, unique: true },          // auto-generated DRV-0001
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:     { type: String, required: true, unique: true },
    password:  { type: String, required: true, select: false }, // hidden from all queries

    // ── Vehicle ───────────────────────────────────────────────────────────────
    licenseNumber:       { type: String },
    vehicleType:         { type: String, enum: ['motorcycle', 'bicycle', 'car', 'scooter', 'van'], default: 'motorcycle' },
    vehicleRegistration: { type: String },
    vehicleModel:        { type: String },
    vehicleColor:        { type: String },

    // ── Status ────────────────────────────────────────────────────────────────
    status:      { type: String, enum: ['active', 'inactive', 'on-delivery', 'offline'], default: 'offline' },
    isAvailable: { type: Boolean, default: false },
    isVerified:  { type: Boolean, default: false },

    // ── Live GPS (GeoJSON Point [longitude, latitude]) ─────────────────────────
    currentLocation: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    lastLocationUpdate: { type: Date },

    // ── Currently assigned order ──────────────────────────────────────────────
    currentDelivery: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },

    // ── Performance stats ─────────────────────────────────────────────────────
    performance: {
      totalDeliveries:     { type: Number, default: 0 },
      completedDeliveries: { type: Number, default: 0 },
      cancelledDeliveries: { type: Number, default: 0 },
      averageRating:       { type: Number, default: 0 },
      totalRatings:        { type: Number, default: 0 },
      totalEarnings:       { type: Number, default: 0 },
    },

    profileImage: { type: String, default: '' },
    lastLogin:    { type: Date },
    lastActive:   { type: Date },
    notes:        { type: String },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
driverSchema.index({ currentLocation: '2dsphere' });
driverSchema.index({ status: 1, isAvailable: 1 });

// ── Auto-generate driverId and hash password before first save ────────────────
driverSchema.pre('save', async function (next) {
  if (this.isNew && !this.driverId) {
    const count = await mongoose.model('Driver').countDocuments();
    this.driverId = `DRV-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// ── Virtuals ──────────────────────────────────────────────────────────────────
driverSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Instance methods ──────────────────────────────────────────────────────────
driverSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

driverSchema.methods.updateLocation = function (longitude, latitude) {
  this.currentLocation = { type: 'Point', coordinates: [longitude, latitude] };
  this.lastLocationUpdate = new Date();
};

// ── Static methods ────────────────────────────────────────────────────────────
driverSchema.statics.findNearby = function (longitude, latitude, maxDistance = 5000) {
  return this.find({
    currentLocation: {
      $near: {
        $geometry:   { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: maxDistance,
      },
    },
    isAvailable: true,
    status:      'active',
  });
};

const Driver = mongoose.model('Driver', driverSchema);
export default Driver;
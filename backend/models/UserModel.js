import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true }, // Clerk user ID
  password: { type: String,  required: true}, // Optional: store email for convenience
  cartData: { type: Object,  default: {}}, // Optional: store email for convenience
  name: { type: String,  required: true}, // Optional: store email for convenience
  email: { type: String,required: true, unique:true },  // Optional: store name
  addresses: [{ type: String }], // Example: array of addresses
  orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }], // Example: reference to orders
  // Add any other custom fields you need
},{minimize:false});

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
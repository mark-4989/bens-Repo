import userModel from "../models/UserModel.js";

// Sync Clerk user to DB or update extra data
const syncOrUpdateUser = async (req, res) => {
  const { clerkUserId, email, name, addresses, cartData } = req.body;

  try {
    let user = await userModel.findOne({ clerkUserId });
    if (!user) {
      user = new userModel({ clerkUserId, email, name, addresses, cartData });
    } else {
      // Update extra fields if provided
      if (addresses) user.addresses = addresses;
      if (cartData) user.cartData = cartData;
      if (name) user.name = name;
      if (email) user.email = email;
    }
    await user.save();
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Example: Add order to user history
const addOrderToUser = async (req, res) => {
  const { clerkUserId, orderId } = req.body;

  try {
    const user = await userModel.findOne({ clerkUserId });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.orderHistory.push(orderId);
    await user.save();
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export { syncOrUpdateUser, addOrderToUser };
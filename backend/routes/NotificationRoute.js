// backend/routes/NotificationRoute.js
import express from 'express';
import { verifyClerkToken } from '../middleware/verifyClerkToken.js';
import Notification from '../models/NotificationModel.js';

const router = express.Router();

// Get user notifications
router.get('/', verifyClerkToken, async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.user?.role || req.user?.publicMetadata?.role;

    // If admin, get admin notifications, else get user notifications
    const query = userRole === 'admin' ? { userId: 'admin' } : { userId };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ ...query, read: false });

    res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Mark notification as read
router.put('/:id/read', verifyClerkToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('❌ Mark read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification'
    });
  }
});

// Mark all as read
router.put('/read-all', verifyClerkToken, async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.user?.role || req.user?.publicMetadata?.role;

    const query = userRole === 'admin' ? { userId: 'admin' } : { userId };

    await Notification.updateMany(query, { read: true });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('❌ Mark all read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notifications'
    });
  }
});

// Delete notification
router.delete('/:id', verifyClerkToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    await Notification.findOneAndDelete({ _id: id, userId });

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('❌ Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

export default router;
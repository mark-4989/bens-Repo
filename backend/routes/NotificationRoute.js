// backend/routes/NotificationRoute.js
// ─── REPLACE your existing NotificationRoute.js with this ───────────────────
import express from 'express';
import { verifyClerkToken } from '../middleware/verifyClerkToken.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  deleteNotification,
  clearAllNotifications,
  triggerWelcome,
} from '../controllers/NotificationController.js';

const notificationRouter = express.Router();

// All routes require Clerk authentication
notificationRouter.use(verifyClerkToken);

// GET    /api/notifications               — paginated list
notificationRouter.get('/', getNotifications);

// GET    /api/notifications/unread-count  — badge number
notificationRouter.get('/unread-count', getUnreadCount);

// POST   /api/notifications/welcome       — trigger welcome (call on sign-in)
notificationRouter.post('/welcome', triggerWelcome);

// PUT    /api/notifications/mark-all-read
notificationRouter.put('/mark-all-read', markAllRead);

// DELETE /api/notifications/clear-all
notificationRouter.delete('/clear-all', clearAllNotifications);

// PUT    /api/notifications/:id/read
notificationRouter.put('/:id/read', markAsRead);

// DELETE /api/notifications/:id
notificationRouter.delete('/:id', deleteNotification);

export default notificationRouter;
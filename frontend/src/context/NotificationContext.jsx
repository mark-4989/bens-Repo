// frontend/src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { backendUrl } from '../config';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const [panelOpen, setPanelOpen]         = useState(false);
  const { getToken }  = useAuth();
  const { isSignedIn, user } = useUser();
  const pollRef = useRef(null);

  // ── Fetch notifications ────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken({ template: 'MilikiAPI' });
      const res   = await fetch(`${backendUrl}/api/notifications?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error('❌ fetchNotifications:', err);
    }
  }, [isSignedIn, getToken]);

  // ── Trigger welcome notification on sign-in ────────────────────────────────
  const triggerWelcome = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken({ template: 'MilikiAPI' });
      await fetch(`${backendUrl}/api/notifications/welcome`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: user?.firstName || '' }),
      });
      // Refresh after welcome
      await fetchNotifications();
    } catch (err) {
      console.error('❌ triggerWelcome:', err);
    }
  }, [isSignedIn, getToken, user, fetchNotifications]);

  // ── Mark single as read ────────────────────────────────────────────────────
  const markAsRead = useCallback(async (id) => {
    try {
      const token = await getToken({ template: 'MilikiAPI' });
      await fetch(`${backendUrl}/api/notifications/${id}/read`, {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('❌ markAsRead:', err);
    }
  }, [getToken]);

  // ── Mark all read ──────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    try {
      const token = await getToken({ template: 'MilikiAPI' });
      await fetch(`${backendUrl}/api/notifications/mark-all-read`, {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('❌ markAllRead:', err);
    }
  }, [getToken]);

  // ── Delete single ──────────────────────────────────────────────────────────
  const deleteNotification = useCallback(async (id) => {
    try {
      const token = await getToken({ template: 'MilikiAPI' });
      await fetch(`${backendUrl}/api/notifications/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.filter(n => n._id !== id));
      setUnreadCount(prev => {
        const wasUnread = notifications.find(n => n._id === id && !n.read);
        return wasUnread ? Math.max(0, prev - 1) : prev;
      });
    } catch (err) {
      console.error('❌ deleteNotification:', err);
    }
  }, [getToken, notifications]);

  // ── Clear all ──────────────────────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    try {
      const token = await getToken({ template: 'MilikiAPI' });
      await fetch(`${backendUrl}/api/notifications/clear-all`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('❌ clearAll:', err);
    }
  }, [getToken]);

  // ── Open panel: auto-fetch fresh data ─────────────────────────────────────
  const openPanel = useCallback(() => {
    setPanelOpen(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // ── On sign-in: fetch + trigger welcome ───────────────────────────────────
  useEffect(() => {
    if (isSignedIn) {
      fetchNotifications();
      triggerWelcome();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isSignedIn]);

  // ── Poll every 30s for new notifications ──────────────────────────────────
  useEffect(() => {
    if (!isSignedIn) return;

    pollRef.current = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(pollRef.current);
  }, [isSignedIn, fetchNotifications]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      panelOpen,
      openPanel,
      closePanel: () => setPanelOpen(false),
      markAsRead,
      markAllRead,
      deleteNotification,
      clearAll,
      refresh: fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
// frontend/src/components/NotificationPanel.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Bell, CheckCheck, Trash2,
  Package, CreditCard, Truck, ShoppingBag, AlertCircle, Sparkles
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationPanel.css';

// Map type → lucide icon
const TYPE_ICON = {
  order_placed:    ShoppingBag,
  order_packed:    Package,
  order_on_route:  Truck,
  order_delivered: CheckCheck,
  order_cancelled: AlertCircle,
  driver_assigned: Truck,
  payment_success: CreditCard,
  payment_failed:  AlertCircle,
  payment_pending: CreditCard,
  welcome:         Sparkles,
  promo:           Sparkles,
  general:         Bell,
  new_payment:     CreditCard,
  order_status:    Package,
};

// Map type → accent colour (used for icon tint)
const TYPE_COLOR = {
  order_placed:    '#818cf8',
  order_packed:    '#fbbf24',
  order_on_route:  '#60a5fa',
  order_delivered: '#34d399',
  order_cancelled: '#f87171',
  driver_assigned: '#60a5fa',
  payment_success: '#34d399',
  payment_failed:  '#f87171',
  payment_pending: '#fbbf24',
  welcome:         '#c084fc',
  promo:           '#f472b6',
  general:         '#94a3b8',
};

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const diff  = Date.now() - date;
  if (diff < 60_000)           return 'Just now';
  if (diff < 3_600_000)        return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)       return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000)   return `${Math.floor(diff / 86_400_000)}d ago`;
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
};

/* ── Single notification row ────────────────────────────────────────────── */
const NotificationItem = ({ notification, onRead, onDelete, onNavigate }) => {
  const { _id, type, title, message, icon, read, createdAt, orderId } = notification;
  const IconComp = TYPE_ICON[type] || Bell;
  const color    = TYPE_COLOR[type] || '#94a3b8';

  const handleClick = () => {
    if (!read) onRead(_id);
    if (orderId) onNavigate('/orders1');
  };

  return (
    <div
      className={`notif-item ${read ? 'read' : 'unread'}`}
      onClick={handleClick}
    >
      {!read && <span className="notif-unread-dot" />}

      {/* iOS-style icon square */}
      <div
        className="notif-icon-wrap"
        style={{ background: `${color}18`, borderColor: `${color}28` }}
      >
        {icon
          ? <span className="notif-emoji">{icon}</span>
          : <IconComp size={18} strokeWidth={2.5} color={color} />
        }
      </div>

      <div className="notif-content">
        <p className="notif-title">{title}</p>
        <p className="notif-message">{message}</p>
        <span className="notif-time">{formatTime(createdAt)}</span>
      </div>

      <button
        className="notif-delete-btn"
        onClick={(e) => { e.stopPropagation(); onDelete(_id); }}
        aria-label="Delete"
      >
        <X size={12} strokeWidth={3} />
      </button>
    </div>
  );
};

/* ── Main panel ─────────────────────────────────────────────────────────── */
const NotificationPanel = () => {
  const {
    notifications, unreadCount, panelOpen,
    closePanel, markAsRead, markAllRead,
    deleteNotification, clearAll,
  } = useNotifications();

  const navigate  = useNavigate();
  const panelRef  = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!panelOpen) return;
      if (panelRef.current?.contains(e.target)) return;
      if (e.target.closest('.notif-bell')) return;
      closePanel();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchend', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchend', handler);
    };
  }, [panelOpen, closePanel]);

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closePanel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closePanel]);

  // Group by Today / Earlier
  const grouped = React.useMemo(() => {
    const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0);
    const today  = [];
    const earlier = [];
    notifications.forEach(n =>
      new Date(n.createdAt) >= cutoff ? today.push(n) : earlier.push(n)
    );
    return { today, earlier };
  }, [notifications]);

  return (
    <>
      {panelOpen && <div className="notif-backdrop" onClick={closePanel} />}

      <div ref={panelRef} className={`notif-panel ${panelOpen ? 'open' : ''}`}>

        {/* ── Header ── */}
        <div className="notif-header">
          <div className="notif-header-left">
            <Bell size={17} strokeWidth={2.5} />
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <span className="notif-header-badge">{unreadCount}</span>
            )}
          </div>

          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button className="notif-action-btn" onClick={markAllRead} title="Mark all read">
                <CheckCheck size={13} strokeWidth={2.5} />
                <span>All read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button className="notif-action-btn danger" onClick={clearAll} title="Clear all">
                <Trash2 size={13} strokeWidth={2.5} />
              </button>
            )}
            <button className="notif-close-btn" onClick={closePanel} aria-label="Close">
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="notif-body">
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <div className="notif-empty-icon">
                <Bell size={28} strokeWidth={1.5} />
              </div>
              <p>You're all caught up!</p>
              <span>No notifications yet</span>
            </div>
          ) : (
            <>
              {grouped.today.length > 0 && (
                <div className="notif-group">
                  <div className="notif-group-label">Today</div>
                  {grouped.today.map(n => (
                    <NotificationItem
                      key={n._id}
                      notification={n}
                      onRead={markAsRead}
                      onDelete={deleteNotification}
                      onNavigate={(path) => { navigate(path); closePanel(); }}
                    />
                  ))}
                </div>
              )}
              {grouped.earlier.length > 0 && (
                <div className="notif-group">
                  <div className="notif-group-label">Earlier</div>
                  {grouped.earlier.map(n => (
                    <NotificationItem
                      key={n._id}
                      notification={n}
                      onRead={markAsRead}
                      onDelete={deleteNotification}
                      onNavigate={(path) => { navigate(path); closePanel(); }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
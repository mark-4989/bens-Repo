// frontend/src/components/NotificationPanel.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, Check, CheckCheck, Trash2, Package, CreditCard, Truck, ShoppingBag, AlertCircle, Star } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationPanel.css';

// Map notification type → lucide icon component
const TYPE_ICON = {
  order_placed:    ShoppingBag,
  order_packed:    Package,
  order_on_route:  Truck,
  order_delivered: Check,
  order_cancelled: AlertCircle,
  driver_assigned: Truck,
  payment_success: CreditCard,
  payment_failed:  AlertCircle,
  payment_pending: CreditCard,
  welcome:         Star,
  promo:           Star,
  general:         Bell,
  // legacy
  payment_success: CreditCard,
  new_payment:     CreditCard,
  order_status:    Package,
};

const TYPE_COLOR = {
  order_placed:    '#667eea',
  order_packed:    '#f59e0b',
  order_on_route:  '#3b82f6',
  order_delivered: '#10b981',
  order_cancelled: '#ef4444',
  driver_assigned: '#3b82f6',
  payment_success: '#10b981',
  payment_failed:  '#ef4444',
  payment_pending: '#f59e0b',
  welcome:         '#8b5cf6',
  promo:           '#ec4899',
  general:         '#6b7280',
};

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now  = new Date();
  const diff = now - date; // ms

  if (diff < 60_000)             return 'Just now';
  if (diff < 3_600_000)          return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)         return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000)     return `${Math.floor(diff / 86_400_000)}d ago`;
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
};

const NotificationItem = ({ notification, onRead, onDelete, onNavigate }) => {
  const { _id, type, title, message, icon, read, createdAt, orderId } = notification;
  const IconComponent = TYPE_ICON[type] || Bell;
  const color         = TYPE_COLOR[type] || '#6b7280';

  const handleClick = () => {
    if (!read) onRead(_id);
    if (orderId) onNavigate(`/orders1`);
  };

  return (
    <div
      className={`notif-item ${read ? 'read' : 'unread'}`}
      onClick={handleClick}
    >
      {/* Unread dot */}
      {!read && <span className="notif-unread-dot" />}

      {/* Icon */}
      <div className="notif-icon-wrap" style={{ '--notif-color': color }}>
        <span className="notif-emoji">{icon || '🔔'}</span>
      </div>

      {/* Content */}
      <div className="notif-content">
        <p className="notif-title">{title}</p>
        <p className="notif-message">{message}</p>
        <span className="notif-time">{formatTime(createdAt)}</span>
      </div>

      {/* Delete */}
      <button
        className="notif-delete-btn"
        onClick={(e) => { e.stopPropagation(); onDelete(_id); }}
        aria-label="Delete notification"
      >
        <X size={13} strokeWidth={2.5} />
      </button>
    </div>
  );
};

const NotificationPanel = () => {
  const {
    notifications, unreadCount, panelOpen,
    closePanel, markAsRead, markAllRead, deleteNotification, clearAll,
  } = useNotifications();

  const navigate  = useNavigate();
  const panelRef  = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelOpen && panelRef.current && !panelRef.current.contains(e.target) &&
          !e.target.closest('.notif-trigger-btn')) {
        closePanel();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen, closePanel]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closePanel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closePanel]);

  const grouped = React.useMemo(() => {
    const today     = [];
    const earlier   = [];
    const cutoff    = new Date(); cutoff.setHours(0, 0, 0, 0);

    notifications.forEach(n => {
      new Date(n.createdAt) >= cutoff ? today.push(n) : earlier.push(n);
    });
    return { today, earlier };
  }, [notifications]);

  return (
    <>
      {/* Backdrop */}
      {panelOpen && <div className="notif-backdrop" onClick={closePanel} />}

      {/* Panel */}
      <div ref={panelRef} className={`notif-panel ${panelOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="notif-header">
          <div className="notif-header-left">
            <Bell size={18} strokeWidth={2.5} />
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <span className="notif-header-badge">{unreadCount}</span>
            )}
          </div>
          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button className="notif-action-btn" onClick={markAllRead} title="Mark all read">
                <CheckCheck size={15} strokeWidth={2.5} />
                <span>All read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button className="notif-action-btn danger" onClick={clearAll} title="Clear all">
                <Trash2 size={14} strokeWidth={2.5} />
              </button>
            )}
            <button className="notif-close-btn" onClick={closePanel}>
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="notif-body">
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <div className="notif-empty-icon">
                <Bell size={32} strokeWidth={1.5} />
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
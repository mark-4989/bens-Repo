// frontend/src/components/NotificationBell.jsx
import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useUser } from '@clerk/clerk-react';
import './NotificationBell.css';

const NotificationBell = ({ collapsed = false }) => {
  const { unreadCount, openPanel } = useNotifications();
  const { isSignedIn } = useUser();

  if (!isSignedIn) return null;

  const hasUnread = unreadCount > 0;

  return (
    <button
      className={`notif-bell ${collapsed ? 'collapsed' : ''} ${hasUnread ? 'has-unread' : ''}`}
      onClick={openPanel}
      aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
    >
      <div className="notif-bell-icon-wrap">
        {/* Lucide Bell — purple when there are unreads, grey otherwise */}
        <Bell
          size={22}
          strokeWidth={2.5}
          className="notif-bell-svg"
        />

        {hasUnread && (
          <span className="notif-bell-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {!collapsed && (
          <span className="notif-bell-label">Notifications</span>
        )}
      </div>
    </button>
  );
};

export default NotificationBell;
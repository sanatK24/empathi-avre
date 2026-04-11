import React, { useState } from 'react'
import { useNotificationContext } from '../context/NotificationContext'

function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotificationContext()
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <div className="notification-bell">
      <button className="bell-button" onClick={() => setShowDropdown(!showDropdown)}>
        🔔
        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h4>Notifications</h4>
            <button className="close-btn" onClick={() => setShowDropdown(false)}>✕</button>
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="no-notifications">No notifications</p>
            ) : (
              notifications.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <strong>{notif.title}</strong>
                  <p>{notif.message}</p>
                  <small>{new Date(notif.createdAt).toLocaleString()}</small>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell

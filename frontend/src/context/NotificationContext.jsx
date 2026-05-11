import { createContext, useContext, useMemo, useState } from 'react'

const NotificationContext = createContext(null)

function generateId() {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getInitialNotifications() {
  try {
    const saved = localStorage.getItem('empathi_notifications')
    if (saved && JSON.parse(saved).length > 0) {
      return JSON.parse(saved)
    }
  } catch {
    // Ignore malformed data
  }
  
  // Default welcoming notifications
  return [
    {
      id: 'welcome_1',
      type: 'info',
      title: 'Welcome to EmpathI',
      message: 'Your journey to making a difference starts here. Explore campaigns or find nearby resources.',
      isRead: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'welcome_2',
      type: 'success',
      title: 'Location Detected',
      message: 'We have updated your marketplace results based on your current area in Navi Mumbai.',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 mins ago
    }
  ]
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(getInitialNotifications)

  const addNotification = (type, title, message, relatedEntityId = null) => {
    const notification = {
      id: generateId(),
      type,
      title,
      message,
      relatedEntityId,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
    }

    setNotifications((prev) => {
      const next = [notification, ...prev]
      localStorage.setItem('empathi_notifications', JSON.stringify(next))
      return next
    })

    return notification
  }

  const markAsRead = (notificationId) => {
    setNotifications((prev) => {
      const next = prev.map((notif) =>
        notif.id === notificationId
          ? { ...notif, isRead: true, readAt: new Date().toISOString() }
          : notif,
      )
      localStorage.setItem('empathi_notifications', JSON.stringify(next))
      return next
    })
  }

  const clearNotifications = () => {
    setNotifications([])
    localStorage.removeItem('empathi_notifications')
  }

  const clearRead = () => {
    setNotifications((prev) => {
      const next = prev.filter((n) => !n.isRead)
      localStorage.setItem('empathi_notifications', JSON.stringify(next))
      return next
    })
  }

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  )

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      clearNotifications,
      clearRead,
    }),
    [notifications, unreadCount],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error(
      'useNotificationContext must be used inside NotificationProvider',
    )
  }
  return context
}

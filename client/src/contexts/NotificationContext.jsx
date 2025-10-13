import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';
// Make sure the path is correct for the notificationTriggers file
import { registerNotificationFunctions } from '../utils/notificationTriggers';

// Create context
const NotificationContext = createContext();

// Custom hook to use the notification context
export const useNotifications = () => useContext(NotificationContext);

// Provider component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const currentUser = useSelector(selectCurrentUser);

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (currentUser?.id) {
      const savedNotifications = localStorage.getItem(`notifications_${currentUser.id}`);
      if (savedNotifications) {
        const parsedNotifications = JSON.parse(savedNotifications);
        setNotifications(parsedNotifications);
        setUnreadCount(parsedNotifications.filter(n => !n.read).length);
      }
    }
  }, [currentUser?.id]);

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (currentUser?.id && notifications.length > 0) {
      localStorage.setItem(`notifications_${currentUser.id}`, JSON.stringify(notifications));
    }
  }, [notifications, currentUser?.id]);

  // Add a new notification
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep only the latest 50 notifications
    setUnreadCount(prev => prev + 1);
    
    // Return the notification ID for potential future reference
    return newNotification.id;
  }, []);

  // Mark a notification as read
  const markAsRead = useCallback((id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // Remove a notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      const newNotifications = prev.filter(n => n.id !== id);
      
      // Update unread count if we're removing an unread notification
      if (notification && !notification.read) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
      
      return newNotifications;
    });
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    if (currentUser?.id) {
      localStorage.removeItem(`notifications_${currentUser.id}`);
    }
  }, [currentUser?.id]);

  // Simulate receiving a notification (for testing)
  const simulateNotification = useCallback((type = 'info') => {
    const types = {
      info: { title: 'Information', message: 'This is an informational notification', icon: 'info' },
      success: { title: 'Success', message: 'Operation completed successfully', icon: 'success' },
      warning: { title: 'Warning', message: 'Please be aware of this warning', icon: 'warning' },
      error: { title: 'Error', message: 'An error has occurred', icon: 'error' }
    };
    
    const notification = types[type] || types.info;
    addNotification(notification);
  }, [addNotification]);

  // Register notification functions for global access
  useEffect(() => {
    registerNotificationFunctions({
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAllNotifications
    });
  }, [addNotification, markAsRead, markAllAsRead, removeNotification, clearAllNotifications]);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    simulateNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
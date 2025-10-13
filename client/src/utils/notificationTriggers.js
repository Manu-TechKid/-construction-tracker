import { store } from '../app/store';
import { selectCurrentUser } from '../features/auth/authSlice';

// This utility file provides functions to trigger notifications from anywhere in the app
// without needing direct access to the NotificationContext

// Cache for the notification functions
let notificationFunctions = null;

// Register notification functions from the context
export const registerNotificationFunctions = (functions) => {
  notificationFunctions = functions;
};

// Helper to check if notification functions are available
const ensureNotificationFunctions = () => {
  if (!notificationFunctions) {
    console.warn('Notification functions not registered. Make sure NotificationProvider is mounted.');
    return false;
  }
  return true;
};

// Get current user from Redux store
const getCurrentUser = () => {
  const state = store.getState();
  return selectCurrentUser(state);
};

// Notification trigger functions for different events
export const notifyWorkOrderAssigned = (workOrder, assignedTo) => {
  if (!ensureNotificationFunctions()) return;
  
  const currentUser = getCurrentUser();
  
  // Only notify the assigned worker
  if (currentUser?.id === assignedTo.id) {
    notificationFunctions.addNotification({
      title: 'New Work Order Assigned',
      message: `You've been assigned to work order: ${workOrder.title}`,
      icon: 'assignment'
    });
  }
};

export const notifyWorkOrderStatusChanged = (workOrder, oldStatus, newStatus) => {
  if (!ensureNotificationFunctions()) return;
  
  notificationFunctions.addNotification({
    title: 'Work Order Status Updated',
    message: `Work order "${workOrder.title}" status changed from ${oldStatus} to ${newStatus}`,
    icon: 'info'
  });
};

export const notifyWorkOrderCompleted = (workOrder) => {
  if (!ensureNotificationFunctions()) return;
  
  notificationFunctions.addNotification({
    title: 'Work Order Completed',
    message: `Work order "${workOrder.title}" has been marked as completed`,
    icon: 'success'
  });
};

export const notifyGeofenceViolation = (timeSession, buildingName) => {
  if (!ensureNotificationFunctions()) return;
  
  const currentUser = getCurrentUser();
  
  // Only notify admins and managers
  if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
    notificationFunctions.addNotification({
      title: 'Geofence Violation',
      message: `Worker ${timeSession.workerName} has a geofence violation at ${buildingName}`,
      icon: 'warning'
    });
  }
};

export const notifyNewWorkerRegistration = (worker) => {
  if (!ensureNotificationFunctions()) return;
  
  const currentUser = getCurrentUser();
  
  // Only notify admins
  if (currentUser?.role === 'admin') {
    notificationFunctions.addNotification({
      title: 'New Worker Registration',
      message: `${worker.name} has registered as a new worker`,
      icon: 'info'
    });
  }
};

export const notifyReminderDue = (reminder) => {
  if (!ensureNotificationFunctions()) return;
  
  notificationFunctions.addNotification({
    title: 'Reminder Due',
    message: reminder.description,
    icon: 'alarm'
  });
};

export const notifySystemError = (errorMessage) => {
  if (!ensureNotificationFunctions()) return;
  
  notificationFunctions.addNotification({
    title: 'System Error',
    message: errorMessage,
    icon: 'error'
  });
};
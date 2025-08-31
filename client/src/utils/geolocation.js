/**
 * Geolocation utility functions for the Construction Tracker app
 */

// Default options for geolocation
const defaultOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
};

/**
 * Get the current position of the user
 * @param {Object} options - Geolocation options
 * @returns {Promise<Object>} - A promise that resolves to the position object
 */
export const getCurrentPosition = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(transformPosition(position)),
      (error) => reject(transformError(error)),
      { ...defaultOptions, ...options }
    );
  });
};

/**
 * Watch the user's position
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 * @param {Object} options - Geolocation options
 * @returns {number} - Watch ID that can be used to clear the watch
 */
export const watchPosition = (onSuccess, onError, options = {}) => {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported by your browser'));
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => onSuccess(transformPosition(position)),
    (error) => onError(transformError(error)),
    { ...defaultOptions, ...options }
  );
};

/**
 * Stop watching the user's position
 * @param {number} watchId - The watch ID returned by watchPosition
 */
export const clearPositionWatch = (watchId) => {
  if (navigator.geolocation && watchId) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * Check if geolocation is supported and permission is granted
 * @returns {Promise<{supported: boolean, permission: string>}
 */
export const checkGeolocationPermission = async () => {
  if (!navigator.geolocation) {
    return { supported: false, permission: 'unsupported' };
  }

  try {
    // This is a workaround since the Permissions API is not fully supported
    const permission = await navigator.permissions?.query({ name: 'geolocation' });
    
    if (permission) {
      return {
        supported: true,
        permission: permission.state,
        onPermissionChange: (callback) => {
          permission.onchange = () => callback(permission.state);
        }
      };
    }
    
    // If Permissions API is not available, we'll assume it's not denied
    return { supported: true, permission: 'prompt' };
  } catch (error) {
    console.warn('Error checking geolocation permission:', error);
    return { supported: true, permission: 'prompt' };
  }
};

/**
 * Request geolocation permission by trying to get the current position
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const requestGeolocationPermission = async () => {
  try {
    await getCurrentPosition({ maximumAge: 0, timeout: 100 });
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      code: error.code
    };
  }
};

/**
 * Calculate distance between two coordinates in meters
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

/**
 * Check if a point is within a certain radius of a center point
 * @param {Object} point - The point to check {latitude, longitude}
 * @param {Object} center - The center point {latitude, longitude}
 * @param {number} radius - The radius in meters
 * @returns {boolean} - True if the point is within the radius
 */
export const isWithinRadius = (point, center, radius) => {
  const distance = calculateDistance(
    point.latitude,
    point.longitude,
    center.latitude,
    center.longitude
  );
  return distance <= radius;
};

// Helper function to transform position to a more usable format
const transformPosition = (position) => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  altitude: position.coords.altitude,
  altitudeAccuracy: position.coords.altitudeAccuracy,
  heading: position.coords.heading,
  speed: position.coords.speed,
  timestamp: position.timestamp,
});

// Helper function to transform geolocation error
const transformError = (error) => {
  let message = 'Unable to retrieve your location';
  let code = error.code;
  
  switch (error.code) {
    case error.PERMISSION_DENIED:
      message = 'Location permission denied. Please enable location services in your browser settings.';
      code = 'PERMISSION_DENIED';
      break;
    case error.POSITION_UNAVAILABLE:
      message = 'Location information is unavailable.';
      code = 'POSITION_UNAVAILABLE';
      break;
    case error.TIMEOUT:
      message = 'The request to get user location timed out.';
      code = 'TIMEOUT';
      break;
    default:
      message = 'An unknown error occurred while getting your location.';
      code = 'UNKNOWN_ERROR';
  }
  
  const errorObj = new Error(message);
  errorObj.code = code;
  return errorObj;
};

export default {
  getCurrentPosition,
  watchPosition,
  clearPositionWatch,
  checkGeolocationPermission,
  requestGeolocationPermission,
  calculateDistance,
  isWithinRadius,
};

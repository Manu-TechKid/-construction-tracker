/**
 * Geofencing utility functions for location-based validation
 */

/**
 * Calculate distance between two points using the Haversine formula
 * @param {Number} lat1 - Latitude of first point in degrees
 * @param {Number} lon1 - Longitude of first point in degrees
 * @param {Number} lat2 - Latitude of second point in degrees
 * @param {Number} lon2 - Longitude of second point in degrees
 * @returns {Number} Distance in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if a location is within the specified radius of a target location
 * @param {Object} userLocation - User's current location {latitude, longitude}
 * @param {Object} targetLocation - Target location {latitude, longitude}
 * @param {Number} radiusInMeters - Allowed radius in meters
 * @returns {Boolean} True if within radius, false otherwise
 */
const isWithinRadius = (userLocation, targetLocation, radiusInMeters) => {
  if (!userLocation || !targetLocation) return false;
  
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    targetLocation.latitude,
    targetLocation.longitude
  );
  
  return distance <= radiusInMeters;
};

/**
 * Validate if user is at the correct location for time tracking
 * @param {Object} userLocation - User's current location {latitude, longitude, accuracy}
 * @param {Object} targetLocation - Target location {latitude, longitude}
 * @param {Number} allowedRadius - Allowed radius in meters (default: 100m)
 * @returns {Object} Validation result {valid, distance, message}
 */
const validateLocation = (userLocation, targetLocation, allowedRadius = 100) => {
  if (!userLocation || !targetLocation) {
    return {
      valid: false,
      distance: null,
      message: 'Missing location data'
    };
  }

  // Add accuracy buffer if available
  const effectiveRadius = allowedRadius + (userLocation.accuracy || 0);
  
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    targetLocation.latitude,
    targetLocation.longitude
  );
  
  const valid = distance <= effectiveRadius;
  
  return {
    valid,
    distance,
    message: valid 
      ? 'Location verified successfully' 
      : `Location is ${Math.round(distance - effectiveRadius)}m outside the allowed area`
  };
};

module.exports = {
  calculateDistance,
  isWithinRadius,
  validateLocation
};
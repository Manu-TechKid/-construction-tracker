const Worker = require('../models/Worker');
const { reverseGeocode } = require('../services/geocodingService');
const logger = require('../utils/logger');

// Track active tracking intervals
const activeTrackers = new Map();

/**
 * Middleware to start background location tracking for a worker
 * @param {Object} worker - Worker document
 * @param {Object} req - Express request object
 * @returns {Promise<void>}
 */
const startLocationTracking = async (worker, req) => {
  const workerId = worker._id.toString();
  
  // If already tracking, clear existing interval
  if (activeTrackers.has(workerId)) {
    clearInterval(activeTrackers.get(workerId));
  }
  
  // Get tracking interval from worker preferences or use default (5 minutes)
  const intervalMinutes = worker.preferences?.trackingInterval || 5;
  const intervalMs = intervalMinutes * 60 * 1000;
  
  // Start tracking
  const tracker = setInterval(async () => {
    try {
      // Get current location from request or use last known location
      let location = {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        accuracy: req.body.accuracy
      };
      
      // If no location in request, try to get it from the client
      if (!location.latitude || !location.longitude) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              };
              
              // Add location to worker's history
              await addLocationToWorker(workerId, location, req);
            },
            (error) => {
              logger.error(`Error getting geolocation for worker ${workerId}:`, error);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        }
      } else {
        // Add location to worker's history
        await addLocationToWorker(workerId, location, req);
      }
    } catch (error) {
      logger.error(`Error in location tracking for worker ${workerId}:`, error);
    }
  }, intervalMs);
  
  // Store the interval ID
  activeTrackers.set(workerId, tracker);
  
  // Log tracking start
  logger.info(`Started location tracking for worker ${workerId} (${intervalMinutes} min interval)`);
};

/**
 * Stop location tracking for a worker
 * @param {string} workerId - Worker ID
 */
const stopLocationTracking = (workerId) => {
  if (activeTrackers.has(workerId)) {
    clearInterval(activeTrackers.get(workerId));
    activeTrackers.delete(workerId);
    logger.info(`Stopped location tracking for worker ${workerId}`);
  }
};

/**
 * Add location to worker's history
 * @param {string} workerId - Worker ID
 * @param {Object} location - Location data
 * @param {Object} req - Express request object
 * @returns {Promise<void>}
 */
const addLocationToWorker = async (workerId, location, req) => {
  try {
    const worker = await Worker.findById(workerId);
    if (!worker) {
      logger.error(`Worker not found: ${workerId}`);
      return;
    }
    
    // Add location with device info
    await worker.addLocation({
      ...location,
      deviceInfo: req.deviceInfo,
      activity: 'tracking',
      scheduleId: worker.timeTracking?.checkIn?.scheduleId,
      workOrderId: worker.timeTracking?.checkIn?.workOrderId
    });
    
    logger.debug(`Recorded location for worker ${workerId} at ${location.latitude}, ${location.longitude}`);
  } catch (error) {
    logger.error(`Error adding location for worker ${workerId}:`, error);
  }
};

/**
 * Middleware to handle location tracking for checked-in workers
 * @returns {Function} Express middleware function
 */
const locationTrackingMiddleware = () => {
  return async (req, res, next) => {
    try {
      // Only process if this is an authenticated worker
      if (req.user && req.user.role === 'worker') {
        const worker = await Worker.findOne({ user: req.user.id });
        
        if (worker) {
          // Store device info for this request
          req.deviceInfo = {
            ...req.deviceInfo,
            ip: req.ip,
            timestamp: new Date()
          };
          
          // If worker is checked in, ensure tracking is active
          if (worker.timeTracking?.status === 'checked-in' && !activeTrackers.has(worker._id.toString())) {
            await startLocationTracking(worker, req);
          }
          
          // If worker is checked out, ensure tracking is stopped
          if (worker.timeTracking?.status !== 'checked-in' && activeTrackers.has(worker._id.toString())) {
            stopLocationTracking(worker._id.toString());
          }
        }
      }
      
      next();
    } catch (error) {
      logger.error('Error in location tracking middleware:', error);
      next(); // Don't block the request if tracking fails
    }
  };
};

// Clean up tracking on server shutdown
process.on('SIGINT', () => {
  logger.info('Stopping all location trackers...');
  for (const [workerId, tracker] of activeTrackers.entries()) {
    clearInterval(tracker);
    logger.info(`Stopped tracking for worker ${workerId}`);
  }
  process.exit(0);
});

module.exports = {
  startLocationTracking,
  stopLocationTracking,
  locationTrackingMiddleware
};

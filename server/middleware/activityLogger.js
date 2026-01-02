const ActivityLog = require('../models/ActivityLog');

const logActivity = (entity, action) => async (req, res, next) => {
  try {
    // Proceed with the request first
    const originalJson = res.json;
    res.json = function(data) {
      // Only log successful actions
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const logData = {
          user: req.user?._id,
          action,
          entity,
          entityId: req.params.id || data?.data?._id || req.body?._id,
          details: {
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
          },
        };

        // Avoid logging sensitive information
        if (req.body?.password) {
          logData.details.body = { ...req.body, password: '[REDACTED]' };
        } 

        ActivityLog.create(logData).catch(err => console.error('Failed to log activity:', err));
      }
      return originalJson.call(this, data);
    };

    next();
  } catch (error) {
    console.error('Error in activity logging middleware:', error);
    next(error);
  }
};

module.exports = logActivity;

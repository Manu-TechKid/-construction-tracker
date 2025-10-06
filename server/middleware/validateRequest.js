const { validationResult } = require('express-validator');
const AppError = require('../utils/appError');

/**
 * Middleware to validate request using express-validator
 * If validation fails, it will return a 400 error with the validation errors
 * If validation passes, it will call next()
 */
const validateRequest = (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Format validation errors
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
    
    return next(new AppError('Validation failed', 400, {
      errors: errorMessages
    }));
  }
  
  next();
};

module.exports = validateRequest;

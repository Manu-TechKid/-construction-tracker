const hidePricesFromWorkers = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to filter prices for workers
  res.json = function(data) {
    if (req.user && req.user.role === 'worker') {
      try {
        data = filterPricesFromResponse(data);
      } catch (err) {
        console.error('Error filtering prices from response:', err);
      }
    }
    
    // Call original json method
    return originalJson.call(this, data);
  };
  
  next();
};

const filterPricesFromResponse = (data) => {
  if (!data) return data;
  
  // Handle different response structures
  if (data.data) {
    data.data = filterPriceFields(data.data);
  } else {
    data = filterPriceFields(data);
  }
  
  return data;
};

const filterPriceFields = (obj, seen = new WeakSet()) => {
  if (!obj) return obj;
  
  // If it's an array, filter each item
  if (Array.isArray(obj)) {
    return obj.map(item => filterPriceFields(item, seen));
  }
  
  // If it's an object, remove price fields
  if (typeof obj === 'object') {
    if (seen.has(obj)) return null;
    seen.add(obj);

    if (typeof obj.toObject === 'function') {
      obj = obj.toObject({ virtuals: true, getters: true });
    }

    const filtered = {};
    
    // List of price-related fields to remove
    const priceFields = [
      'estimatedCost',
      'actualCost',
      'laborCost',
      'materialsCost',
      'totalCost',
      'cost',
      'price',
      'amount',
      'hourlyRate',
      'contractAmount',
      'subtotal',
      'tax',
      'total'
    ];

    Object.keys(obj).forEach((key) => {
      if (priceFields.includes(key)) return;
      filtered[key] = obj[key];
    });
    
    // Recursively filter nested objects
    Object.keys(filtered).forEach(key => {
      if (typeof filtered[key] === 'object') {
        filtered[key] = filterPriceFields(filtered[key], seen);
      }
    });
    
    return filtered;
  }
  
  return obj;
};

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  'worker': 1,
  'supervisor': 2,
  'manager': 3,
  'admin': 4,
  'superuser': 5 // Superuser has the highest level of permissions
};

const hasPermission = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

const restrictToRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in'
      });
    }
    
    // Check if user has any of the required roles
    const hasRequiredRole = roles.some(role => {
      // Superuser and admin have all permissions
      if (req.user.role === 'superuser' || req.user.role === 'admin') return true;
      
      // Check based on hierarchy
      return hasPermission(req.user.role, role);
    });
    
    if (!hasRequiredRole) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action',
        requiredRoles: roles,
        yourRole: req.user.role
      });
    }
    
    next();
  };
};

const restrictToUser = (userId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in'
      });
    }

    // Allow admins and superusers to access the route
    if (req.user.role === 'admin' || req.user.role === 'superuser') {
      return next();
    }

    if (req.user.id !== userId) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access this resource.'
      });
    }

    next();
  };
};

module.exports = {
  hidePricesFromWorkers,
  restrictToRoles,
  restrictToUser
};

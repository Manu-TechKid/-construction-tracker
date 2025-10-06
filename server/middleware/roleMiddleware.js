const hidePricesFromWorkers = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to filter prices for workers
  res.json = function(data) {
    if (req.user && req.user.role === 'worker') {
      // Remove price-related fields from response
      data = filterPricesFromResponse(data);
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

const filterPriceFields = (obj) => {
  if (!obj) return obj;
  
  // If it's an array, filter each item
  if (Array.isArray(obj)) {
    return obj.map(item => filterPriceFields(item));
  }
  
  // If it's an object, remove price fields
  if (typeof obj === 'object') {
    const filtered = { ...obj };
    
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
    
    priceFields.forEach(field => {
      delete filtered[field];
    });
    
    // Recursively filter nested objects
    Object.keys(filtered).forEach(key => {
      if (typeof filtered[key] === 'object') {
        filtered[key] = filterPriceFields(filtered[key]);
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
  'admin': 4
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
      // If admin, always allow
      if (req.user.role === 'admin') return true;
      // If manager, allow if required role is manager or below
      if (req.user.role === 'manager' && hasPermission('manager', role)) return true;
      // If supervisor, allow if required role is supervisor or below
      if (req.user.role === 'supervisor' && hasPermission('supervisor', role)) return true;
      // Exact role match
      return req.user.role === role;
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

module.exports = {
  hidePricesFromWorkers,
  restrictToRoles
};

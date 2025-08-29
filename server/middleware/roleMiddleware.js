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

const restrictToRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    
    next();
  };
};

module.exports = {
  hidePricesFromWorkers,
  restrictToRoles
};

const mongoose = require('mongoose');

// Client-specific pricing schema for different companies and buildings
const clientPricingSchema = new mongoose.Schema({
  // Company information
  company: {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['simpson_housing', 'greystar', 'vista', 'other'],
      required: true
    }
  },
  
  // Building reference
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building is required']
  },
  
  // Service categories with pricing
  services: [{
    // Main category (painting, cleaning, repairs, remodeling)
    category: {
      type: String,
      required: true,
      enum: ['painting', 'cleaning', 'repairs', 'remodeling', 'other']
    },
    
    // Subcategory (interior_painting, exterior_painting, deep_cleaning, etc.)
    subcategory: {
      type: String,
      required: true
    },
    
    // Service details
    name: {
      type: String,
      required: true,
      trim: true
    },
    
    description: {
      type: String,
      required: true,
      trim: true
    },
    
    // Pricing structure
    pricing: {
      // Base price per unit
      basePrice: {
        type: Number,
        required: true,
        min: 0
      },
      
      // Unit type (per_room, per_sqft, per_apartment, per_hour, fixed)
      unitType: {
        type: String,
        enum: ['per_room', 'per_sqft', 'per_apartment', 'per_hour', 'fixed'],
        required: true
      },
      
      // Minimum charge
      minimumCharge: {
        type: Number,
        default: 0,
        min: 0
      },
      
      // Maximum charge (optional)
      maximumCharge: {
        type: Number,
        min: 0
      },
      
      // Different pricing for apartment types
      apartmentTypePricing: [{
        apartmentType: {
          type: String,
          enum: ['standard', 'studio', 'loft', 'duplex', 'penthouse', 'other'],
          required: true
        },
        price: {
          type: Number,
          required: true,
          min: 0
        },
        // Additional cost factors
        additionalCosts: [{
          name: String,
          cost: Number,
          description: String
        }]
      }]
    },
    
    // Cost structure (what it costs us)
    cost: {
      laborCost: {
        type: Number,
        default: 0,
        min: 0
      },
      materialCost: {
        type: Number,
        default: 0,
        min: 0
      },
      equipmentCost: {
        type: Number,
        default: 0,
        min: 0
      },
      overheadPercentage: {
        type: Number,
        default: 15, // 15% overhead
        min: 0,
        max: 100
      }
    },
    
    // Service specifications
    specifications: {
      estimatedDuration: {
        type: Number,
        default: 1, // in hours
        min: 0.5
      },
      
      workersRequired: {
        type: Number,
        default: 1,
        min: 1
      },
      
      materialsIncluded: {
        type: Boolean,
        default: true
      },
      
      equipmentIncluded: {
        type: Boolean,
        default: true
      },
      
      notes: {
        type: String,
        trim: true
      }
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true
    },
    
    // Effective dates
    effectiveFrom: {
      type: Date,
      default: Date.now
    },
    
    effectiveTo: {
      type: Date
    }
  }],
  
  // Special terms for this client
  terms: {
    paymentTerms: {
      type: String,
      enum: ['net_15', 'net_30', 'net_60', 'net_90'],
      default: 'net_30'
    },
    
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 50
    },
    
    bulkDiscountThreshold: {
      type: Number,
      default: 0,
      min: 0
    },
    
    bulkDiscountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 30
    },
    
    specialInstructions: {
      type: String,
      trim: true
    }
  },
  
  // Contact information
  contacts: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    
    role: {
      type: String,
      enum: ['property_manager', 'maintenance_supervisor', 'billing_contact', 'other'],
      required: true
    },
    
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    
    phone: {
      type: String,
      trim: true
    },
    
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
clientPricingSchema.index({ building: 1, 'company.type': 1 });
clientPricingSchema.index({ 'services.category': 1, 'services.subcategory': 1 });
clientPricingSchema.index({ isActive: 1 });

// Virtual for calculating total profit margin
clientPricingSchema.virtual('averageProfitMargin').get(function() {
  if (!this.services || this.services.length === 0) return 0;
  
  const margins = this.services.map(service => {
    const totalCost = (service.cost.laborCost || 0) + 
                     (service.cost.materialCost || 0) + 
                     (service.cost.equipmentCost || 0);
    const overhead = totalCost * ((service.cost.overheadPercentage || 0) / 100);
    const totalCostWithOverhead = totalCost + overhead;
    const basePrice = service.pricing.basePrice || 0;
    
    if (basePrice === 0) return 0;
    return ((basePrice - totalCostWithOverhead) / basePrice) * 100;
  });
  
  return margins.reduce((sum, margin) => sum + margin, 0) / margins.length;
});

// Method to get pricing for a specific service
clientPricingSchema.methods.getPricingForService = function(category, subcategory, apartmentType = 'standard') {
  const service = this.services.find(s => 
    s.category === category && 
    s.subcategory === subcategory && 
    s.isActive
  );
  
  if (!service) return null;
  
  // Check for apartment-specific pricing
  const apartmentPricing = service.pricing.apartmentTypePricing.find(
    ap => ap.apartmentType === apartmentType
  );
  
  if (apartmentPricing) {
    return {
      ...service.toObject(),
      pricing: {
        ...service.pricing.toObject(),
        basePrice: apartmentPricing.price,
        additionalCosts: apartmentPricing.additionalCosts || []
      }
    };
  }
  
  return service;
};

// Method to calculate total cost for a service
clientPricingSchema.methods.calculateServiceCost = function(serviceId, quantity = 1, apartmentType = 'standard') {
  const service = this.services.id(serviceId);
  if (!service) return null;
  
  let basePrice = service.pricing.basePrice;
  
  // Check for apartment-specific pricing
  const apartmentPricing = service.pricing.apartmentTypePricing.find(
    ap => ap.apartmentType === apartmentType
  );
  
  if (apartmentPricing) {
    basePrice = apartmentPricing.price;
  }
  
  let totalPrice = basePrice * quantity;
  
  // Apply minimum charge
  if (service.pricing.minimumCharge && totalPrice < service.pricing.minimumCharge) {
    totalPrice = service.pricing.minimumCharge;
  }
  
  // Apply maximum charge
  if (service.pricing.maximumCharge && totalPrice > service.pricing.maximumCharge) {
    totalPrice = service.pricing.maximumCharge;
  }
  
  // Apply client discount
  if (this.terms.discountPercentage > 0) {
    totalPrice = totalPrice * (1 - this.terms.discountPercentage / 100);
  }
  
  // Apply bulk discount if applicable
  if (this.terms.bulkDiscountThreshold > 0 && 
      totalPrice >= this.terms.bulkDiscountThreshold &&
      this.terms.bulkDiscountPercentage > 0) {
    totalPrice = totalPrice * (1 - this.terms.bulkDiscountPercentage / 100);
  }
  
  return {
    basePrice,
    quantity,
    subtotal: basePrice * quantity,
    discount: (basePrice * quantity) - totalPrice,
    total: totalPrice,
    unitType: service.pricing.unitType,
    service: service.toObject()
  };
};

module.exports = mongoose.model('ClientPricing', clientPricingSchema);

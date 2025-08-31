const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Define location schema
const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
    index: '2dsphere'
  },
  accuracy: Number,
  altitude: Number,
  altitudeAccuracy: Number,
  heading: Number,
  speed: Number,
  timestamp: {
    type: Date,
    default: Date.now
  },
  address: String,
  activity: {
    type: String,
    enum: ['check-in', 'check-out', 'tracking', 'manual', 'other'],
    default: 'tracking'
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    os: String,
    browser: String,
    isMobile: Boolean,
    ip: String
  },
  notes: String,
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule'
  },
  workOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder'
  },
  metadata: {
    isBackground: {
      type: Boolean,
      default: false
    },
    source: {
      type: String,
      enum: ['gps', 'network', 'manual', 'other'],
      default: 'gps'
    }
  }
});

// Define time tracking schema
const timeTrackingSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['checked-in', 'checked-out', 'on-break', 'offline'],
    default: 'offline'
  },
  checkIn: {
    timestamp: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      },
      address: String,
      accuracy: Number
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule'
    },
    workOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkOrder'
    },
    notes: String,
    deviceInfo: {}
  },
  checkOut: {
    timestamp: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      },
      address: String,
      accuracy: Number
    },
    notes: String,
    deviceInfo: {}
  },
  duration: Number, // in seconds
  lastUpdated: Date
});

// Define worker schema
const workerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  department: String,
  position: String,
  skills: [String],
  hourlyRate: {
    type: Number,
    default: 0
  },
  hireDate: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  timeTracking: timeTrackingSchema,
  lastKnownLocation: locationSchema,
  locationHistory: [locationSchema],
  preferences: {
    trackingInterval: {
      type: Number,
      min: 1,
      max: 60,
      default: 5 // minutes
    },
    geofence: {
      enabled: Boolean,
      radius: Number, // in meters
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: [Number] // [longitude, latitude]
      },
      address: String
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastActive: Date,
  metadata: {
    lastCheckIn: Date,
    lastCheckOut: Date,
    totalHoursWorked: {
      type: Number,
      default: 0
    },
    jobsCompleted: {
      type: Number,
      default: 0
    },
    averageCheckInTime: Number,
    averageCheckOutTime: Number,
    lastLocationUpdate: Date,
    deviceInfo: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
workerSchema.index({ user: 1 });
workerSchema.index({ 'lastKnownLocation.coordinates': '2dsphere' });
workerSchema.index({ 'locationHistory.timestamp': 1 });
workerSchema.index({ 'timeTracking.status': 1 });

/**
 * Add a location to the worker's history
 * @param {Object} locationData - Location data to add
 * @returns {Promise<Worker>} Updated worker document
 */
workerSchema.methods.addLocation = async function(locationData) {
  const location = {
    type: 'Point',
    coordinates: [locationData.longitude, locationData.latitude],
    accuracy: locationData.accuracy,
    timestamp: new Date(),
    activity: locationData.activity || 'tracking',
    deviceInfo: locationData.deviceInfo || {},
    notes: locationData.notes,
    scheduleId: locationData.scheduleId,
    workOrderId: locationData.workOrderId,
    metadata: {
      isBackground: locationData.metadata?.isBackground || false,
      source: locationData.metadata?.source || 'gps'
    }
  };

  // Add reverse geocoded address if not provided
  if (!locationData.address && locationData.latitude && locationData.longitude) {
    try {
      const { reverseGeocode } = require('../services/geocodingService');
      const geoData = await reverseGeocode(locationData.latitude, locationData.longitude);
      location.address = geoData.formattedAddress;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  } else {
    location.address = locationData.address;
  }

  // Add to location history (limit to 1000 most recent locations)
  this.locationHistory.push(location);
  if (this.locationHistory.length > 1000) {
    this.locationHistory.shift();
  }

  // Update last known location
  this.lastKnownLocation = location;
  this.metadata.lastLocationUpdate = new Date();

  // If worker is checked in, update their current session's last location
  if (this.timeTracking?.status === 'checked-in') {
    this.timeTracking.checkIn.location = {
      type: 'Point',
      coordinates: [locationData.longitude, locationData.latitude],
      address: location.address,
      accuracy: locationData.accuracy
    };
    this.timeTracking.lastUpdated = new Date();
    
    // Update session duration
    if (this.timeTracking.checkIn.timestamp) {
      this.timeTracking.duration = Math.floor((new Date() - this.timeTracking.checkIn.timestamp) / 1000);
    }
  }

  // Update last active time
  this.lastActive = new Date();
  this.isOnline = true;

  return this.save();
};

/**
 * Check in a worker
 * @param {Object} checkInData - Check-in data
 * @returns {Promise<Worker>} Updated worker document
 */
workerSchema.methods.checkIn = async function(checkInData) {
  // Create location object
  const location = {
    type: 'Point',
    coordinates: [checkInData.longitude, checkInData.latitude],
    accuracy: checkInData.accuracy,
    address: checkInData.address,
    timestamp: new Date(),
    activity: 'check-in',
    deviceInfo: checkInData.deviceInfo || {},
    notes: checkInData.notes,
    scheduleId: checkInData.scheduleId,
    workOrderId: checkInData.workOrderId
  };

  // Update time tracking
  this.timeTracking = this.timeTracking || {};
  this.timeTracking.status = 'checked-in';
  this.timeTracking.checkIn = {
    timestamp: new Date(),
    location: {
      type: 'Point',
      coordinates: [checkInData.longitude, checkInData.latitude],
      address: checkInData.address,
      accuracy: checkInData.accuracy
    },
    scheduleId: checkInData.scheduleId,
    workOrderId: checkInData.workOrderId,
    notes: checkInData.notes,
    deviceInfo: checkInData.deviceInfo || {}
  };
  this.timeTracking.duration = 0;
  this.timeTracking.lastUpdated = new Date();

  // Update last known location
  this.lastKnownLocation = location;
  
  // Add to location history
  this.locationHistory = this.locationHistory || [];
  this.locationHistory.push(location);
  if (this.locationHistory.length > 1000) {
    this.locationHistory.shift();
  }

  // Update metadata
  this.metadata = this.metadata || {};
  this.metadata.lastCheckIn = new Date();
  this.metadata.lastLocationUpdate = new Date();
  this.lastActive = new Date();
  this.isOnline = true;

  return this.save();
};

/**
 * Check out a worker
 * @param {Object} checkOutData - Check-out data
 * @returns {Promise<Worker>} Updated worker document
 */
workerSchema.methods.checkOut = async function(checkOutData) {
  if (this.timeTracking?.status !== 'checked-in') {
    throw new Error('Worker is not checked in');
  }

  const now = new Date();
  const sessionDuration = Math.floor((now - this.timeTracking.checkIn.timestamp) / 1000);

  // Create check-out location
  const location = {
    type: 'Point',
    coordinates: [checkOutData.longitude || 0, checkOutData.latitude || 0],
    accuracy: checkOutData.accuracy,
    address: checkOutData.address,
    timestamp: now,
    activity: 'check-out',
    deviceInfo: checkOutData.deviceInfo || {},
    notes: checkOutData.notes,
    scheduleId: this.timeTracking.checkIn.scheduleId,
    workOrderId: this.timeTracking.checkIn.workOrderId
  };

  // Update time tracking
  this.timeTracking.status = 'checked-out';
  this.timeTracking.checkOut = {
    timestamp: now,
    location: {
      type: 'Point',
      coordinates: [checkOutData.longitude || 0, checkOutData.latitude || 0],
      address: checkOutData.address,
      accuracy: checkOutData.accuracy
    },
    notes: checkOutData.notes,
    deviceInfo: checkOutData.deviceInfo || {}
  };
  this.timeTracking.duration = sessionDuration;
  this.timeTracking.lastUpdated = now;

  // Update last known location
  this.lastKnownLocation = location;
  
  // Add to location history
  this.locationHistory = this.locationHistory || [];
  this.locationHistory.push(location);
  if (this.locationHistory.length > 1000) {
    this.locationHistory.shift();
  }

  // Update metadata
  this.metadata = this.metadata || {};
  this.metadata.lastCheckOut = now;
  this.metadata.lastLocationUpdate = now;
  this.metadata.totalHoursWorked = (this.metadata.totalHoursWorked || 0) + (sessionDuration / 3600);
  this.lastActive = now;
  this.isOnline = false;

  return this.save();
};

/**
 * Get worker's current location
 * @returns {Object} Current location or null if not available
 */
workerSchema.methods.getCurrentLocation = function() {
  if (!this.lastKnownLocation) return null;
  
  return {
    type: this.lastKnownLocation.type,
    coordinates: this.lastKnownLocation.coordinates,
    timestamp: this.lastKnownLocation.timestamp,
    address: this.lastKnownLocation.address,
    accuracy: this.lastKnownLocation.accuracy
  };
};

/**
 * Get worker's location history within a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Filtered location history
 */
workerSchema.methods.getLocationHistory = function(startDate, endDate) {
  if (!this.locationHistory || !this.locationHistory.length) return [];
  
  return this.locationHistory.filter(loc => {
    const locDate = new Date(loc.timestamp);
    return (!startDate || locDate >= startDate) && 
           (!endDate || locDate <= endDate);
  });
};

/**
 * Get worker's current session duration in seconds
 * @returns {number} Duration in seconds or 0 if not checked in
 */
workerSchema.methods.getCurrentSessionDuration = function() {
  if (this.timeTracking?.status !== 'checked-in' || !this.timeTracking.checkIn?.timestamp) {
    return 0;
  }
  return Math.floor((new Date() - this.timeTracking.checkIn.timestamp) / 1000);
};

// Create and export the model
const Worker = mongoose.model('Worker', workerSchema);

module.exports = Worker;

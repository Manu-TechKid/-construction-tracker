const mongoose = require('mongoose');

const workPhotoSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: false
  },
  workOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder',
    required: false
  },
  timeSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeSession',
    required: false
  },
  
  // Photo details
  photoUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  
  // Description and notes
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  notes: {
    type: String
  },
  
  // Work details
  workType: {
    type: String,
    enum: ['painting', 'cleaning', 'repair', 'maintenance', 'inspection', 'other'],
    default: 'other'
  },
  apartmentNumber: {
    type: String
  },
  
  // Photo metadata
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  takenAt: {
    type: Date,
    default: Date.now
  },
  fileSize: {
    type: Number // in bytes
  },
  mimeType: {
    type: String
  },
  dimensions: {
    width: Number,
    height: Number
  },
  
  // Location data
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  
  // Admin review
  isReviewed: {
    type: Boolean,
    default: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  adminComments: [{
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true
  }],
  
  // Visibility
  isPublic: {
    type: Boolean,
    default: false
  },
  
  // Quality rating (by admin)
  qualityRating: {
    type: Number,
    min: 1,
    max: 5
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
workPhotoSchema.index({ worker: 1, uploadedAt: -1 });
workPhotoSchema.index({ building: 1, uploadedAt: -1 });
workPhotoSchema.index({ workOrder: 1 });
workPhotoSchema.index({ status: 1 });
workPhotoSchema.index({ isReviewed: 1 });

// Virtual for worker name
workPhotoSchema.virtual('workerName').get(function() {
  return this.worker?.name || 'Unknown';
});

// Virtual for building name
workPhotoSchema.virtual('buildingName').get(function() {
  return this.building?.name || 'No Building';
});

const WorkPhoto = mongoose.model('WorkPhoto', workPhotoSchema);

module.exports = WorkPhoto;

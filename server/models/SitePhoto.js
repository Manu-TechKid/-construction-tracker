const mongoose = require('mongoose');

const annotationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['pen', 'line', 'rectangle', 'circle', 'text', 'measure'],
    required: true
  },
  color: {
    type: String,
    default: '#ff0000'
  },
  lineWidth: {
    type: Number,
    default: 3
  },
  // For pen drawings
  points: [{
    x: Number,
    y: Number
  }],
  // For lines and measurements
  startX: Number,
  startY: Number,
  endX: Number,
  endY: Number,
  // For rectangles
  x: Number,
  y: Number,
  width: Number,
  height: Number,
  // For circles
  radius: Number,
  // For text
  text: String,
  fontSize: Number,
  // For measurements
  value: String,
  unit: String,
  measurement: String
}, { _id: true });

const sitePhotoSchema = new mongoose.Schema({
  building: {
    type: mongoose.Schema.ObjectId,
    ref: 'Building',
    required: [true, 'Site photo must belong to a building']
  },
  originalPhoto: {
    type: String,
    required: [true, 'Original photo is required']
  },
  annotatedPhoto: {
    type: String
  },
  mode: {
    type: String,
    enum: ['estimate', 'inspection', 'progress'],
    default: 'estimate'
  },
  notes: {
    type: String,
    trim: true
  },
  annotations: [annotationSchema],
  timestamp: {
    type: Date,
    default: Date.now
  },
  zoom: {
    type: Number,
    default: 1,
    min: 0.1,
    max: 5
  },
  panOffset: {
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Site photo must have a creator']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
sitePhotoSchema.index({ building: 1, mode: 1 });
sitePhotoSchema.index({ building: 1, timestamp: -1 });
sitePhotoSchema.index({ createdBy: 1 });

// Virtual for annotation count
sitePhotoSchema.virtual('annotationCount').get(function() {
  return this.annotations ? this.annotations.length : 0;
});

// Virtual for photo type display
sitePhotoSchema.virtual('modeDisplay').get(function() {
  const modeMap = {
    estimate: 'Estimate',
    inspection: 'Inspection',
    progress: 'Progress'
  };
  return modeMap[this.mode] || this.mode;
});

// Pre-save middleware to update updatedAt
sitePhotoSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// Static method to get photos by building and mode
sitePhotoSchema.statics.getByBuildingAndMode = function(buildingId, mode) {
  return this.find({ building: buildingId, mode })
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .sort({ timestamp: -1 });
};

// Static method to get photo statistics
sitePhotoSchema.statics.getStats = function(buildingId) {
  return this.aggregate([
    { $match: { building: mongoose.Types.ObjectId(buildingId) } },
    {
      $group: {
        _id: '$mode',
        count: { $sum: 1 },
        latestPhoto: { $max: '$timestamp' },
        totalAnnotations: { $sum: { $size: '$annotations' } }
      }
    },
    {
      $project: {
        mode: '$_id',
        count: 1,
        latestPhoto: 1,
        totalAnnotations: 1,
        _id: 0
      }
    }
  ]);
};

// Instance method to add annotation
sitePhotoSchema.methods.addAnnotation = function(annotation) {
  this.annotations.push(annotation);
  this.updatedAt = Date.now();
  return this.save();
};

// Instance method to remove annotation
sitePhotoSchema.methods.removeAnnotation = function(annotationId) {
  this.annotations.id(annotationId).remove();
  this.updatedAt = Date.now();
  return this.save();
};

// Instance method to update annotation
sitePhotoSchema.methods.updateAnnotation = function(annotationId, updates) {
  const annotation = this.annotations.id(annotationId);
  if (annotation) {
    Object.assign(annotation, updates);
    this.updatedAt = Date.now();
    return this.save();
  }
  throw new Error('Annotation not found');
};

module.exports = mongoose.model('SitePhoto', sitePhotoSchema);

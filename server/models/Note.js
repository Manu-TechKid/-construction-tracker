const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Note title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Note content is required'],
    trim: true
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building is required']
  },
  apartment: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    trim: true,
    default: 'general'
    // Removed enum to allow free-text input
    // Common values: 'general', 'building visit', 'estimate', 'inspection', 'meeting', 'building service'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  color: {
    type: String,
    default: '#1976d2',
    trim: true
    // Accepts hex color codes (e.g., #FF5733) or predefined colors
  },
  estimateStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'not_applicable'],
    default: 'not_applicable'
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'postponed', 'resolved', 'archived', 'processed'],
    default: 'active'
  },
  visitDate: {
    type: Date,
    default: Date.now
  },
  estimateAmount: {
    type: Number
  },
  workers: [{
    type: String,
    trim: true
  }],
  weekStart: {
    type: Date
  },
  weekEnd: {
    type: Date
  },
  processedToWorkOrder: {
    type: Boolean,
    default: false
  },
  workOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder'
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dueDate: Date,
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Text search index for building name matching
noteSchema.index({ 
  title: 'text', 
  content: 'text',
  'building.name': 'text' 
});

// Other indexes
noteSchema.index({ building: 1, status: 1 });
noteSchema.index({ createdBy: 1 });
noteSchema.index({ priority: 1, status: 1 });
noteSchema.index({ weekStart: 1, weekEnd: 1 });
noteSchema.index({ visitDate: 1 });
noteSchema.index({ processedToWorkOrder: 1 });

// Pre-save hook to calculate week start and end dates
noteSchema.pre('save', function(next) {
  if (this.visitDate) {
    const visitDate = new Date(this.visitDate);
    const dayOfWeek = visitDate.getDay();
    
    // Calculate Sunday (start of week)
    const weekStart = new Date(visitDate);
    weekStart.setDate(visitDate.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    // Calculate Saturday (end of week)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    this.weekStart = weekStart;
    this.weekEnd = weekEnd;
  }
  next();
});

// Static method to find building by name and auto-assign
noteSchema.statics.findBuildingByName = async function(buildingName) {
  const Building = mongoose.model('Building');
  
  // Try exact match first
  let building = await Building.findOne({ 
    name: new RegExp(`^${buildingName}$`, 'i') 
  });
  
  // If no exact match, try partial match
  if (!building) {
    building = await Building.findOne({ 
      name: new RegExp(buildingName, 'i') 
    });
  }
  
  return building;
};

// Static method to get notes by week
noteSchema.statics.getByWeek = async function(weekStartDate) {
  const weekStart = new Date(weekStartDate);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return this.find({
    weekStart: weekStart,
    weekEnd: weekEnd
  }).populate('building').sort({ visitDate: 1 });
};

module.exports = mongoose.model('Note', noteSchema);

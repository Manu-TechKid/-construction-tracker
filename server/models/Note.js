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
    enum: ['general', 'maintenance', 'issue', 'reminder', 'inspection', 'visit'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'archived'],
    default: 'active'
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

module.exports = mongoose.model('Note', noteSchema);

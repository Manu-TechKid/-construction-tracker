const mongoose = require('mongoose');

const dropdownOptionSchema = new mongoose.Schema({
  label: {
    type: String,
    required: [true, 'Option label is required'],
    trim: true,
    maxlength: [100, 'Label cannot be longer than 100 characters']
  },
  value: {
    type: String,
    required: [true, 'Option value is required'],
    trim: true,
    maxlength: [50, 'Value cannot be longer than 50 characters']
  },
  color: {
    type: String,
    default: '#1976d2',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  icon: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot be longer than 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { _id: true });

const dropdownConfigSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Dropdown category is required'],
    unique: true,
    trim: true,
    lowercase: true,
    enum: [
      'priority',
      'status',
      'apartment_status',
      'building_type',
      'user_role',
      'payment_status',
      'invoice_status',
      'reminder_type',
      'construction_category'
    ]
  },
  name: {
    type: String,
    required: [true, 'Dropdown name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be longer than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [300, 'Description cannot be longer than 300 characters']
  },
  options: [dropdownOptionSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  isSystemManaged: {
    type: Boolean,
    default: false // If true, only admin can modify
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better performance
dropdownConfigSchema.index({ category: 1 });
dropdownConfigSchema.index({ isActive: 1 });

const DropdownConfig = mongoose.model('DropdownConfig', dropdownConfigSchema);

module.exports = DropdownConfig;

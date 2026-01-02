const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'paid', 'sent'
    ],
  },
  entity: {
    type: String,
    required: true,
    index: true,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'entity',
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);

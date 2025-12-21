const mongoose = require('mongoose');

const checkinSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  checkinTime: {
    type: Date,
    required: true,
  },
  checkoutTime: {
    type: Date,
  },
  checkinLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  checkoutLocation: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
    },
  },
  checkinPhoto: {
    type: String,
  },
  checkoutPhoto: {
    type: String,
  },
  checkinSignature: {
    type: String,
  },
  checkoutSignature: {
    type: String,
  },
  status: {
    type: String,
    enum: ['checked-in', 'checked-out'],
    default: 'checked-in',
  },
}, {
  timestamps: true,
});

checkinSchema.index({ checkinLocation: '2dsphere' });
checkinSchema.index({ checkoutLocation: '2dsphere' });

const Checkin = mongoose.model('Checkin', checkinSchema);

module.exports = Checkin;

const mongoose = require('mongoose');

const checkCounterSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'default',
  },
  count: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.models.CheckCounter || mongoose.model('CheckCounter', checkCounterSchema);

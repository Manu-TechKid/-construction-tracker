const mongoose = require('mongoose');

const invoiceCounterSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
    unique: true,
  },
  count: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.models.InvoiceCounter || mongoose.model('InvoiceCounter', invoiceCounterSchema);

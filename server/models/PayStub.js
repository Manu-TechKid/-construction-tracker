const mongoose = require('mongoose');

const payStubSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
      index: true,
    },
    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },
    payDate: {
      type: Date,
      required: false,
    },
    file: {
      url: { type: String, required: true },
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true },
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

payStubSchema.index({ worker: 1, periodStart: -1, periodEnd: -1 });

const PayStub = mongoose.model('PayStub', payStubSchema);

module.exports = PayStub;

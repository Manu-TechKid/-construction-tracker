const mongoose = require('mongoose');
const CheckCounter = require('./CheckCounter');

const checkLineItemSchema = new mongoose.Schema(
  {
    description: { type: String, trim: true },
    amount: { type: Number, default: 0 },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  },
  { _id: true }
);

const checkSchema = new mongoose.Schema(
  {
    checkNumber: {
      type: String,
      required: false,
      trim: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    checkDate: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: [true, 'Check amount is required'],
      min: [0, 'Amount must be a positive number'],
    },
    memo: {
      type: String,
      trim: true,
    },
    lineItems: [checkLineItemSchema],

    status: {
      type: String,
      enum: ['draft', 'printed', 'voided', 'cleared'],
      default: 'draft',
    },
    printedAt: { type: Date },
    printCount: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    deleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

checkSchema.pre(/^find/, function (next) {
  this.where({ deleted: { $ne: true } });
  next();
});

checkSchema.pre('save', async function (next) {
  if (this.isNew && !this.checkNumber) {
    try {
      const counter = await CheckCounter.findOneAndUpdate(
        { key: 'default' },
        { $inc: { count: 1 } },
        { new: true, upsert: true }
      );

      const n = counter?.count || 0;
      this.checkNumber = String(n).padStart(6, '0');
    } catch (e) {
      this.checkNumber = `CHK-${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.models.Check || mongoose.model('Check', checkSchema);

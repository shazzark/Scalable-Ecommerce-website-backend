const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Order',
      required: [true, 'Payment must belong to an order'],
      unique: true,
    },
    paymentProvider: {
      type: String,
      required: [true, 'Payment must have a provider'],
      enum: ['paystack', 'stripe', 'flutterwave', 'manual'],
      default: 'paystack',
    },
    transactionId: {
      type: String,
      required: [true, 'Payment must have a transaction ID'],
      unique: true,
    },
    status: {
      type: String,
      required: [true, 'Payment must have a status'],
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
    },
    amount: {
      type: Number,
      required: [true, 'Payment must have an amount'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'NGN',
      enum: ['NGN', 'USD', 'EUR', 'GBP'],
    },
    // Paystack specific fields
    paystackReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    paystackAuthorization: {
      authorization_code: String,
      bin: String,
      last4: String,
      exp_month: String,
      exp_year: String,
      channel: String,
      card_type: String,
      bank: String,
      country_code: String,
      brand: String,
      reusable: Boolean,
      signature: String,
      account_name: String,
    },
    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    refundReason: String,
    refundedAt: Date,
    paidAt: Date,
    failedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for faster queries
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ paystackReference: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

// Populate order details
paymentSchema.pre(/^find/, function () {
  this.populate({
    path: 'orderId',
    select: 'userId totalAmount items orderStatus',
  });
  // next();
});

// Update timestamps based on status
paymentSchema.pre('save', function () {
  if (this.isModified('status')) {
    if (this.status === 'success' && !this.paidAt) {
      this.paidAt = Date.now();
    } else if (this.status === 'failed' && !this.failedAt) {
      this.failedAt = Date.now();
    } else if (this.status === 'refunded' && !this.refundedAt) {
      this.refundedAt = Date.now();
    }
  }
  // next();
});

// Update order status when payment status changes
paymentSchema.post('save', async function (doc) {
  const Order = require('./orderModel');

  const statusMap = {
    success: { paymentStatus: 'paid', paidAt: doc.paidAt },
    failed: { paymentStatus: 'failed' },
    refunded: { paymentStatus: 'refunded' },
  };

  if (statusMap[doc.status]) {
    await Order.findByIdAndUpdate(doc.orderId, statusMap[doc.status]);
  }
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;

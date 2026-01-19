const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: [true, 'Order item must reference a product'],
  },
  variant: {
    color: String,
    size: String,
  },
  quantity: {
    type: Number,
    required: [true, 'Order item must have a quantity'],
    min: 1,
  },
  priceAtPurchase: {
    type: Number,
    required: [true, 'Order item must have purchase price'],
  },
  name: String, // Snapshot of product name at time of purchase
});

const shippingAddressSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String,
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a user'],
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: [true, 'Order must have a total amount'],
      min: 0,
    },
    shippingAddress: shippingAddressSchema,
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: ['processing', 'shipped', 'delivered', 'cancelled'],
      default: 'processing',
    },
    paymentMethod: {
      type: String,
      required: [true, 'Order must have a payment method'],
    },
    paidAt: Date,
    deliveredAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for faster queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ orderStatus: 1 });

// Virtual for order summary
orderSchema.virtual('totalItems').get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Populate user and product details
orderSchema.pre(/^find/, function () {
  this.populate({
    path: 'userId',
    select: 'name email',
  }).populate({
    path: 'items.productId',
    select: 'name images',
  });
  // next();
});

// Method to update stock after order
orderSchema.methods.updateProductStock = async function () {
  const Product = require('./productModel');

  for (const item of this.items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stockQuantity: -item.quantity },
    });
  }
};

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;

const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: [true, 'Cart item must reference a product'],
  },
  variant: {
    color: String,
    size: String,
  },
  quantity: {
    type: Number,
    required: [true, 'Cart item must have a quantity'],
    min: 1,
    default: 1,
  },
  priceAtAdd: {
    type: Number,
    required: [true, 'Cart item must have price'],
  },
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Cart must belong to a user'],
      unique: true,
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for total cart value
cartSchema.virtual('totalValue').get(function () {
  return this.items.reduce((total, item) => {
    return total + item.priceAtAdd * item.quantity;
  }, 0);
});

// Virtual for total items count
cartSchema.virtual('totalItems').get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Populate product details automatically
cartSchema.pre(/^find/, function () {
  this.populate({
    path: 'items.productId',
    select: 'name price images stockQuantity',
  });
  // next();
});

// Ensure cart exists for user when they're created (we'll handle this in user middleware)
const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;

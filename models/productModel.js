const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  color: String,
  size: String,
  SKU: {
    type: String,
    unique: true,
    sparse: true,
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A product must have a name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'A product must have a description'],
    },
    cartegory: {
      type: mongoose.Schema.ObjectId,
      ref: 'Cartegory',
      required: [true, 'A product must belong to a category'],
    },
    price: {
      type: Number,
      required: [true, 'A product must have a price'],
      min: 0,
    },
    discountPrice: {
      type: Number,
      min: 0,
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) must be below regular price',
      },
    },
    images: [String],
    ratingsAverage: {
      type: Number,
      default: 0,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    specs: [String],
    stockQuantity: {
      type: Number,
      required: [true, 'A product must have stock quantity'],
      min: 0,
      default: 0,
    },
    variants: [variantSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Index for better search performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ cartegory: 1 }); // ✅ correct

// Virtual for final price (with discount)
productSchema.virtual('finalPrice').get(function () {
  return this.discountPrice || this.price;
});

// Query middleware to populate category
productSchema.pre(/^find/, function () {
  this.populate({
    path: 'cartegory',
    select: 'name',
  });
  // next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;

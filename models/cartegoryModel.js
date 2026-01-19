const mongoose = require('mongoose');

const cartegorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A category must have a name'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'A category must have a description'],
    },
    parentCategory: {
      type: mongoose.Schema.ObjectId,
      ref: 'Cartegory',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for subcategories
cartegorySchema.virtual('subcategories', {
  ref: 'Cartegory',
  foreignField: 'parentCategory',
  localField: '_id',
});

// Prevent circular reference
cartegorySchema.pre('save', function () {
  if (this.parentCategory && this.parentCategory.equals(this._id)) {
    return next(new Error('Category cannot be its own parent'));
  }
  // next();
});

// Index for faster queries
cartegorySchema.index({ parentCategory: 1 });

const Cartegory = mongoose.model('Cartegory', cartegorySchema);
module.exports = Cartegory;

const Category = require('../models/cartegoryModel');
const APIFeatures = require('../utilis/apifeatures');
const catchAsync = require('../utilis/catchAsync');
const AppError = require('../utilis/appError');

exports.getAllCategories = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Category.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const categories = await features.query;

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

exports.getCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id).populate(
    'subcategories',
  );

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      category,
    },
  });
});

exports.createCategory = catchAsync(async (req, res, next) => {
  // Check if parent category exists if provided
  if (req.body.parentCategory) {
    const parent = await Category.findById(req.body.parentCategory);
    if (!parent) {
      return next(new AppError('Parent category not found', 404));
    }
  }

  const newCategory = await Category.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      category: newCategory,
    },
  });
});

exports.updateCategory = catchAsync(async (req, res, next) => {
  // Prevent circular reference
  if (req.body.parentCategory && req.body.parentCategory === req.params.id) {
    return next(new AppError('Category cannot be its own parent', 400));
  }

  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      category,
    },
  });
});

exports.deleteCategory = catchAsync(async (req, res, next) => {
  // Check if category has subcategories
  const hasSubcategories = await Category.findOne({
    parentCategory: req.params.id,
  });
  if (hasSubcategories) {
    return next(
      new AppError(
        'Cannot delete category with subcategories. Delete subcategories first.',
        400,
      ),
    );
  }

  // Check if category has products (you'll need Product model imported)
  const Product = require('../models/productModel');
  const hasProducts = await Product.findOne({ category: req.params.id });
  if (hasProducts) {
    return next(
      new AppError(
        'Cannot delete category with products. Remove products first.',
        400,
      ),
    );
  }

  const category = await Category.findByIdAndDelete(req.params.id);

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get subcategories
exports.getSubcategories = catchAsync(async (req, res, next) => {
  const subcategories = await Category.find({ parentCategory: req.params.id });

  res.status(200).json({
    status: 'success',
    results: subcategories.length,
    data: {
      subcategories,
    },
  });
});

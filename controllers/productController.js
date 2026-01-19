const Product = require('../models/productModel');
const APIFeatures = require('../utilis/apifeatures');
const catchAsync = require('../utilis/catchAsync');
const AppError = require('../utilis/appError');
const fs = require('fs');
const Cartegory = require('../models/cartegoryModel');
const path = require('path');

exports.getAllProducts = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Product.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query;

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
    },
  });
});

exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product,
    },
  });
});

// Create product with image upload
// exports.createProduct = catchAsync(async (req, res, next) => {
//   console.log('📦 Creating product...');
//   console.log('Body:', req.body);
//   console.log('Files:', req.files);

//   // Handle uploaded images
//   if (!req.files || req.files.length === 0) {
//     return next(new AppError('Please upload at least one product image', 400));
//   }

//   // Map uploaded files to image URLs
//   const baseUrl = `${req.protocol}://${req.get('host')}`;

//   req.body.images = req.files.map(
//     (file) => `${baseUrl}/img/products/${file.filename}`,
//   );

//   // Convert price and stockQuantity to numbers
//   if (req.body.price) req.body.price = Number(req.body.price);
//   if (req.body.discountPrice)
//     req.body.discountPrice = Number(req.body.discountPrice);
//   if (req.body.stockQuantity)
//     req.body.stockQuantity = Number(req.body.stockQuantity);
//   if (req.body.ratingsAverage)
//     req.body.ratingsAverage = Number(req.body.ratingsAverage);
//   if (req.body.ratingsQuantity)
//     req.body.ratingsQuantity = Number(req.body.ratingsQuantity);

//   // Handle variants if provided as JSON string
//   if (req.body.variants && typeof req.body.variants === 'string') {
//     try {
//       req.body.variants = JSON.parse(req.body.variants);
//     } catch (err) {
//       return next(new AppError('Invalid variants format', 400));
//     }
//   }

//   console.log('Processed body:', req.body);

//   const newProduct = await Product.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       product: newProduct,
//     },
//   });
// });
exports.createProduct = catchAsync(async (req, res, next) => {
  console.log('📦 Creating product...');
  console.log('Body:', req.body);
  console.log('Files:', req.files);

  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one product image', 400));
  }

  // Map uploaded files to image URLs
  req.body.images = req.files.map((file) => file.path);

  // Convert numbers
  if (req.body.price) req.body.price = Number(req.body.price);
  if (req.body.discountPrice)
    req.body.discountPrice = Number(req.body.discountPrice);
  if (req.body.stockQuantity)
    req.body.stockQuantity = Number(req.body.stockQuantity);
  req.body.ratingsAverage = req.body.ratingsAverage
    ? Number(req.body.ratingsAverage)
    : 0;
  req.body.ratingsQuantity = req.body.ratingsQuantity
    ? Number(req.body.ratingsQuantity)
    : 0;

  // Handle variants JSON
  if (req.body.variants && typeof req.body.variants === 'string') {
    try {
      req.body.variants = JSON.parse(req.body.variants);
    } catch (err) {
      return next(new AppError('Invalid variants format', 400));
    }
  }

  // Handle specs JSON
  if (req.body.specs && typeof req.body.specs === 'string') {
    try {
      req.body.specs = JSON.parse(req.body.specs);
    } catch (err) {
      return next(new AppError('Invalid specs format', 400));
    }
  }
  req.body.specs = req.body.specs || [];

  // Validate category
  if (!req.body.cartegory)
    return next(new AppError('Product must have a category', 400));

  const categoryExists = await Cartegory.findById(req.body.cartegory);
  if (!categoryExists) return next(new AppError('Invalid category ID', 400));

  console.log('Processed body:', req.body);

  const newProduct = await Product.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { product: newProduct },
  });
});

// exports.updateProduct = catchAsync(async (req, res, next) => {
//   // Handle new images if uploaded
//   if (req.files && req.files.length > 0) {
//     req.body.images = req.files.map((file) => `/img/products/${file.filename}`);
//   }

//   const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });

//   if (!product) {
//     return next(new AppError('No product found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       product,
//     },
//   });
// });
exports.updateProduct = catchAsync(async (req, res, next) => {
  if (req.files && req.files.length > 0) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    req.body.images = req.files.map(
      (file) => `${baseUrl}/img/products/${file.filename}`,
    );
  }

  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product,
    },
  });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  // Delete associated images from filesystem
  if (product.images && product.images.length > 0) {
    product.images.forEach((imageUrl) => {
      const filename = imageUrl.split('/').pop();
      const imagePath = path.join(
        __dirname,
        '..',
        'public',
        'img',
        'products',
        filename,
      );

      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) console.error('Failed to delete image:', err);
        });
      }
    });
  }

  await Product.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get products by category
exports.getProductsByCategory = catchAsync(async (req, res, next) => {
  const products = await Product.find({ cartegory: req.params.categoryId });

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
    },
  });
});

// Search products
exports.searchProducts = catchAsync(async (req, res, next) => {
  const { q } = req.query;

  if (!q) {
    return next(new AppError('Please provide a search query', 400));
  }

  const products = await Product.find({
    $text: { $search: q },
  }).select('name price images finalPrice');

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
    },
  });
});

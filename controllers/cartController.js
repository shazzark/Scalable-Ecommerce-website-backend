const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const catchAsync = require('../utilis/catchAsync');
const AppError = require('../utilis/appError');

// Get user's cart
exports.getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ userId: req.user.id });

  // If no cart exists, create one
  if (!cart) {
    cart = await Cart.create({ userId: req.user.id, items: [] });
  }

  res.status(200).json({
    status: 'success',
    data: {
      cart,
    },
  });
});

// Add item to cart
exports.addToCart = catchAsync(async (req, res, next) => {
  const { productId, variant, quantity = 1 } = req.body;

  // 1) Check if product exists and has stock
  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  if (product.stockQuantity < quantity) {
    return next(new AppError('Not enough stock available', 400));
  }

  // 2) Find or create cart
  let cart = await Cart.findOne({ userId: req.user.id });
  if (!cart) {
    cart = await Cart.create({ userId: req.user.id, items: [] });
  }

  // 3) Check if item already exists in cart
  const existingItemIndex = cart.items.findIndex((item) => {
    return (
      item.productId.equals(productId) &&
      JSON.stringify(item.variant) === JSON.stringify(variant)
    );
  });

  const priceToUse = product.discountPrice || product.price;

  if (existingItemIndex > -1) {
    // Update quantity if item exists
    cart.items[existingItemIndex].quantity += quantity;
    cart.items[existingItemIndex].priceAtAdd = priceToUse;
  } else {
    // Add new item
    cart.items.push({
      productId,
      variant: variant || {},
      quantity,
      priceAtAdd: priceToUse,
    });
  }

  await cart.save();

  res.status(200).json({
    status: 'success',
    data: {
      cart,
    },
  });
});

// Update cart item quantity
exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { quantity } = req.body;
  const { itemId } = req.params;

  if (quantity < 1) {
    return next(new AppError('Quantity must be at least 1', 400));
  }

  const cart = await Cart.findOne({ userId: req.user.id });
  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  const itemIndex = cart.items.findIndex((item) => item._id.equals(itemId));
  if (itemIndex === -1) {
    return next(new AppError('Item not found in cart', 404));
  }

  // Check stock
  const product = await Product.findById(cart.items[itemIndex].productId);
  if (product.stockQuantity < quantity) {
    return next(new AppError('Not enough stock available', 400));
  }

  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  res.status(200).json({
    status: 'success',
    data: {
      cart,
    },
  });
});

// Remove item from cart
exports.removeFromCart = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ userId: req.user.id });
  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  const itemIndex = cart.items.findIndex((item) => item._id.equals(itemId));
  if (itemIndex === -1) {
    return next(new AppError('Item not found in cart', 404));
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();

  res.status(200).json({
    status: 'success',
    data: {
      cart,
    },
  });
});

// Clear cart
exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOneAndUpdate(
    { userId: req.user.id },
    { items: [] },
    { new: true },
  );

  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      cart,
    },
  });
});

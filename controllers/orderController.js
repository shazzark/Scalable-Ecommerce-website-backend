const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const APIFeatures = require('../utilis/apifeatures');
const catchAsync = require('../utilis/catchAsync');
const AppError = require('../utilis/appError');

// Create order from cart
exports.createOrder = catchAsync(async (req, res, next) => {
  const { shippingAddress, paymentMethod } = req.body;

  // 1) Get user's cart
  const cart = await Cart.findOne({ userId: req.user.id });
  if (!cart || cart.items.length === 0) {
    return next(new AppError('Cart is empty', 400));
  }

  // 2) Validate stock and prepare order items
  const orderItems = [];
  let totalAmount = 0;

  for (const cartItem of cart.items) {
    const product = await Product.findById(cartItem.productId);

    if (!product) {
      return next(new AppError(`Product ${cartItem.productId} not found`, 404));
    }

    if (product.stockQuantity < cartItem.quantity) {
      return next(new AppError(`Not enough stock for ${product.name}`, 400));
    }

    const priceToUse = product.discountPrice || product.price;
    const itemTotal = priceToUse * cartItem.quantity;

    orderItems.push({
      productId: cartItem.productId,
      variant: cartItem.variant,
      quantity: cartItem.quantity,
      priceAtPurchase: priceToUse,
      name: product.name,
    });

    totalAmount += itemTotal;
  }

  // 3) Create order
  const order = await Order.create({
    userId: req.user.id,
    items: orderItems,
    totalAmount,
    shippingAddress,
    paymentMethod,
    paymentStatus: 'pending', // Will be updated by payment webhook
    orderStatus: 'processing',
  });

  // 4) Clear cart
  await Cart.findOneAndUpdate({ userId: req.user.id }, { items: [] });

  res.status(201).json({
    status: 'success',
    data: {
      order,
    },
  });
});

// Get all orders (admin) or user's orders
exports.getAllOrders = catchAsync(async (req, res, next) => {
  let filter = {};

  // If not admin, only show user's orders
  if (req.user.role !== 'admin') {
    filter.userId = req.user.id;
  }

  const features = new APIFeatures(Order.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const orders = await features.query;

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});

// Get single order
exports.getOrder = catchAsync(async (req, res, next) => {
  let query = Order.findById(req.params.id);

  // If not admin, verify order belongs to user
  if (req.user.role !== 'admin') {
    query = query.where('userId').equals(req.user.id);
  }

  const order = await query;

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      order,
    },
  });
});

// Update order status (admin only)
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { orderStatus } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  // If status changed to shipped/delivered, update timestamps
  if (orderStatus === 'shipped' && order.orderStatus !== 'shipped') {
    // Could send shipping notification here
  }

  if (orderStatus === 'delivered' && order.orderStatus !== 'delivered') {
    order.deliveredAt = Date.now();

    // Update product stock when order is delivered
    await order.updateProductStock();
  }

  order.orderStatus = orderStatus;
  await order.save();

  res.status(200).json({
    status: 'success',
    data: {
      order,
    },
  });
});

// Cancel order (user can cancel if not shipped)
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  // Verify ownership or admin
  if (req.user.role !== 'admin' && !order.userId.equals(req.user.id)) {
    return next(
      new AppError('You are not authorized to cancel this order', 403),
    );
  }

  // Check if order can be cancelled
  if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
    return next(new AppError('Cannot cancel order that has been shipped', 400));
  }

  order.orderStatus = 'cancelled';
  await order.save();

  res.status(200).json({
    status: 'success',
    data: {
      order,
    },
  });
});

// Get user's order stats
exports.getOrderStats = catchAsync(async (req, res, next) => {
  const stats = await Order.aggregate([
    {
      $match: { userId: req.user._id },
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
        avgOrderValue: { $avg: '$totalAmount' },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: stats[0] || { totalOrders: 0, totalSpent: 0, avgOrderValue: 0 },
    },
  });
});

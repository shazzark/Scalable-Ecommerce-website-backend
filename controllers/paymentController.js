const Payment = require('../models/paymentModel');
const Order = require('../models/orderModel');
const APIFeatures = require('../utilis/apifeatures');
const catchAsync = require('../utilis/catchAsync');
const AppError = require('../utilis/appError');
const axios = require('axios');

// Paystack API configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Initialize Paystack payment
exports.initializePaystackPayment = catchAsync(async (req, res, next) => {
  const { orderId, email } = req.body;

  // 1) Verify order exists and belongs to user
  const order = await Order.findOne({
    _id: orderId,
    userId: req.user.id,
  }).populate('userId', 'email name');

  if (!order) {
    return next(new AppError('Order not found or unauthorized', 404));
  }

  // 2) Check if order is already paid
  if (order.paymentStatus === 'paid') {
    return next(new AppError('Order is already paid', 400));
  }

  // 3) Check if payment already exists
  const existingPayment = await Payment.findOne({ orderId });
  if (existingPayment) {
    // If payment is pending, return existing payment
    if (existingPayment.status === 'pending') {
      return res.status(200).json({
        status: 'success',
        data: {
          payment: existingPayment,
          authorizationUrl: existingPayment.providerResponse.authorization_url,
        },
      });
    }
  }

  // 4) Generate unique reference
  const reference = `ORDER-${orderId}-${Date.now()}`;

  // 5) Call Paystack API
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: email || order.userId.email,
        amount: order.totalAmount * 100, // Paystack expects amount in kobo
        reference,
        callback_url: `${req.protocol}://${req.get('host')}/api/payments/verify-paystack`,
        metadata: {
          orderId: orderId.toString(),
          userId: req.user.id.toString(),
          custom_fields: [
            {
              display_name: 'Customer Name',
              variable_name: 'customer_name',
              value: order.userId.name,
            },
            {
              display_name: 'Order ID',
              variable_name: 'order_id',
              value: orderId,
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    // 6) Create payment record
    // After creating payment, add paystackReference
    const payment = await Payment.create({
      orderId,
      paymentProvider: 'paystack',
      transactionId: reference,
      paystackReference: reference, // Add this
      amount: order.totalAmount,
      currency: 'NGN',
      status: 'pending',
      providerResponse: response.data.data,
    });

    res.status(201).json({
      status: 'success',
      data: {
        payment,
        authorizationUrl: response.data.data.authorization_url,
      },
    });
  } catch (error) {
    console.error(
      'Paystack initialization error:',
      error.response?.data || error.message,
    );
    return next(new AppError('Payment initialization failed', 500));
  }
});

// Verify Paystack payment
// Verify Paystack payment
exports.verifyPaystackPayment = catchAsync(async (req, res, next) => {
  const { reference } = req.query;

  if (!reference) {
    return next(new AppError('No reference provided', 400));
  }

  // 1) Find payment by transactionId OR paystackReference
  const payment = await Payment.findOne({
    $or: [{ transactionId: reference }, { paystackReference: reference }],
  });

  if (!payment) {
    return next(new AppError('Payment not found', 404));
  }

  // 2) Call Paystack to verify
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const verificationData = response.data.data;

    // 3) Update payment status based on Paystack response
    if (verificationData.status === 'success') {
      payment.status = 'success';
      payment.providerResponse = verificationData;

      // Store Paystack authorization details if available
      if (verificationData.authorization) {
        payment.paystackAuthorization = verificationData.authorization;
      }

      // Update order status
      await Order.findByIdAndUpdate(payment.orderId, {
        paymentStatus: 'paid',
        paidAt: new Date(),
      });
    } else {
      payment.status = 'failed';
      payment.providerResponse = verificationData;

      await Order.findByIdAndUpdate(payment.orderId, {
        paymentStatus: 'failed',
      });
    }

    await payment.save();

    // 4) Redirect or return response
    if (req.query.redirect === 'true') {
      // Redirect to frontend success/failure page
      const redirectUrl =
        payment.status === 'success'
          ? `${process.env.FRONTEND_URL}/order-success?order=${payment.orderId}`
          : `${process.env.FRONTEND_URL}/order-failed?order=${payment.orderId}`;

      return res.redirect(redirectUrl);
    }

    res.status(200).json({
      status: 'success',
      data: {
        payment,
        verified: payment.status === 'success',
      },
    });
  } catch (error) {
    console.error(
      'Paystack verification error:',
      error.response?.data || error.message,
    );
    return next(new AppError('Payment verification failed', 500));
  }
});

// Paystack webhook handler
exports.paystackWebhook = catchAsync(async (req, res, next) => {
  const event = req.body;

  // Verify it's from Paystack (in production, verify signature)
  const signature = req.headers['x-paystack-signature'];
  // You should verify the signature here using crypto.createHmac('sha512', PAYSTACK_SECRET_KEY)

  if (event.event === 'charge.success') {
    const transactionData = event.data;

    // Find payment by reference
    const payment = await Payment.findOne({
      transactionId: transactionData.reference,
    });

    if (payment && payment.status !== 'success') {
      payment.status = 'success';
      payment.providerResponse = transactionData;
      await payment.save();

      // Update order
      await Order.findByIdAndUpdate(payment.orderId, {
        paymentStatus: 'paid',
        paidAt: new Date(transactionData.paid_at),
      });
    }
  }

  // Always return 200 to Paystack
  res.status(200).json({ received: true });
});

// Refund Paystack payment (admin only)
exports.refundPaystackPayment = catchAsync(async (req, res, next) => {
  const { refundReason } = req.body;

  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    return next(new AppError('Payment not found', 404));
  }

  if (payment.paymentProvider !== 'paystack') {
    return next(
      new AppError(
        'Only Paystack payments can be refunded via this endpoint',
        400,
      ),
    );
  }

  if (payment.status !== 'success') {
    return next(new AppError('Only successful payments can be refunded', 400));
  }

  if (payment.status === 'refunded') {
    return next(new AppError('Payment is already refunded', 400));
  }

  // Call Paystack refund API
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/refund`,
      {
        transaction: payment.providerResponse.id,
        currency: 'NGN',
        customer_note: refundReason || 'Refund requested by admin',
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    payment.status = 'refunded';
    payment.refundReason = refundReason;
    payment.refundedAt = Date.now();
    payment.providerResponse.refund = response.data.data;
    await payment.save();

    // Update order status
    await Order.findByIdAndUpdate(payment.orderId, {
      paymentStatus: 'refunded',
    });

    res.status(200).json({
      status: 'success',
      data: {
        payment,
        refund: response.data.data,
      },
    });
  } catch (error) {
    console.error(
      'Paystack refund error:',
      error.response?.data || error.message,
    );
    return next(new AppError('Refund failed', 500));
  }
});

// Get payment details
exports.getPayment = catchAsync(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(new AppError('Payment not found', 404));
  }

  // Verify ownership
  const order = await Order.findById(payment.orderId);
  if (req.user.role !== 'admin' && !order.userId.equals(req.user.id)) {
    return next(
      new AppError('You are not authorized to view this payment', 403),
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      payment,
    },
  });
});

// Get all payments (admin only)
exports.getAllPayments = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Payment.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const payments = await features.query;

  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: {
      payments,
    },
  });
});

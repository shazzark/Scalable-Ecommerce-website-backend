const express = require('express');
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');

const router = express.Router();

// Paystack webhook (no auth)
router.post('/paystack-webhook', paymentController.paystackWebhook);

// Protected routes
router.use(authController.protect);

// Paystack specific routes
router.post(
  '/paystack/initialize',
  paymentController.initializePaystackPayment,
);
router.get('/verify-paystack', paymentController.verifyPaystackPayment);
router.get('/:id', paymentController.getPayment);

// Admin routes
router.use(authController.restrictTo('admin'));
router.get('/', paymentController.getAllPayments);
router.post('/:id/refund', paymentController.refundPaystackPayment);

module.exports = router;

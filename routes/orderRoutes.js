const express = require('express');
const orderController = require('../controllers/orderController');
const authController = require('../controllers/authController');

const router = express.Router();

// All order routes require authentication
router.use(authController.protect);

// User routes
router.post('/', orderController.createOrder);
router.get('/my-orders', orderController.getAllOrders);
router.get('/stats', orderController.getOrderStats);
router.get('/:id', orderController.getOrder);
router.patch('/:id/cancel', orderController.cancelOrder);

// Admin routes
router.use(authController.restrictTo('admin'));
router.get('/', orderController.getAllOrders); // Admin sees all orders
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;

const express = require('express');
const cartController = require('../controllers/cartController');
const authController = require('../controllers/authController');

const router = express.Router();

// All cart routes require authentication
router.use(authController.protect);

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.patch('/item/:itemId', cartController.updateCartItem);
router.delete('/item/:itemId', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);

module.exports = router;

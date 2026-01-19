const express = require('express');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');
const upload = require('../utilis/multerConfig');

const router = express.Router();

// Public routes
router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/category/:categoryId', productController.getProductsByCategory);
router.get('/:id', productController.getProduct);

// Protected routes (admin only)
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

// router.post('/', productController.createProduct)
router.post(
  '/',
  upload.array('images', 5), // Max 5 images
  productController.createProduct,
);
// router.patch('/:id', productController.updateProduct);
router.patch(
  '/:id',
  upload.array('images', 5), // handle new images
  productController.updateProduct,
);

router.delete('/:id', productController.deleteProduct);

module.exports = router;

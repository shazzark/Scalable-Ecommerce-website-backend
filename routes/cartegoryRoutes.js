const express = require('express');
const categoryController = require('../controllers/cartegoryController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategory);
router.get('/:id/subcategories', categoryController.getSubcategories);

// Protected routes (admin only)
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router.post('/', categoryController.createCategory);
router.patch('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;

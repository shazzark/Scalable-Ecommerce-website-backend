# 🛒 E-Commerce Backend API

A scalable, production-ready e-commerce backend built with Node.js, Express, and MongoDB. Features complete user authentication, product management, shopping cart, order processing, and Paystack payment integration.

## 🚀 Features

- **User Authentication** - JWT-based auth with roles (admin/customer)
- **Product Management** - CRUD operations with image upload
- **Shopping Cart** - Real-time cart management
- **Order Processing** - Complete order lifecycle
- **Payment Integration** - Paystack payment gateway
- **Admin Dashboard** - Full admin control panel
- **Category Management** - Hierarchical categories
- **Image Upload** - Multer for product images

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with cookies
- **File Upload**: Multer
- **Payments**: Paystack API
- **Security**: Helmet, CORS, rate limiting

## 📁 Project Structure

backend/
├── controllers/ # Route controllers
│ ├── authController.js
│ ├── productController.js
│ ├── cartController.js
│ ├── orderController.js
│ ├── paymentController.js
│ ├── categoryController.js
│ └── userController.js
├── models/ # MongoDB models
│ ├── userModel.js
│ ├── productModel.js
│ ├── cartModel.js
│ ├── orderModel.js
│ ├── paymentModel.js
│ └── categoryModel.js
├── routes/ # Express routes
│ ├── userRoutes.js
│ ├── productRoutes.js
│ ├── cartRoutes.js
│ ├── orderRoutes.js
│ ├── paymentRoutes.js
│ └── categoryRoutes.js
├── utils/ # Utilities
│ ├── appError.js
│ ├── catchAsync.js
│ ├── apiFeatures.js
│ └── multerConfig.js
├── public/img/ # Uploaded images
├── app.js # Express app
└── server.js # Server entry point

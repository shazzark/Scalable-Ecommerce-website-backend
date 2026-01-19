require('dotenv').config({ path: './config.env' }); // specify path
console.log('Cloudinary Key:', process.env.CLOUDINARY_API_KEY);
console.log('Cloudinary Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('Cloudinary Secret:', process.env.CLOUDINARY_API_SECRET);

const multer = require('multer');

const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'storepro/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) => {
      const name = file.originalname.split('.')[0].replace(/\s+/g, '-');
      return `product-${Date.now()}-${name}`;
    },
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images allowed'), false);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

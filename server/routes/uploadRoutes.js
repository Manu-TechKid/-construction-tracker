const express = require('express');
const authController = require('../controllers/authController');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

// Protect all upload routes
router.use(authController.protect);

// Signed upload payload for Cloudinary direct uploads
router.post('/sign', uploadController.getUploadSignature);

module.exports = router;

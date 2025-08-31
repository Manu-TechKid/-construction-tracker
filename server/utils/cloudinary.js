let cloudinary;
try {
  cloudinary = require('cloudinary').v2;
  
  // Expect these env vars to be set in Render and locally
  // CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} catch (error) {
  console.warn('Cloudinary not available - photo upload functionality disabled');
  cloudinary = null;
}

module.exports = cloudinary;

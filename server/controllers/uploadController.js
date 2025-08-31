const crypto = require('crypto');
const cloudinary = require('../utils/cloudinary');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Returns a signed payload for client-side direct upload to Cloudinary
// Client will POST the file to https://api.cloudinary.com/v1_1/<cloud_name>/auto/upload
// with: file, api_key, timestamp, folder, signature
exports.getUploadSignature = catchAsync(async (req, res, next) => {
  // Check if cloudinary is available
  if (!cloudinary) {
    return next(new AppError('Photo upload service is not available', 503));
  }

  if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME) {
    return next(new AppError('Cloudinary is not configured', 500));
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = req.body.folder || 'construction-tracker/work-orders';

  // Build the signature using the same params you'll send from the client
  const paramsToSign = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

  res.status(200).json({
    status: 'success',
    data: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      folder,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`
    }
  });
});

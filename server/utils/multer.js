const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('./appError');

// Create uploads directory if it doesn't exist
const uploadsDir = 'public/uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage for different types of uploads
const storage = (type) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      let dir = '';
      
      switch (type) {
        case 'reminder':
          dir = `${uploadsDir}/reminders`;
          break;
        case 'apartment':
          dir = `${uploadsDir}/apartments`;
          break;
        default:
          dir = `${uploadsDir}/misc`;
      }
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${type}-${uniqueSuffix}${ext}`);
    }
  });
};

// File filter
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new AppError('Only image files (JPEG, JPG, PNG, GIF) are allowed!', 400), false);
  }
};

// Upload configuration
const uploadConfig = (type) => ({
  storage: storage(type),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter
});

// Initialize uploads for different types
const upload = {
  reminder: multer(uploadConfig('reminder')),
  apartment: multer(uploadConfig('apartment')),
  any: multer(uploadConfig('misc'))
};

// Middleware to handle single file uploads
const uploadSingle = (type, fieldName) => (req, res, next) => {
  upload[type].single(fieldName)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size is too large. Maximum size is 10MB.', 400));
      }
      return next(err);
    }
    next();
  });
};

// Middleware to handle multiple file uploads
const uploadMultiple = (type, fieldName, maxCount = 5) => (req, res, next) => {
  upload[type].array(fieldName, maxCount)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('One or more files exceed the 10MB limit.', 400));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError(`Maximum ${maxCount} files are allowed.`, 400));
      }
      return next(err);
    }
    next();
  });
};

// Delete file utility
const deleteFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
  }
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  deleteFile
};

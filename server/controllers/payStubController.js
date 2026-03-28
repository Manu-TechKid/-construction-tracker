const path = require('path');
const fs = require('fs');
const multer = require('multer');
const PayStub = require('../models/PayStub');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const PAYSTUBS_DIR = path.join(__dirname, '../public/uploads/pay-stubs');
ensureDir(PAYSTUBS_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PAYSTUBS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `paystub-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  cb(new AppError('Only PDF or image files (JPG, PNG, WebP) are allowed', 400), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

exports.uploadPayStubFile = upload.single('file');

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const canAccessStub = (user, stub) => {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'superuser' || user.role === 'manager') return true;
  return String(stub.worker) === String(user._id);
};

exports.createPayStub = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You are not logged in', 401));
  }

  const { workerId, periodStart, periodEnd, payDate, notes } = req.body;

  if (!workerId) {
    return next(new AppError('workerId is required', 400));
  }

  const start = parseDate(periodStart);
  const end = parseDate(periodEnd);
  const pay = parseDate(payDate);

  if (!start || !end) {
    return next(new AppError('periodStart and periodEnd are required and must be valid dates', 400));
  }

  if (end < start) {
    return next(new AppError('periodEnd must be after periodStart', 400));
  }

  if (!req.file) {
    return next(new AppError('No pay stub file provided', 400));
  }

  const worker = await User.findById(workerId);
  if (!worker) {
    return next(new AppError('Worker not found', 404));
  }

  const stub = await PayStub.create({
    worker: workerId,
    periodStart: start,
    periodEnd: end,
    payDate: pay || undefined,
    notes: notes || '',
    uploadedBy: req.user._id,
    file: {
      url: `/uploads/pay-stubs/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    },
  });

  const populated = await PayStub.findById(stub._id)
    .populate('worker', 'name email role')
    .populate('uploadedBy', 'name email role');

  res.status(201).json({
    status: 'success',
    data: { payStub: populated },
  });
});

exports.getMyPayStubs = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You are not logged in', 401));
  }

  const stubs = await PayStub.find({ worker: req.user._id })
    .populate('uploadedBy', 'name email role')
    .sort({ periodStart: -1, createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: stubs.length,
    data: { payStubs: stubs },
  });
});

exports.getPayStubsForWorker = catchAsync(async (req, res, next) => {
  const { workerId } = req.params;

  const stubs = await PayStub.find({ worker: workerId })
    .populate('worker', 'name email role')
    .populate('uploadedBy', 'name email role')
    .sort({ periodStart: -1, createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: stubs.length,
    data: { payStubs: stubs },
  });
});

exports.getPayStubById = catchAsync(async (req, res, next) => {
  const stub = await PayStub.findById(req.params.id)
    .populate('worker', 'name email role')
    .populate('uploadedBy', 'name email role');

  if (!stub) {
    return next(new AppError('Pay stub not found', 404));
  }

  if (!canAccessStub(req.user, stub)) {
    return next(new AppError('You do not have permission to access this pay stub', 403));
  }

  res.status(200).json({
    status: 'success',
    data: { payStub: stub },
  });
});

exports.deletePayStub = catchAsync(async (req, res, next) => {
  const stub = await PayStub.findById(req.params.id);
  if (!stub) {
    return next(new AppError('Pay stub not found', 404));
  }

  // Only admin/manager
  if (!req.user || !['admin', 'superuser', 'manager'].includes(req.user.role)) {
    return next(new AppError('You do not have permission to delete pay stubs', 403));
  }

  const filePath = path.join(PAYSTUBS_DIR, stub.file?.filename || '');
  if (stub.file?.filename && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      // ignore file deletion errors
    }
  }

  await PayStub.deleteOne({ _id: stub._id });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

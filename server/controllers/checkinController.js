const Checkin = require('../models/Checkin');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const cloudinary = require('../config/cloudinary');

exports.createCheckin = catchAsync(async (req, res, next) => {
  const { latitude, longitude, signature } = req.body;

  const existingCheckin = await Checkin.findOne({ user: req.user.id, status: 'checked-in' });
  if (existingCheckin) {
    return next(new AppError('You are already checked in.', 400));
  }

      let photoUrl = null;
  if (req.file) {
    const photoResult = await cloudinary.uploader.upload(req.file.path, { folder: 'checkins' });
    photoUrl = photoResult.secure_url;
  }

  let signatureUrl = null;
  if (signature) {
    const signatureResult = await cloudinary.uploader.upload(signature, { folder: 'checkins' });
    signatureUrl = signatureResult.secure_url;
  }

  const checkin = await Checkin.create({
    user: req.user.id,
    checkinTime: new Date(),
    checkinLocation: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    checkinPhoto: photoUrl,
    checkinSignature: signatureUrl,
  });

  res.status(201).json({
    status: 'success',
    data: {
      checkin,
    },
  });
});

exports.createCheckout = catchAsync(async (req, res, next) => {
  const { latitude, longitude, signature } = req.body;

  const checkin = await Checkin.findOne({ user: req.user.id, status: 'checked-in' });

  if (!checkin) {
    return next(new AppError('You are not checked in.', 400));
  }

    let photoUrl = null;
  if (req.file) {
    const photoResult = await cloudinary.uploader.upload(req.file.path, { folder: 'checkins' });
    photoUrl = photoResult.secure_url;
  }

  let signatureUrl = null;
  if (signature) {
    const signatureResult = await cloudinary.uploader.upload(signature, { folder: 'checkins' });
    signatureUrl = signatureResult.secure_url;
  }

  checkin.checkoutTime = new Date();
  checkin.checkoutLocation = {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
  checkin.checkoutPhoto = photoUrl;
  checkin.checkoutSignature = signatureUrl;
  checkin.status = 'checked-out';

  await checkin.save();

  res.status(200).json({
    status: 'success',
    data: {
      checkin,
    },
  });
});

exports.getCheckinHistory = catchAsync(async (req, res, next) => {
  const checkins = await Checkin.find({ user: req.user.id }).sort({ checkinTime: -1 });

  res.status(200).json({
    status: 'success',
    results: checkins.length,
    data: {
      checkins,
    },
  });
});

exports.getCurrentCheckinStatus = catchAsync(async (req, res, next) => {
  const checkin = await Checkin.findOne({ user: req.user.id, status: 'checked-in' });

  res.status(200).json({
    status: 'success',
    data: {
      status: checkin ? 'checked-in' : 'checked-out',
      checkin: checkin,
    },
  });
});

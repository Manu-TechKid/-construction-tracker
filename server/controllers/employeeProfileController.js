const EmployeeProfile = require('../models/EmployeeProfile');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getMyProfile = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You are not logged in', 401));
  }

  let profile = await EmployeeProfile.findOne({ user: req.user._id }).populate('user', 'name email role');

  if (!profile) {
    profile = await EmployeeProfile.create({ user: req.user._id });
    profile = await EmployeeProfile.findById(profile._id).populate('user', 'name email role');
  }

  res.status(200).json({
    status: 'success',
    data: { profile },
  });
});

exports.upsertMyProfile = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You are not logged in', 401));
  }

  const updates = { ...req.body };
  delete updates.user;
  delete updates.reviewedBy;
  delete updates.reviewedAt;

  const profile = await EmployeeProfile.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  ).populate('user', 'name email role');

  res.status(200).json({
    status: 'success',
    data: { profile },
  });
});

exports.submitMyProfile = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You are not logged in', 401));
  }

  const profile = await EmployeeProfile.findOne({ user: req.user._id });
  if (!profile) {
    return next(new AppError('Profile not found', 404));
  }

  profile.status = 'submitted';
  await profile.save({ validateBeforeSave: false });

  const populated = await EmployeeProfile.findById(profile._id).populate('user', 'name email role');

  res.status(200).json({
    status: 'success',
    data: { profile: populated },
  });
});

exports.getAllProfiles = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const profiles = await EmployeeProfile.find(filter)
    .populate('user', 'name email role')
    .sort({ updatedAt: -1 });

  res.status(200).json({
    status: 'success',
    results: profiles.length,
    data: { profiles },
  });
});

exports.getProfile = catchAsync(async (req, res, next) => {
  const profile = await EmployeeProfile.findById(req.params.id).populate('user', 'name email role');

  if (!profile) {
    return next(new AppError('Profile not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { profile },
  });
});

exports.reviewProfile = catchAsync(async (req, res, next) => {
  const { status, reviewNotes } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return next(new AppError('Invalid review status', 400));
  }

  const profile = await EmployeeProfile.findById(req.params.id);
  if (!profile) {
    return next(new AppError('Profile not found', 404));
  }

  profile.status = status;
  profile.reviewNotes = reviewNotes;
  profile.reviewedBy = req.user?._id;
  profile.reviewedAt = new Date();
  await profile.save({ validateBeforeSave: false });

  const populated = await EmployeeProfile.findById(profile._id).populate('user', 'name email role');

  res.status(200).json({
    status: 'success',
    data: { profile: populated },
  });
});

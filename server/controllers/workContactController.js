const WorkContact = require('../models/workContactModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllWorkContacts = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.query.expertise) {
    filter.expertise = { $regex: req.query.expertise, $options: 'i' };
  }

  const contacts = await WorkContact.find(filter);
  res.status(200).json({
    status: 'success',
    results: contacts.length,
    data: contacts,
  });
});

exports.getWorkContact = catchAsync(async (req, res, next) => {
  const contact = await WorkContact.findById(req.params.id);
  if (!contact) {
    return next(new AppError('No work contact found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: contact,
  });
});

exports.createWorkContact = catchAsync(async (req, res, next) => {
  const newContact = await WorkContact.create(req.body);
  res.status(201).json({
    status: 'success',
    data: newContact,
  });
});

exports.updateWorkContact = catchAsync(async (req, res, next) => {
  const contact = await WorkContact.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!contact) {
    return next(new AppError('No work contact found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: contact,
  });
});

exports.deleteWorkContact = catchAsync(async (req, res, next) => {
  const contact = await WorkContact.findByIdAndUpdate(req.params.id, { deleted: true });
  if (!contact) {
    return next(new AppError('No work contact found with that ID', 404));
  }
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

const WorkType = require('../models/WorkType');
const WorkSubType = require('../models/WorkSubType');
const DropdownConfig = require('../models/DropdownConfig');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { migrateSetupData } = require('../migrations/setupDataMigration');

// Work Types CRUD
exports.getAllWorkTypes = catchAsync(async (req, res, next) => {
  const workTypes = await WorkType.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  res.status(200).json({ status: 'success', data: { workTypes } });
});

exports.createWorkType = catchAsync(async (req, res, next) => {
  const workType = await WorkType.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ status: 'success', data: { workType } });
});

exports.updateWorkType = catchAsync(async (req, res, next) => {
  const workType = await WorkType.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user.id }, { new: true });
  if (!workType) return next(new AppError('Work type not found', 404));
  res.status(200).json({ status: 'success', data: { workType } });
});

exports.deleteWorkType = catchAsync(async (req, res, next) => {
  const workType = await WorkType.findByIdAndUpdate(req.params.id, { isActive: false, updatedBy: req.user.id });
  if (!workType) return next(new AppError('Work type not found', 404));
  res.status(204).json({ status: 'success', data: null });
});

// Work Sub-Types CRUD
exports.getAllWorkSubTypes = catchAsync(async (req, res, next) => {
  const filter = { isActive: true };
  if (req.query.workType) filter.workType = req.query.workType;
  const workSubTypes = await WorkSubType.find(filter)
    .populate('workType', 'name code color icon')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ sortOrder: 1, name: 1 });
  res.status(200).json({ status: 'success', data: { workSubTypes } });
});

exports.createWorkSubType = catchAsync(async (req, res, next) => {
  const workSubType = await WorkSubType.create({ ...req.body, createdBy: req.user.id });
  await workSubType.populate('workType', 'name code color icon');
  res.status(201).json({ status: 'success', data: { workSubType } });
});

exports.updateWorkSubType = catchAsync(async (req, res, next) => {
  const workSubType = await WorkSubType.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user.id }, { new: true });
  if (!workSubType) return next(new AppError('Work sub-type not found', 404));
  await workSubType.populate('workType', 'name code color icon');
  res.status(200).json({ status: 'success', data: { workSubType } });
});

exports.deleteWorkSubType = catchAsync(async (req, res, next) => {
  const workSubType = await WorkSubType.findByIdAndUpdate(req.params.id, { isActive: false, updatedBy: req.user.id });
  if (!workSubType) return next(new AppError('Work sub-type not found', 404));
  res.status(204).json({ status: 'success', data: null });
});

// Dropdown Configurations CRUD
exports.getAllDropdownConfigs = catchAsync(async (req, res, next) => {
  const dropdownConfigs = await DropdownConfig.find({ isActive: true }).sort({ category: 1 });
  res.status(200).json({ status: 'success', data: { dropdownConfigs } });
});

exports.createDropdownConfig = catchAsync(async (req, res, next) => {
  const dropdownConfig = await DropdownConfig.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ status: 'success', data: { dropdownConfig } });
});

exports.updateDropdownConfig = catchAsync(async (req, res, next) => {
  const dropdownConfig = await DropdownConfig.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user.id }, { new: true });
  if (!dropdownConfig) return next(new AppError('Dropdown config not found', 404));
  res.status(200).json({ status: 'success', data: { dropdownConfig } });
});

exports.deleteDropdownConfig = catchAsync(async (req, res, next) => {
  const dropdownConfig = await DropdownConfig.findByIdAndUpdate(req.params.id, { isActive: false, updatedBy: req.user.id });
  if (!dropdownConfig) return next(new AppError('Dropdown config not found', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.getDropdownOptions = catchAsync(async (req, res, next) => {
  const dropdownConfig = await DropdownConfig.findOne({ category: req.params.category.toLowerCase(), isActive: true });
  if (!dropdownConfig) return next(new AppError('Dropdown config not found', 404));
  const options = dropdownConfig.options.filter(opt => opt.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  res.status(200).json({ status: 'success', data: { options } });
});

// Migration endpoints
exports.runSetupMigration = catchAsync(async (req, res, next) => {
  console.log('Starting setup migration via API endpoint...');
  
  const result = await migrateSetupData();
  
  res.status(200).json({
    success: true,
    message: 'Setup migration completed successfully!',
    data: {
      workTypes: result.workTypes,
      workSubTypes: result.workSubTypes,
      dropdownConfigs: result.dropdownConfigs
    }
  });
});

exports.getMigrationStatus = catchAsync(async (req, res, next) => {
  const workTypesCount = await WorkType.countDocuments();
  const workSubTypesCount = await WorkSubType.countDocuments();
  const dropdownConfigsCount = await DropdownConfig.countDocuments();
  
  res.status(200).json({
    success: true,
    data: {
      workTypes: workTypesCount,
      workSubTypes: workSubTypesCount,
      dropdownConfigs: dropdownConfigsCount,
      migrationNeeded: workTypesCount === 0 && workSubTypesCount === 0 && dropdownConfigsCount === 0
    }
  });
});

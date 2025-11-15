const CallLog = require('../models/CallLog');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const buildFilter = (query) => {
  const {
    startDate,
    endDate,
    buildingId,
    isProspect,
    outcome,
    type,
    direction,
    createdBy,
    search
  } = query;

  const filter = {};

  if (buildingId) filter.building = buildingId;
  if (typeof isProspect !== 'undefined') filter.isProspect = isProspect === 'true' || isProspect === true;
  if (outcome) filter.outcome = outcome;
  if (type) filter.type = type;
  if (direction) filter.direction = direction;
  if (createdBy) filter.createdBy = createdBy;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  if (search) {
    filter.$text = { $search: search };
  }

  return filter;
};

exports.getCallLogs = catchAsync(async (req, res) => {
  const filter = buildFilter(req.query);
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(parseInt(req.query.limit || '25', 10), 200);
  const skip = (page - 1) * limit;

  const cursor = CallLog.find(filter)
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const [items, total] = await Promise.all([
    cursor,
    CallLog.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    results: items.length,
    data: { callLogs: items, pagination: { page, limit, total } }
  });
});

exports.getCallLog = catchAsync(async (req, res, next) => {
  const call = await CallLog.findById(req.params.id)
    .populate('building', 'name address')
    .populate('createdBy', 'name email');
  if (!call) return next(new AppError('Call log not found', 404));
  res.status(200).json({ status: 'success', data: { callLog: call } });
});

exports.createCallLog = catchAsync(async (req, res, next) => {
  const payload = { ...req.body, createdBy: req.user.id };

  if (!payload.isProspect && !payload.building) {
    return next(new AppError('Building is required for non-prospect calls', 400));
  }

  if (payload.isProspect && (!payload.prospect || !payload.prospect.companyName)) {
    return next(new AppError('Prospect companyName is required', 400));
  }

  const created = await CallLog.create(payload);
  const populated = await CallLog.findById(created._id)
    .populate('building', 'name address')
    .populate('createdBy', 'name email');

  res.status(201).json({ status: 'success', data: { callLog: populated } });
});

exports.updateCallLog = catchAsync(async (req, res, next) => {
  const updated = await CallLog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('building', 'name address')
    .populate('createdBy', 'name email');
  if (!updated) return next(new AppError('Call log not found', 404));
  res.status(200).json({ status: 'success', data: { callLog: updated } });
});

exports.deleteCallLog = catchAsync(async (req, res, next) => {
  const doc = await CallLog.findByIdAndDelete(req.params.id);
  if (!doc) return next(new AppError('Call log not found', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.getCallStats = catchAsync(async (req, res) => {
  const filter = buildFilter(req.query);

  const [byOutcome, totals] = await Promise.all([
    CallLog.aggregate([
      { $match: filter },
      { $group: { _id: '$outcome', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    CallLog.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: 1 }, meetings: { $sum: { $cond: [{ $eq: ['$outcome', 'meeting_scheduled'] }, 1, 0] } } } }
    ])
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      byOutcome,
      totals: totals[0] || { total: 0, meetings: 0 }
    }
  });
});

const ActivityLog = require('../models/ActivityLog');
const catchAsync = require('../utils/catchAsync');

exports.getAllActivities = catchAsync(async (req, res, next) => {
  const activities = await ActivityLog.find()
    .populate('user', 'name email')
    .sort('-timestamp');

  res.status(200).json({
    status: 'success',
    results: activities.length,
    data: {
      activities,
    },
  });
});

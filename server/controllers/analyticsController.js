const Building = require('../models/Building');
const WorkOrder = require('../models/WorkOrder');
const TimeSession = require('../models/TimeSession');
const TimeLog = require('../models/TimeLog');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Get dashboard analytics data
 * Provides summary statistics for buildings, work orders, time tracking, and workers
 */
exports.getDashboardStats = catchAsync(async (req, res, next) => {
  // Get date range filters from query params
  const { startDate, endDate } = req.query;
  const dateFilter = {};
  const timeDateFilter = {}; // Separate filter for time-based models
  const timeLogDateFilter = {};
  
  if (startDate) {
    const start = new Date(startDate);
    dateFilter.createdAt = { $gte: start };
    timeDateFilter.clockInTime = { $gte: start };
    timeLogDateFilter.timestamp = { $gte: start };
  }
  
  if (endDate) {
    const end = new Date(endDate);
    if (!dateFilter.createdAt) dateFilter.createdAt = {};
    if (!timeDateFilter.clockInTime) timeDateFilter.clockInTime = {};
    if (!timeLogDateFilter.timestamp) timeLogDateFilter.timestamp = {};
    dateFilter.createdAt.$lte = end;
    timeDateFilter.clockInTime.$lte = end;
    timeLogDateFilter.timestamp.$lte = end;
  }

  const [buildingStats, workOrderStats, timeTrackingStats, workerStats, recentActivity] = await Promise.all([
    Building.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    WorkOrder.aggregate([
      { $match: { ...dateFilter } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    TimeSession.aggregate([
      { 
        $match: { 
          ...timeDateFilter,
          status: { $in: ['completed', 'approved'] } 
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalHours: {
            $sum: { $ifNull: ["$totalHours", { $divide: [{ $subtract: ["$clockOutTime", "$clockInTime"] }, 3600000] }] }
          },
          geofenceViolations: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$location.clockOut.geofenceValidated", false] },
                    { $eq: ["$location.clockIn.geofenceValidated", false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]),
    User.aggregate([
      { $match: { role: "worker" } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    Promise.all([
      WorkOrder.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('building', 'name')
        .populate('assignedTo', 'name'),
      TimeSession.find()
        .sort({ clockInTime: -1 })
        .limit(5)
        .populate('worker', 'name')
        .populate('building', 'name')
    ])
  ]);

  // Use TimeSession when available; otherwise fall back to TimeLog (older clock-in/out flow)
  const timeSessionAgg = timeTrackingStats[0] || null;
  const timeSessionHours = timeSessionAgg?.totalHours || 0;
  let timeLogHours = 0;

  if (timeSessionHours <= 0) {
    const timeLogs = await TimeLog.find(timeLogDateFilter)
      .select('user type timestamp')
      .sort({ user: 1, timestamp: 1 })
      .lean();

    const lastClockInByUser = new Map();
    for (const log of timeLogs) {
      const userId = String(log.user);
      if (log.type === 'clock-in') {
        lastClockInByUser.set(userId, log.timestamp);
        continue;
      }
      if (log.type === 'clock-out') {
        const clockInTs = lastClockInByUser.get(userId);
        if (clockInTs) {
          const diffMs = new Date(log.timestamp) - new Date(clockInTs);
          if (diffMs > 0) timeLogHours += diffMs / 3600000;
          lastClockInByUser.delete(userId);
        }
      }
    }

    timeLogHours = Math.round(timeLogHours * 100) / 100;
  }

  const totalHoursToReport = timeSessionHours > 0 ? timeSessionHours : timeLogHours;

  console.log(`[getDashboardStats] - TimeSession Hours: ${timeSessionHours}`);
  console.log(`[getDashboardStats] - TimeLog Fallback Hours: ${timeLogHours}`);
  console.log(`[getDashboardStats] - Total Hours to Report: ${totalHoursToReport}`);

  // Format building stats
  const formattedBuildingStats = buildingStats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});

  // Format work order stats
  const formattedWorkOrderStats = workOrderStats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});

  // Format worker stats
  const formattedWorkerStats = workerStats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});

  res.status(200).json({
    status: 'success',
    data: {
      buildings: {
        total: buildingStats.reduce((sum, stat) => sum + stat.count, 0),
        byStatus: formattedBuildingStats
      },
      workOrders: {
        total: workOrderStats.reduce((sum, stat) => sum + stat.count, 0),
        byStatus: formattedWorkOrderStats
      },
      timeTracking: {
        totalSessions: timeSessionAgg?.totalSessions || 0,
        totalHours: Math.round((totalHoursToReport || 0) * 100) / 100,
        geofenceViolations: timeSessionAgg?.geofenceViolations || 0
      },
      workers: {
        total: workerStats.reduce((sum, stat) => sum + stat.count, 0),
        byStatus: formattedWorkerStats
      },
      recentActivity: {
        workOrders: recentActivity[0],
        timeSessions: recentActivity[1]
      }
    }
  });
});

/**
 * Get time tracking analytics
 * Provides detailed statistics for time tracking
 */
exports.getTimeTrackingAnalytics = catchAsync(async (req, res, next) => {
  const { startDate, endDate, buildingId, workerId } = req.query;
  
  // Build match filter
  const matchFilter = {};
  
  if (startDate && endDate) {
    matchFilter.clockInTime = { 
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  } else if (startDate) {
    matchFilter.clockInTime = { $gte: new Date(startDate) };
  } else if (endDate) {
    matchFilter.clockInTime = { $lte: new Date(endDate) };
  }
  
  if (buildingId) {
    matchFilter.building = buildingId;
  }
  
  if (workerId) {
    matchFilter.worker = workerId;
  }

  // Get time tracking stats by day
  const timeByDay = await TimeSession.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: { 
          $dateToString: { format: "%Y-%m-%d", date: "$clockInTime" } 
        },
        hoursWorked: { 
          $sum: { 
            $divide: [
              { $subtract: ["$clockOutTime", "$clockInTime"] }, 
              3600000 // Convert ms to hours
            ] 
          } 
        },
        sessions: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Get time tracking stats by worker
  const timeByWorker = await TimeSession.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$worker",
        hoursWorked: { 
          $sum: { 
            $divide: [
              { $subtract: ["$clockOutTime", "$clockInTime"] }, 
              3600000 // Convert ms to hours
            ] 
          } 
        },
        sessions: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "worker"
      }
    },
    {
      $project: {
        _id: 1,
        hoursWorked: 1,
        sessions: 1,
        workerName: { $arrayElemAt: ["$worker.name", 0] }
      }
    }
  ]);

  // Get time tracking stats by building
  const timeByBuilding = await TimeSession.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$buildingId",
        hoursWorked: { 
          $sum: { 
            $divide: [
              { $subtract: ["$endTime", "$startTime"] }, 
              3600000 // Convert ms to hours
            ] 
          } 
        },
        sessions: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: "buildings",
        localField: "_id",
        foreignField: "_id",
        as: "building"
      }
    },
    {
      $project: {
        _id: 1,
        hoursWorked: 1,
        sessions: 1,
        buildingName: { $arrayElemAt: ["$building.name", 0] }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      timeByDay,
      timeByWorker,
      timeByBuilding
    }
  });
});

/**
 * Get work order analytics
 * Provides detailed statistics for work orders
 */
exports.getWorkOrderAnalytics = catchAsync(async (req, res, next) => {
  const { startDate, endDate, buildingId } = req.query;
  
  // Build match filter
  const matchFilter = {};
  
  if (startDate && endDate) {
    matchFilter.createdAt = { 
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  } else if (startDate) {
    matchFilter.createdAt = { $gte: new Date(startDate) };
  } else if (endDate) {
    matchFilter.createdAt = { $lte: new Date(endDate) };
  }
  
  if (buildingId) {
    matchFilter.building = buildingId;
  }

  // Get work order stats by status
  const workOrdersByStatus = await WorkOrder.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  // Get work order stats by priority
  const workOrdersByPriority = await WorkOrder.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$priority",
        count: { $sum: 1 }
      }
    }
  ]);

  // Get work order stats by type
  const workOrdersByType = await WorkOrder.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$workType",
        count: { $sum: 1 }
      }
    }
  ]);

  // Get work order stats by building
  const workOrdersByBuilding = await WorkOrder.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$building",
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: "buildings",
        localField: "_id",
        foreignField: "_id",
        as: "building"
      }
    },
    {
      $project: {
        _id: 1,
        count: 1,
        buildingName: { $arrayElemAt: ["$building.name", 0] }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      byStatus: workOrdersByStatus,
      byPriority: workOrdersByPriority,
      byType: workOrdersByType,
      byBuilding: workOrdersByBuilding
    }
  });
});
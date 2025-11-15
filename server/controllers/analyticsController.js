const Building = require('../models/Building');
const WorkOrder = require('../models/WorkOrder');
const TimeSession = require('../models/TimeSession');
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
  
  if (startDate) {
    dateFilter.createdAt = { $gte: new Date(startDate) };
  }
  
  if (endDate) {
    if (!dateFilter.createdAt) dateFilter.createdAt = {};
    dateFilter.createdAt.$lte = new Date(endDate);
  }

  // Get building stats
  const buildingStats = await Building.aggregate([
    { $match: dateFilter },
    { 
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  // Get work order stats
  const workOrderStats = await WorkOrder.aggregate([
    { $match: { ...dateFilter } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  // Get time tracking stats
  // Use the pre-calculated totalHours field from TimeSession schema and
  // derive geofence violations from clock-in/clock-out geofence flags.
  const timeTrackingStats = await TimeSession.aggregate([
    { $match: { ...dateFilter } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        // Sum effective hours (falls back to 0 when missing)
        totalHours: {
          $sum: { $ifNull: ["$totalHours", 0] }
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
  ]);

  // Get worker stats
  const workerStats = await User.aggregate([
    { $match: { role: "worker" } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  // Get recent activity
  const recentActivity = await Promise.all([
    // Recent work orders
    WorkOrder.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('building', 'name')
      .populate('assignedTo', 'name'),
    
    // Recent time sessions
    TimeSession.find()
      .sort({ clockInTime: -1 })
      .limit(5)
      .populate('worker', 'name')
      .populate('building', 'name')
  ]);

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
      timeTracking: timeTrackingStats.length > 0 ? {
        totalSessions: timeTrackingStats[0].totalSessions,
        totalHours: Math.round(timeTrackingStats[0].totalHours * 100) / 100,
        geofenceViolations: timeTrackingStats[0].geofenceViolations
      } : {
        totalSessions: 0,
        totalHours: 0,
        geofenceViolations: 0
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
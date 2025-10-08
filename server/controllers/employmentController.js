const User = require('../models/User');
const TimeSession = require('../models/TimeSession');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { startOfWeek, endOfWeek, format, differenceInDays } = require('date-fns');

// Helper function to calculate total hours worked in a period
const calculateTotalHours = (sessions) => {
  return sessions.reduce((total, session) => {
    if (session.status === 'completed' && session.totalHours) {
      return total + session.totalHours;
    }
    return total;
  }, 0);
};

// Helper function to calculate weeks worked
const calculateWeeksWorked = (sessions) => {
  if (sessions.length === 0) return 0;

  const earliestSession = sessions.reduce((earliest, session) => {
    return session.clockInTime < earliest ? session.clockInTime : earliest;
  }, sessions[0].clockInTime);

  const latestSession = sessions.reduce((latest, session) => {
    return session.clockInTime > latest ? session.clockInTime : latest;
  }, sessions[0].clockInTime);

  return Math.ceil(differenceInDays(new Date(latestSession), new Date(earliestSession)) / 7);
};

// Generate employment reference letter for a worker
exports.generateEmploymentLetter = catchAsync(async (req, res, next) => {
  const { workerId } = req.params;
  const { startDate, endDate } = req.query;

  // Find the worker
  const worker = await User.findById(workerId);
  if (!worker) {
    return next(new AppError('Worker not found', 404));
  }

  if (worker.role !== 'worker') {
    return next(new AppError('User is not a worker', 400));
  }

  // Define date range
  const start = startDate ? new Date(startDate) : startOfWeek(new Date());
  const end = endDate ? new Date(endDate) : endOfWeek(new Date());

  // Get time sessions for the worker in the date range
  const sessions = await TimeSession.find({
    worker: workerId,
    status: 'completed',
    clockInTime: { $gte: start, $lte: end }
  }).populate('building', 'name address');

  const totalHours = calculateTotalHours(sessions);
  const weeksWorked = calculateWeeksWorked(sessions);
  const averageHoursPerWeek = weeksWorked > 0 ? totalHours / weeksWorked : 0;

  // Generate the employment letter content
  const letterContent = {
    workerName: worker.name,
    workerEmail: worker.email,
    employeeId: worker.employeeId || 'N/A',
    position: worker.position || 'Construction Worker',
    department: worker.department || 'Operations',
    startDate: worker.createdAt ? format(worker.createdAt, 'MMMM d, yyyy') : 'N/A',
    currentDate: format(new Date(), 'MMMM d, yyyy'),
    totalHours,
    weeksWorked,
    averageHoursPerWeek,
    sessions: sessions.map(session => ({
      date: format(session.clockInTime, 'MMMM d, yyyy'),
      building: session.building?.name || 'N/A',
      hours: session.totalHours || 0,
      status: session.status
    }))
  };

  // Generate the letter text
  const letterText = generateLetterText(letterContent);

  res.status(200).json({
    status: 'success',
    data: {
      letterContent,
      letterText,
      worker,
      period: {
        start: format(start, 'MMMM d, yyyy'),
        end: format(end, 'MMMM d, yyyy')
      }
    }
  });
});

// Get employment letter for current user
exports.getMyEmploymentLetter = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  // Define date range (current week by default)
  const start = startDate ? new Date(startDate) : startOfWeek(new Date());
  const end = endDate ? new Date(endDate) : endOfWeek(new Date());

  // Get time sessions for current user in the date range
  const sessions = await TimeSession.find({
    worker: req.user.id,
    status: 'completed',
    clockInTime: { $gte: start, $lte: end }
  }).populate('building', 'name address');

  const totalHours = calculateTotalHours(sessions);
  const weeksWorked = calculateWeeksWorked(sessions);
  const averageHoursPerWeek = weeksWorked > 0 ? totalHours / weeksWorked : 0;

  const letterContent = {
    workerName: req.user.name,
    workerEmail: req.user.email,
    employeeId: req.user.employeeId || 'N/A',
    position: req.user.position || 'Construction Worker',
    department: req.user.department || 'Operations',
    startDate: req.user.createdAt ? format(req.user.createdAt, 'MMMM d, yyyy') : 'N/A',
    currentDate: format(new Date(), 'MMMM d, yyyy'),
    totalHours,
    weeksWorked,
    averageHoursPerWeek,
    sessions: sessions.map(session => ({
      date: format(session.clockInTime, 'MMMM d, yyyy'),
      building: session.building?.name || 'N/A',
      hours: session.totalHours || 0,
      status: session.status
    }))
  };

  const letterText = generateLetterText(letterContent);

  res.status(200).json({
    status: 'success',
    data: {
      letterContent,
      letterText,
      period: {
        start: format(start, 'MMMM d, yyyy'),
        end: format(end, 'MMMM d, yyyy')
      }
    }
  });
});

// Request employment letter (for workers to request from admin)
exports.requestEmploymentLetter = catchAsync(async (req, res, next) => {
  const { reason, startDate, endDate } = req.body;

  // In a real application, this would create a request record
  // For now, we'll just return a message
  res.status(200).json({
    status: 'success',
    message: 'Employment letter request submitted. An administrator will review your request and generate the letter.',
    data: {
      reason,
      startDate,
      endDate,
      requestedBy: req.user.id,
      requestedAt: new Date()
    }
  });
});

// Get all employment letter requests (admin only)
exports.getEmploymentRequests = catchAsync(async (req, res, next) => {
  // In a real application, this would fetch from an EmploymentRequest model
  // For now, return empty array
  res.status(200).json({
    status: 'success',
    data: {
      requests: []
    }
  });
});

// Update employment letter request status (admin only)
exports.updateEmploymentRequest = catchAsync(async (req, res, next) => {
  const { requestId } = req.params;
  const { status, notes } = req.body;

  // In a real application, this would update the EmploymentRequest record
  res.status(200).json({
    status: 'success',
    message: `Employment letter request ${status}`,
    data: {
      requestId,
      status,
      notes,
      updatedBy: req.user.id,
      updatedAt: new Date()
    }
  });
});

// Helper function to generate letter text
function generateLetterText(content) {
  return `
EMPLOYMENT REFERENCE LETTER

Date: ${content.currentDate}

To Whom It May Concern:

This letter serves to confirm that ${content.workerName} has been employed with DSJ Services as a ${content.position} in the ${content.department} department since ${content.startDate}.

During their employment, ${content.workerName} has demonstrated dedication and reliability in their work assignments.

Work Summary for the period ${content.currentDate}:
- Total hours worked: ${content.totalHours.toFixed(1)} hours
- Number of weeks worked: ${content.weeksWorked}
- Average hours per week: ${content.averageHoursPerWeek.toFixed(1)} hours

${content.workerName} has worked at various building locations and maintained a professional approach to their responsibilities.

If you require any additional information, please do not hesitate to contact us.

Sincerely,
DSJ Services Management
Human Resources Department

This letter is computer generated and valid without signature.
Generated on: ${content.currentDate}
  `.trim();
}

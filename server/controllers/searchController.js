const WorkOrder = require('../models/WorkOrder');
const Invoice = require('../models/Invoice');
const Schedule = require('../models/Schedule');
const Reminder = require('../models/Reminder');
const Building = require('../models/Building');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Search apartment records across all data types
exports.searchApartment = catchAsync(async (req, res, next) => {
  const { 
    apartmentNumber, 
    buildingId, 
    serviceType, 
    status, 
    dateRange 
  } = req.body;

  if (!apartmentNumber) {
    return next(new AppError('Apartment number is required', 400));
  }

  // Build date filter
  let dateFilter = {};
  if (dateRange) {
    const now = new Date();
    switch (dateRange) {
      case 'last_week':
        dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
        break;
      case 'last_month':
        dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
        break;
      case 'last_3_months':
        dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 3)) };
        break;
      case 'last_6_months':
        dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 6)) };
        break;
      case 'last_year':
        dateFilter = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
        break;
    }
  }

  const results = [];

  try {
    // Search Work Orders (apartmentNumber field)
    let workOrderQuery = {
      apartmentNumber: apartmentNumber
    };

    if (buildingId) {
      workOrderQuery.building = buildingId;
    }

    if (status) {
      workOrderQuery.status = status;
    }

    if (serviceType) {
      workOrderQuery.workType = serviceType;
    }
    if (dateFilter && Object.keys(dateFilter).length > 0) {
      workOrderQuery.createdAt = dateFilter;
    }

    const workOrders = await WorkOrder.find(workOrderQuery)
      .populate('building', 'name address')
      .populate('assignedTo.worker', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    workOrders.forEach(wo => {
      results.push({
        id: wo._id,
        type: 'work_order',
        title: wo.title,
        description: wo.description,
        serviceType: wo.workType,
        status: wo.status,
        date: wo.createdAt,
        cost: wo.estimatedCost || wo.actualCost,
        building: wo.building,
        apartment: { number: wo.apartmentNumber },
        workers: wo.assignedTo?.map(a => a.worker).filter(Boolean) || []
      });
    });

    // Search Invoices (through related work orders)
    let invoiceQuery = {};
    if (buildingId) {
      invoiceQuery.building = buildingId;
    }
    if (dateFilter && Object.keys(dateFilter).length > 0) {
      invoiceQuery.createdAt = dateFilter;
    }

    // Find invoices that have work orders with matching apartment numbers
    const invoices = await Invoice.find(invoiceQuery)
      .populate({
        path: 'building',
        select: 'name address'
      })
      .populate({
        path: 'workOrders.workOrder',
        select: 'title workType apartmentNumber',
        match: { apartmentNumber: apartmentNumber }
      })
      .sort({ createdAt: -1 })
      .limit(50);

    invoices.forEach(invoice => {
      // Only include invoices that have matching work orders
      const matchingWorkOrders = invoice.workOrders?.filter(wo => 
        wo.workOrder && wo.workOrder.apartmentNumber === apartmentNumber
      );
      
      if (matchingWorkOrders && matchingWorkOrders.length > 0) {
        results.push({
          id: invoice._id,
          type: 'invoice',
          title: `Invoice #${invoice.invoiceNumber}`,
          description: `Invoice for ${matchingWorkOrders.length} work order(s)`,
          serviceType: matchingWorkOrders[0]?.workOrder?.workType,
          status: invoice.status,
          date: invoice.createdAt,
          cost: invoice.total,
          building: invoice.building,
          apartment: { number: apartmentNumber },
          workers: []
        });
      }
    });

    // Search Schedules
    let scheduleQuery = { 
      apartment: apartmentNumber
    };
    
    if (buildingId) {
      scheduleQuery.building = buildingId;
    }
    if (status) {
      scheduleQuery.status = status;
    }
    if (serviceType) {
      scheduleQuery.type = serviceType;
    }
    if (dateFilter && Object.keys(dateFilter).length > 0) {
      scheduleQuery.startDate = dateFilter;
    }

    const schedules = await Schedule.find(scheduleQuery)
      .populate('building', 'name address')
      .populate('assignedWorkers', 'name email')
      .sort({ startDate: -1 })
      .limit(50);

    schedules.forEach(schedule => {
      results.push({
        id: schedule._id,
        type: 'schedule',
        title: schedule.title,
        description: schedule.description,
        serviceType: schedule.type,
        status: schedule.status,
        date: schedule.startDate,
        cost: schedule.estimatedCost,
        building: schedule.building,
        apartment: { number: schedule.apartment },
        workers: schedule.assignedWorkers || []
      });
    });

    // Search Reminders (apartment.number field)
    let reminderQuery = {
      'apartment.number': apartmentNumber
    };
    
    if (buildingId) {
      reminderQuery.building = buildingId;
    }
    if (status) {
      reminderQuery.status = status;
    }
    if (dateFilter && Object.keys(dateFilter).length > 0) {
      reminderQuery.dueDate = dateFilter;
    }

    const reminders = await Reminder.find(reminderQuery)
      .populate('building', 'name address')
      .populate('assignedTo', 'name email')
      .sort({ dueDate: -1 })
      .limit(50);

    reminders.forEach(reminder => {
      results.push({
        id: reminder._id,
        type: 'reminder',
        title: reminder.title,
        description: reminder.description,
        serviceType: reminder.type,
        status: reminder.status,
        date: reminder.dueDate,
        cost: null,
        building: reminder.building,
        apartment: reminder.apartment,
        workers: reminder.assignedTo ? [reminder.assignedTo] : []
      });
    });

    // Sort results by date (most recent first)
    results.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      status: 'success',
      results: results.length,
      data: results
    });

  } catch (error) {
    console.error('Search error:', error);
    return next(new AppError('Search failed', 500));
  }
});

// Get apartment maintenance history
exports.getApartmentHistory = catchAsync(async (req, res, next) => {
  const { apartmentNumber, buildingId } = req.query;

  if (!apartmentNumber) {
    return next(new AppError('Apartment number is required', 400));
  }

  const history = {
    workOrders: [],
    invoices: [],
    schedules: [],
    reminders: [],
    summary: {
      totalWorkOrders: 0,
      totalCost: 0,
      lastService: null,
      mostCommonService: null
    }
  };

  try {
    // Work Orders query (apartmentNumber field)
    let workOrderQuery = {
      apartmentNumber: apartmentNumber
    };

    if (buildingId) {
      workOrderQuery.building = buildingId;
    }

    // Get work orders
    const workOrders = await WorkOrder.find(workOrderQuery)
      .populate('building', 'name address')
      .populate('assignedTo.worker', 'name email')
      .sort({ createdAt: -1 });

    history.workOrders = workOrders;
    history.summary.totalWorkOrders = workOrders.length;

    // Calculate total cost and find last service
    let totalCost = 0;
    let lastServiceDate = null;
    const serviceTypes = {};

    workOrders.forEach(wo => {
      if (wo.actualCost) totalCost += wo.actualCost;
      else if (wo.estimatedCost) totalCost += wo.estimatedCost;

      if (!lastServiceDate || wo.createdAt > lastServiceDate) {
        lastServiceDate = wo.createdAt;
      }

      if (wo.workType) {
        serviceTypes[wo.workType] = (serviceTypes[wo.workType] || 0) + 1;
      }
    });

    // Get invoices (through work orders)
    let invoiceQuery = {};
    if (buildingId) {
      invoiceQuery.building = buildingId;
    }

    const invoices = await Invoice.find(invoiceQuery)
      .populate('building', 'name address')
      .populate({
        path: 'workOrders.workOrder',
        select: 'apartmentNumber',
        match: { apartmentNumber: apartmentNumber }
      })
      .sort({ createdAt: -1 });

    // Filter invoices that have matching work orders
    const matchingInvoices = invoices.filter(invoice => 
      invoice.workOrders?.some(wo => wo.workOrder && wo.workOrder.apartmentNumber === apartmentNumber)
    );

    history.invoices = matchingInvoices;

    // Add invoice costs
    matchingInvoices.forEach(invoice => {
      if (invoice.total) totalCost += invoice.total;
    });

    // Get schedules
    let scheduleQuery = { apartment: apartmentNumber };
    if (buildingId) scheduleQuery.building = buildingId;

    const schedules = await Schedule.find(scheduleQuery)
      .populate('building', 'name address')
      .populate('assignedWorkers', 'name email')
      .sort({ startDate: -1 });

    history.schedules = schedules;

    // Get reminders
    let reminderQuery = { 'apartment.number': apartmentNumber };
    if (buildingId) reminderQuery.building = buildingId;

    const reminders = await Reminder.find(reminderQuery)
      .populate('building', 'name address')
      .populate('assignedTo', 'name email')
      .sort({ dueDate: -1 });

    history.reminders = reminders;

    // Calculate summary
    history.summary.totalCost = totalCost;
    history.summary.lastService = lastServiceDate;

    // Find most common service type
    const mostCommon = Object.entries(serviceTypes).reduce((a, b) => 
      serviceTypes[a[0]] > serviceTypes[b[0]] ? a : b, ['none', 0]
    );
    history.summary.mostCommonService = mostCommon[0] !== 'none' ? mostCommon[0] : null;

    res.status(200).json({
      status: 'success',
      data: history
    });

  } catch (error) {
    console.error('History error:', error);
    return next(new AppError('Failed to get apartment history', 500));
  }
});

// Global search across all entities
exports.globalSearch = catchAsync(async (req, res, next) => {
  const { query, entityTypes = ['work_orders', 'invoices', 'schedules', 'reminders'] } = req.body;

  if (!query || query.length < 2) {
    return next(new AppError('Search query must be at least 2 characters', 400));
  }

  const results = [];
  const searchRegex = new RegExp(query, 'i');

  try {
    // Search Work Orders
    if (entityTypes.includes('work_orders')) {
      const workOrders = await WorkOrder.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { apartmentNumber: searchRegex }
        ]
      })
      .populate('building', 'name address')
      .populate('assignedTo.worker', 'name email')
      .limit(20);

      workOrders.forEach(wo => {
        results.push({
          id: wo._id,
          type: 'work_order',
          title: wo.title,
          description: wo.description,
          building: wo.building,
          apartment: { number: wo.apartmentNumber },
          relevance: 'high'
        });
      });
    }

    // Search Invoices
    if (entityTypes.includes('invoices')) {
      const invoices = await Invoice.find({
        $or: [
          { description: searchRegex },
          { apartmentNumber: searchRegex },
          { invoiceNumber: searchRegex }
        ]
      })
      .populate('building', 'name address')
      .limit(20);

      invoices.forEach(invoice => {
        results.push({
          id: invoice._id,
          type: 'invoice',
          title: `Invoice #${invoice.invoiceNumber}`,
          description: invoice.description,
          building: invoice.building,
          apartment: { number: invoice.apartmentNumber },
          relevance: 'medium'
        });
      });
    }

    // Search Schedules
    if (entityTypes.includes('schedules')) {
      const schedules = await Schedule.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { apartment: searchRegex }
        ]
      })
      .populate('building', 'name address')
      .limit(20);

      schedules.forEach(schedule => {
        results.push({
          id: schedule._id,
          type: 'schedule',
          title: schedule.title,
          description: schedule.description,
          building: schedule.building,
          apartment: { number: schedule.apartment },
          relevance: 'medium'
        });
      });
    }

    // Search Reminders
    if (entityTypes.includes('reminders')) {
      const reminders = await Reminder.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { 'apartment.number': searchRegex }
        ]
      })
      .populate('building', 'name address')
      .limit(20);

      reminders.forEach(reminder => {
        results.push({
          id: reminder._id,
          type: 'reminder',
          title: reminder.title,
          description: reminder.description,
          building: reminder.building,
          apartment: reminder.apartment,
          relevance: 'low'
        });
      });
    }

    res.status(200).json({
      status: 'success',
      results: results.length,
      data: results
    });

  } catch (error) {
    console.error('Global search error:', error);
    return next(new AppError('Global search failed', 500));
  }
});

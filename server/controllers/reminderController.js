const Reminder = require('../models/Reminder');
const Building = require('../models/Building');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { sendReminderEmail } = require('../services/emailService');

// @desc    Create a new reminder
// @route   POST /api/v1/reminders
// @access  Private
exports.createReminder = catchAsync(async (req, res, next) => {
  const {
    building,
    apartment,
    title,
    description,
    dueDate,
    priority,
    category,
    type = 'building', // Default to building-level reminder
    sendEmail = true // Send email notification by default
  } = req.body;

  // Verify building exists and user has access
  const buildingDoc = await Building.findById(building).populate('serviceManagerEmail generalManagerEmail maintenanceManagerEmail');
  if (!buildingDoc) {
    return next(new AppError('No building found with that ID', 404));
  }

  // For apartment reminders, verify the apartment exists in the building
  if (type === 'apartment') {
    if (!apartment || !apartment.number || !apartment._id) {
      return next(new AppError('Apartment number and ID are required for apartment reminders', 400));
    }
    
    // Check if apartment exists in the building
    const apartmentExists = buildingDoc.apartments.some(
      apt => apt._id.toString() === apartment._id && apt.number === apartment.number
    );
    
    if (!apartmentExists) {
      return next(new AppError('The specified apartment does not exist in this building', 400));
    }
  }

  const reminderData = {
    building,
    title,
    description,
    dueDate,
    priority: priority || 'medium',
    category: category || 'other',
    type,
    createdBy: req.user.id,
    photos: req.files ? req.files.map(file => file.filename) : []
  };

  // Add apartment data if it's an apartment reminder
  if (type === 'apartment') {
    reminderData.apartment = {
      number: apartment.number,
      _id: apartment._id
    };
  }

  const reminder = await Reminder.create(reminderData);
  
  // Populate building info for email
  await reminder.populate('building', 'name address');

  // Send email notification if enabled
  if (sendEmail && req.user.email) {
    try {
      await sendReminderEmail(reminder, req.user.email, req.user.name || 'User');
    } catch (emailError) {
      console.error('Failed to send reminder email:', emailError);
      // Don't fail the reminder creation if email fails
    }
  }

  res.status(201).json({
    status: 'success',
    data: {
      reminder
    }
  });
});

// @desc    Get all reminders
// @route   GET /api/v1/reminders
// @access  Private
exports.getAllReminders = catchAsync(async (req, res, next) => {
  // Build query
  const query = Reminder.find();

  // Filter by building if specified
  if (req.query.building) {
    query.where('building').equals(req.query.building);
  }

  // Filter by apartment if specified
  if (req.query.apartmentId) {
    query.where({
      'type': 'apartment',
      'apartment._id': req.query.apartmentId
    });
  }

  // Filter by status if specified
  if (req.query.status) {
    query.where('status').equals(req.query.status);
  }

  // Filter by apartment number if specified
  if (req.query.apartment) {
    query.where('apartment.number').equals(req.query.apartment);
  }

  // Execute query
  query.populate('building', 'name address')
    .populate('createdBy', 'name email');

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query.sort(sortBy);
  } else {
    query.sort('-createdAt');
  }

  // Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 100;
  const skip = (page - 1) * limit;
  
  const reminders = await query.skip(skip).limit(limit);
  // Count total using the same filters applied to the query
  const total = await Reminder.countDocuments(query.getQuery());

  res.status(200).json({
    status: 'success',
    results: reminders.length,
    total,
    data: {
      reminders
    }
  });
});

// @desc    Get single reminder
// @route   GET /api/v1/reminders/:id
// @access  Private
exports.getReminder = catchAsync(async (req, res, next) => {
  const reminder = await Reminder.findById(req.params.id)
    .populate('building', 'name address')
    .populate('createdBy', 'name email');

  if (!reminder) {
    return next(new AppError('No reminder found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      reminder
    }
  });
});

// @desc    Update reminder
// @route   PATCH /api/v1/reminders/:id
// @access  Private
exports.updateReminder = catchAsync(async (req, res, next) => {
  console.log('Updating reminder with ID:', req.params.id);
  console.log('Update data:', req.body);
  
  const updates = { ...req.body };
  
  // If files were uploaded, add them to the photos array
  if (req.files && req.files.length > 0) {
    updates.$push = { photos: { $each: req.files.map(file => file.filename) } };
  }

  // For status-only updates, don't require title and description
  // Only validate required fields if this is a full update (has title or description)
  if ((updates.title || updates.description) && (!updates.title || !updates.description)) {
    return next(new AppError('Title and description are required for content updates', 400));
  }

  const reminder = await Reminder.findByIdAndUpdate(
    req.params.id,
    updates,
    {
      new: true,
      runValidators: true
    }
  ).populate('building', 'name address')
   .populate('createdBy', 'name email');

  if (!reminder) {
    return next(new AppError('No reminder found with that ID', 404));
  }

  console.log('Reminder updated successfully:', reminder._id);

  res.status(200).json({
    status: 'success',
    data: {
      reminder
    }
  });
});

// @desc    Delete reminder
// @route   DELETE /api/v1/reminders/:id
// @access  Private
exports.deleteReminder = catchAsync(async (req, res, next) => {
  const reminder = await Reminder.findByIdAndDelete(req.params.id);

  if (!reminder) {
    return next(new AppError('No reminder found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Add note to reminder
// @route   POST /api/v1/reminders/:id/notes
// @access  Private
exports.addNote = catchAsync(async (req, res, next) => {
  const { text } = req.body;
  
  if (!text) {
    return next(new AppError('Please provide note text', 400));
  }

  const reminder = await Reminder.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        notes: {
          text,
          createdBy: req.user.id
        }
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!reminder) {
    return next(new AppError('No reminder found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      reminder
    }
  });
});

// @desc    Get upcoming reminders
// @route   GET /api/v1/reminders/upcoming
// @access  Private
exports.getUpcomingReminders = catchAsync(async (req, res, next) => {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const reminders = await Reminder.find({
    dueDate: {
      $gte: today,
      $lte: nextWeek
    },
    status: { $ne: 'completed' }
  })
    .sort('dueDate')
    .populate('building', 'name')
    .limit(10);

  res.status(200).json({
    status: 'success',
    results: reminders.length,
    data: {
      reminders
    }
  });
});

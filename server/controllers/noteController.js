const Note = require('../models/Note');
const Building = require('../models/Building');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all notes
exports.getAllNotes = catchAsync(async (req, res, next) => {
  const { building, status, type, priority } = req.query;
  
  let filter = {};
  
  if (building) filter.building = building;
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (priority) filter.priority = priority;

  const notes = await Note.find(filter)
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: notes.length,
    data: {
      notes
    }
  });
});

// Get single note
exports.getNote = catchAsync(async (req, res, next) => {
  const note = await Note.findById(req.params.id)
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email')
    .populate('updatedBy', 'name email');

  if (!note) {
    return next(new AppError('No note found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      note
    }
  });
});

// Create note with building auto-assignment
exports.createNote = catchAsync(async (req, res, next) => {
  let { building, buildingName, ...noteData } = req.body;
  
  // If building name is provided instead of ID, try to find the building
  if (buildingName && !building) {
    const foundBuilding = await Note.findBuildingByName(buildingName);
    if (foundBuilding) {
      building = foundBuilding._id;
    } else {
      return next(new AppError(`Building "${buildingName}" not found`, 404));
    }
  }
  
  if (!building) {
    return next(new AppError('Building is required', 400));
  }

  const note = await Note.create({
    ...noteData,
    building,
    createdBy: req.user ? req.user.id : null
  });
  
  await note.populate([
    { path: 'building', select: 'name address' },
    { path: 'createdBy', select: 'name email' }
  ]);

  res.status(201).json({
    status: 'success',
    data: {
      note
    }
  });
});

// Update note
exports.updateNote = catchAsync(async (req, res, next) => {
  const updateData = {
    ...req.body,
    updatedBy: req.user.id
  };

  const note = await Note.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate([
    { path: 'building', select: 'name address' },
    { path: 'createdBy', select: 'name email' },
    { path: 'updatedBy', select: 'name email' }
  ]);

  if (!note) {
    return next(new AppError('No note found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      note
    }
  });
});

// Delete note
exports.deleteNote = catchAsync(async (req, res, next) => {
  const note = await Note.findByIdAndDelete(req.params.id);

  if (!note) {
    return next(new AppError('No note found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get notes for a specific building
exports.getBuildingNotes = catchAsync(async (req, res, next) => {
  const { buildingId } = req.params;
  const { status, type } = req.query;

  let filter = { building: buildingId };
  if (status) filter.status = status;
  if (type) filter.type = type;

  const notes = await Note.find(filter)
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: notes.length,
    data: {
      notes
    }
  });
});

// Search buildings by name for auto-assignment
exports.searchBuildings = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.status(200).json({
      status: 'success',
      data: {
        buildings: []
      }
    });
  }

  const buildings = await Building.find({
    name: new RegExp(q, 'i')
  }).select('name address').limit(10);

  res.status(200).json({
    status: 'success',
    data: {
      buildings
    }
  });
});

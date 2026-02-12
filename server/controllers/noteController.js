const Note = require('../models/Note');
const Building = require('../models/Building');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all notes
exports.getAllNotes = catchAsync(async (req, res, next) => {
  const { building, status, type, priority } = req.query;
  
  let filter = { deleted: { $ne: true } };

  if (req.user?.role === 'notes_only') {
    if (!req.user.assignedBuilding) {
      return next(new AppError('Assigned building is required for this account.', 403));
    }
    filter.building = req.user.assignedBuilding;
  }
  
  if (building && req.user?.role !== 'notes_only') filter.building = building;
  if (status) {
    filter.status = { $in: status.split(',') };
  }
  if (type) filter.type = type;
  if (priority) filter.priority = priority;

  console.log(`[getAllNotes] - Query Params: ${JSON.stringify(req.query)}`);
  console.log(`[getAllNotes] - Final Filter: ${JSON.stringify(filter)}`);

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
  const note = await Note.findOne({ _id: req.params.id, deleted: { $ne: true } })
    .populate('building', 'name address')
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email')
    .populate('updatedBy', 'name email');

  if (req.user?.role === 'notes_only') {
    if (!req.user.assignedBuilding) {
      return next(new AppError('Assigned building is required for this account.', 403));
    }
    if (note && String(note.building?._id || note.building) !== String(req.user.assignedBuilding)) {
      return next(new AppError('You can only view notes for your assigned building.', 403));
    }
  }

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
  console.log('Creating note with data:', req.body);
  console.log('User from request:', req.user);
  
  let { building, buildingName, ...noteData } = req.body;
  
  // Ensure user is authenticated
  if (!req.user || !req.user.id) {
    return next(new AppError('User authentication required', 401));
  }
  
  // If building name is provided instead of ID, try to find the building
  if (buildingName && !building) {
    try {
      const foundBuilding = await Note.findBuildingByName(buildingName);
      if (foundBuilding) {
        building = foundBuilding._id;
      } else {
        return next(new AppError(`Building "${buildingName}" not found`, 404));
      }
    } catch (error) {
      console.error('Error finding building by name:', error);
      return next(new AppError('Error finding building', 500));
    }
  }
  
  if (!building) {
    return next(new AppError('Building is required', 400));
  }

  if (req.user?.role === 'notes_only') {
    if (!req.user.assignedBuilding) {
      return next(new AppError('Assigned building is required for this account.', 403));
    }
    if (String(building) !== String(req.user.assignedBuilding)) {
      return next(new AppError('You can only add notes for your assigned building.', 403));
    }
  }

  try {
    const noteToCreate = {
      ...noteData,
      building,
      createdBy: req.user.id
    };
    
    console.log('Creating note with data:', noteToCreate);
    
    const note = await Note.create(noteToCreate);
    
    const populatedNote = await Note.findById(note._id)
      .populate('building', 'name address')
      .populate('createdBy', 'name email');

    res.status(201).json({
      status: 'success',
      data: {
        note: populatedNote
      }
    });
  } catch (error) {
    console.error('Error creating note:', error);
    return next(new AppError('Failed to create note: ' + error.message, 500));
  }
});

// Update note
exports.updateNote = catchAsync(async (req, res, next) => {
  if (req.user?.role === 'notes_only') {
    if (!req.user.assignedBuilding) {
      return next(new AppError('Assigned building is required for this account.', 403));
    }
    const existing = await Note.findOne({ _id: req.params.id, deleted: { $ne: true } }).select('building');
    if (!existing) {
      return next(new AppError('No note found with that ID', 404));
    }
    if (String(existing.building) !== String(req.user.assignedBuilding)) {
      return next(new AppError('You can only edit notes for your assigned building.', 403));
    }
  }

  const updateData = {
    ...req.body,
    updatedBy: req.user.id
  };

  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, deleted: { $ne: true } },
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

// Delete note (soft delete)
exports.deleteNote = catchAsync(async (req, res, next) => {
  const note = await Note.findOne({ _id: req.params.id, deleted: { $ne: true } });

  if (!note) {
    return next(new AppError('No note found with that ID', 404));
  }

  note.deleted = true;
  note.deletedAt = new Date();
  await note.save();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get notes for a specific building
exports.getBuildingNotes = catchAsync(async (req, res, next) => {
  const { buildingId } = req.params;
  const { status, type } = req.query;

  if (req.user?.role === 'notes_only') {
    if (!req.user.assignedBuilding) {
      return next(new AppError('Assigned building is required for this account.', 403));
    }
    if (String(buildingId) !== String(req.user.assignedBuilding)) {
      return next(new AppError('You can only view notes for your assigned building.', 403));
    }
  }

  let filter = { building: buildingId, deleted: { $ne: true } };
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

  if (req.user?.role === 'notes_only') {
    return next(new AppError('You do not have permission to search buildings.', 403));
  }
  
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

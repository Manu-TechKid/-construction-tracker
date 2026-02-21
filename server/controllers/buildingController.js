const fs = require('fs');
const path = require('path');
const Building = require('../models/Building');
const Reminder = require('../models/Reminder');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

exports.getAllBuildings = catchAsync(async (req, res, next) => {
    // Build query
    const baseFilter = { deleted: { $ne: true } };

    if (req.user?.role === 'notes_only') {
        const assignedBuildings = (req.user.assignedBuildings && req.user.assignedBuildings.length)
            ? req.user.assignedBuildings
            : (req.user.assignedBuilding ? [req.user.assignedBuilding] : []);

        if (!assignedBuildings.length) {
            return next(new AppError('Assigned building is required for this account.', 403));
        }

        baseFilter._id = { $in: assignedBuildings };
    }

    let query = Building.find(baseFilter).populate('administrator', 'name email');
    
    // Search functionality
    if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        query = query.or([
            { name: searchRegex },
            { address: searchRegex },
            { description: searchRegex },
            { administratorName: searchRegex }
        ]);
    }
    
    // Filter by status
    if (req.query.status) {
        query = query.where('status').equals(req.query.status);
    }
    
    // Sorting
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }
    
    // Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;
    
    // Execute query with pagination
    const buildings = await query.skip(skip).limit(limit);
    
    // Format buildings with display name - Service Manager name as primary
    const formattedBuildings = buildings.map(building => {
        const buildingObj = building.toObject();
        // Priority: serviceManagerName > maintenanceManagerName > generalManagerName
        const serviceManagerName = building.serviceManagerName || building.maintenanceManagerName || building.generalManagerName || 'No Service Manager';
        buildingObj.displayName = `[${serviceManagerName}] - ${building.name}`;
        return buildingObj;
    });
    
    // Get total count for pagination
    const total = await Building.countDocuments(query.getQuery());
    
    res.status(200).json({
        status: 'success',
        results: formattedBuildings.length,
        total,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        },
        data: {
            buildings: formattedBuildings
        }
    });
});

exports.getBuilding = catchAsync(async (req, res, next) => {
    const building = await Building.findOne({ _id: req.params.id, deleted: { $ne: true } })
        .populate({
            path: 'reminders',
            select: '-__v',
            options: { 
                sort: { dueDate: 1 },
                limit: 5 // Only get the 5 most recent reminders
            },
            match: { status: { $ne: 'completed' } } // Only get active reminders
        });
    
    if (!building) {
        return next(new AppError('No building found with that ID', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: building
    });
});

// Get all reminders for a specific building
exports.getBuildingReminders = catchAsync(async (req, res, next) => {
    // 1) Check if building exists
    const building = await Building.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!building) {
        return next(new AppError('No building found with that ID', 404));
    }

    // 2) Create query for reminders
    const features = new APIFeatures(
        Reminder.find({ building: req.params.id }),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate();

    // 3) Execute query
    const reminders = await features.query
        .populate('building', 'name')
        .populate('apartment', 'number block')
        .populate('createdBy', 'name email');

    // 4) Send response
    res.status(200).json({
        status: 'success',
        results: reminders.length,
        data: {
            reminders
        }
    });
});

exports.createBuilding = catchAsync(async (req, res, next) => {
    try {
        console.log('Creating building with data:', req.body);
        
        // Validate required fields
        if (!req.body.name || !req.body.address) {
            return next(new AppError('Name and address are required', 400));
        }
        
        // Normalize optional email fields on create: treat empty strings as undefined
        // so optional contacts don't fail regex validation when left blank
        const sanitizedBody = { ...req.body };
        ['serviceManagerEmail', 'maintenanceManagerEmail', 'thirdContactEmail'].forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(sanitizedBody, field) && sanitizedBody[field] === '') {
                sanitizedBody[field] = undefined;
            }
        });

        // Prepare location data if coordinates are provided
        const buildingData = {
            name: sanitizedBody.name,
            address: sanitizedBody.address,
            city: sanitizedBody.city || '',
            administrator: sanitizedBody.administrator || req.user._id,
            administratorName: sanitizedBody.administratorName || '',
            serviceManagerEmail: sanitizedBody.serviceManagerEmail,
            paymentTerms: sanitizedBody.paymentTerms,
            description: sanitizedBody.description,
            
            // Contact fields
            generalManagerName: sanitizedBody.generalManagerName,
            generalManagerEmail: sanitizedBody.generalManagerEmail,
            generalManagerPhone: sanitizedBody.generalManagerPhone,
            maintenanceManagerName: sanitizedBody.maintenanceManagerName,
            maintenanceManagerEmail: sanitizedBody.maintenanceManagerEmail,
            maintenanceManagerPhone: sanitizedBody.maintenanceManagerPhone,
            thirdContactName: sanitizedBody.thirdContactName,
            thirdContactRole: sanitizedBody.thirdContactRole,
            thirdContactEmail: sanitizedBody.thirdContactEmail,
            thirdContactPhone: sanitizedBody.thirdContactPhone,
            
            createdBy: req.user ? req.user._id : null
        };
        
        // Add geofencing data if provided
        if (req.body.latitude && req.body.longitude) {
            buildingData.location = {
                coordinates: [req.body.longitude, req.body.latitude],
                geofenceRadius: req.body.geofenceRadius || 100,
                lastUpdated: Date.now()
            };
        }
        
        const newBuilding = await Building.create(buildingData);
        
        console.log('Building created successfully:', newBuilding);
        
        res.status(201).json({
            status: 'success',
            data: {
                building: newBuilding
            }
        });
    } catch (error) {
        console.error('Error creating building:', error);
        return next(new AppError('Failed to create building: ' + error.message, 500));
    }
});

exports.updateBuilding = catchAsync(async (req, res, next) => {
    // Process geofencing data if provided
    const updateData = { ...req.body };

    console.log('Received update data for building:', JSON.stringify(updateData, null, 2));

    // Normalize all optional email fields: remove empty strings entirely so
    // optional contacts don't fail regex validation when left blank
    const emailFields = [
      'serviceManagerEmail',
      'generalManagerEmail',
      'maintenanceManagerEmail',
      'thirdContactEmail'
    ];

    new Set(emailFields).forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(updateData, field)) {
            if (updateData[field] === '' || updateData[field] === null) {
                delete updateData[field]; // Remove the field entirely
            }
        }
    });
    
    if (updateData.latitude && updateData.longitude) {
        updateData.location = {
            coordinates: [updateData.longitude, updateData.latitude],
            geofenceRadius: updateData.geofenceRadius || 100,
            lastUpdated: Date.now()
        };
        
        // Remove individual fields from the update object
        delete updateData.latitude;
        delete updateData.longitude;
        delete updateData.geofenceRadius;
    }
    
    console.log('Attempting to update building with sanitized data:', JSON.stringify(updateData, null, 2));

    try {
        const building = await Building.findOneAndUpdate(
            { _id: req.params.id, deleted: { $ne: true } },
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        if (!building) {
            return next(new AppError('No building found with that ID', 404));
        }
        
        res.status(200).json({
            status: 'success',
            data: {
                building
            }
        });
    } catch (error) {
        console.error('Error updating building:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message).join('; ');
            return next(new AppError(`Validation error: ${messages}`, 400));
        }
        return next(new AppError('Failed to update building: ' + error.message, 500));
    }
});

exports.deleteBuilding = catchAsync(async (req, res, next) => {
    const building = await Building.findById(req.params.id);

    if (!building || building.deleted) {
        return next(new AppError('No building found with that ID', 404));
    }

    // Perform a soft delete
    building.deleted = true;
    building.deletedAt = new Date();
    await building.save();

    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Add apartment to building
exports.addApartment = catchAsync(async (req, res, next) => {
    const building = await Building.findOne({ _id: req.params.id, deleted: { $ne: true } });
    
    if (!building) {
        return next(new AppError('No building found with that ID', 404));
    }
    
    // Check if apartment number already exists in the building
    const apartmentExists = building.apartments.some(
        apt => apt.number === req.body.number && apt.block === req.body.block
    );
    
    if (apartmentExists) {
        return next(new AppError('An apartment with this number already exists in the specified block', 400));
    }
    
    // Add createdBy and updatedBy references
    const apartmentData = {
        ...req.body,
        createdBy: req.user.id,
        updatedBy: req.user.id,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    building.apartments.push(apartmentData);
    await building.save({ validateModifiedOnly: true });
    
    // Populate the created apartment data for the response
    const newApartment = building.apartments[building.apartments.length - 1];
    
    res.status(201).json({
        status: 'success',
        data: {
            apartment: newApartment
        }
    });
});

// Update apartment in building
exports.updateApartment = catchAsync(async (req, res, next) => {
    const { apartmentId } = req.params;
    const buildingId = req.params.id;
    
    // First find the building
    const building = await Building.findOne({ _id: buildingId, deleted: { $ne: true } });
    
    if (!building) {
        return next(new AppError('No building found with that ID', 404));
    }
    
    // Find the apartment index
    const apartmentIndex = building.apartments.findIndex(
        apt => apt._id.toString() === apartmentId
    );
    
    if (apartmentIndex === -1) {
        return next(new AppError('No apartment found with that ID', 404));
    }
    
    // Check if updating would cause a duplicate apartment number in the same block
    const apartmentExists = building.apartments.some(
        (apt, index) => 
            index !== apartmentIndex && 
            apt.number === req.body.number && 
            apt.block === (req.body.block || building.apartments[apartmentIndex].block)
    );
    
    if (apartmentExists) {
        return next(new AppError('An apartment with this number already exists in the specified block', 400));
    }
    
    // Update the apartment data
    const updatedApartment = {
        ...building.apartments[apartmentIndex].toObject(),
        ...req.body,
        updatedBy: req.user.id,
        updatedAt: Date.now()
    };
    
    // Update the apartment in the array
    building.apartments[apartmentIndex] = updatedApartment;
    
    // Save the building with the updated apartment
    await building.save({ validateModifiedOnly: true });
    
    // Get the updated building with the apartment
    const updatedBuilding = await Building.findById(buildingId);
    const updatedApt = updatedBuilding.apartments.id(apartmentId);
    
    res.status(200).json({
        status: 'success',
        data: {
            apartment: updatedApt
        }
    });
});

// Delete apartment from building
exports.deleteApartment = catchAsync(async (req, res, next) => {
    const { apartmentId } = req.params;
    const buildingId = req.params.id;
    
    const building = await Building.findOne({ _id: buildingId, deleted: { $ne: true } });
    
    if (!building) {
        return next(new AppError('No building found with that ID', 404));
    }
    
    // Check if apartment exists
    const apartment = building.apartments.id(apartmentId);
    if (!apartment) {
        return next(new AppError('No apartment found with that ID', 404));
    }
    
    // Check if there are any reminders associated with this apartment
    const hasReminders = await Reminder.exists({ 
        building: buildingId,
        'apartment._id': apartmentId
    });
    
    if (hasReminders) {
        return next(new AppError(
            'Cannot delete apartment with associated reminders. Please delete or reassign the reminders first.',
            400
        ));
    }
    
    // Remove the apartment
    building.apartments = building.apartments.filter(
        apt => apt._id.toString() !== apartmentId
    );
    
    await building.save({ validateModifiedOnly: true });
    
    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Upload apartment photo
exports.uploadApartmentPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError('Please upload a photo', 400));
    }

    const { id: buildingId, apartmentId } = req.params;
    const { caption = '', isPrimary = false } = req.body;
    
    const building = await Building.findOne({ _id: buildingId, deleted: { $ne: true } });
    if (!building) {
        return next(new AppError('No building found with that ID', 404));
    }
    
    const apartment = building.apartments.id(apartmentId);
    if (!apartment) {
        return next(new AppError('No apartment found with that ID', 404));
    }
    
    // Create photo object
    const photo = {
        url: `/uploads/apartments/${req.file.filename}`,
        caption,
        uploadedBy: req.user.id,
        isPrimary: isPrimary === 'true' || isPrimary === true
    };
    
    // If this is set as primary, unset any existing primary photo
    if (photo.isPrimary) {
        apartment.photos.forEach(p => {
            p.isPrimary = false;
        });
    }
    
    // Add the new photo
    apartment.photos.push(photo);
    
    // If this is the first photo, set it as primary
    if (apartment.photos.length === 1) {
        apartment.photos[0].isPrimary = true;
    }
    
    await building.save({ validateModifiedOnly: true });
    
    res.status(201).json({
        status: 'success',
        data: {
            photo: apartment.photos[apartment.photos.length - 1]
        }
    });
});

// Set apartment primary photo
exports.setApartmentPrimaryPhoto = catchAsync(async (req, res, next) => {
    const { id: buildingId, apartmentId, photoId } = req.params;
    
    const building = await Building.findOne({ _id: buildingId, deleted: { $ne: true } });
    if (!building) {
        return next(new AppError('No building found with that ID', 404));
    }
    
    const apartment = building.apartments.id(apartmentId);
    if (!apartment) {
        return next(new AppError('No apartment found with that ID', 404));
    }
    
    const photo = apartment.photos.id(photoId);
    if (!photo) {
        return next(new AppError('No photo found with that ID', 404));
    }
    
    // Update all photos to set isPrimary to false
    apartment.photos.forEach(p => {
        p.isPrimary = p._id.toString() === photoId;
    });
    
    await building.save({ validateModifiedOnly: true });
    
    res.status(200).json({
        status: 'success',
        data: {
            photo: apartment.photos.id(photoId)
        }
    });
});

// Delete apartment photo
exports.deleteApartmentPhoto = catchAsync(async (req, res, next) => {
    const { id: buildingId, apartmentId, photoId } = req.params;
    
    const building = await Building.findOne({ _id: buildingId, deleted: { $ne: true } });
    if (!building) {
        return next(new AppError('No building found with that ID', 404));
    }
    
    const apartment = building.apartments.id(apartmentId);
    if (!apartment) {
        return next(new AppError('No apartment found with that ID', 404));
    }
    
    const photo = apartment.photos.id(photoId);
    if (!photo) {
        return next(new AppError('No photo found with that ID', 404));
    }
    
    // Get the photo path for deletion
    const photoPath = path.join(__dirname, '..', 'public', photo.url);
    
    // Remove the photo from the array
    apartment.photos = apartment.photos.filter(p => p._id.toString() !== photoId);
    
    // If we deleted the primary photo and there are other photos, set the first one as primary
    if (photo.isPrimary && apartment.photos.length > 0) {
        apartment.photos[0].isPrimary = true;
    }
    
    await building.save({ validateModifiedOnly: true });
    
    // Delete the file from the filesystem
    if (fs.existsSync(photoPath)) {
        fs.unlink(photoPath, err => {
            if (err) console.error('Error deleting photo file:', err);
        });
    }
    
    res.status(204).json({
        status: 'success',
        data: null
    });
});

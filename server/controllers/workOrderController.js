const WorkOrder = require('../models/WorkOrder');
const Building = require('../models/Building');
const User = require('../models/User');
const WorkType = require('../models/WorkType');
const WorkSubType = require('../models/WorkSubType');

// @desc    Create a new work order
// @route   POST /api/v1/work-orders
// @access  Private
exports.createWorkOrder = async (req, res) => {
  try {
    const { title, description, building, workType, workSubType, assignedTo, scheduledDate } = req.body;

    // Basic validation
    if (!title || !description || !building || !workType || !workSubType || !scheduledDate) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    // Verify building exists
    const buildingExists = await Building.findById(building);
    if (!buildingExists) {
      return res.status(404).json({ message: 'Building not found.' });
    }

    // Verify work type exists
    const workTypeExists = await WorkType.findById(workType);
    if (!workTypeExists) {
      return res.status(404).json({ message: 'Work type not found.' });
    }

    // Verify work sub-type exists
    const workSubTypeExists = await WorkSubType.findById(workSubType);
    if (!workSubTypeExists) {
      return res.status(404).json({ message: 'Work sub-type not found.' });
    }

    const workOrderData = { ...req.body, createdBy: req.user._id };

    if (assignedTo && Array.isArray(assignedTo)) {
      workOrderData.assignedTo = assignedTo.map(workerId => ({ worker: workerId }));
    }

    const workOrder = await WorkOrder.create(workOrderData);

    res.status(201).json({ success: true, data: workOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get all work orders
// @route   GET /api/v1/work-orders
// @access  Private
exports.getAllWorkOrders = async (req, res) => {
  try {
    const workOrders = await WorkOrder.find()
      .populate('building', 'name')
      .populate('workType', 'name code color')
      .populate('workSubType', 'name code estimatedDuration estimatedCost')
      .populate('assignedTo.worker', 'name email')
      .populate('createdBy', 'name email');
      
    res.status(200).json({ success: true, count: workOrders.length, data: workOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get a single work order by ID
// @route   GET /api/v1/work-orders/:id
// @access  Private
exports.getWorkOrderById = async (req, res) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id)
      .populate('building', 'name address')
      .populate('workType', 'name code color')
      .populate('workSubType', 'name code estimatedDuration estimatedCost')
      .populate('assignedTo.worker', 'name email')
      .populate('createdBy', 'name email');

    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    res.status(200).json({ success: true, data: workOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update a work order
// @route   PATCH /api/v1/work-orders/:id
// @access  Private
exports.updateWorkOrder = async (req, res) => {
  try {
    let workOrder = await WorkOrder.findById(req.params.id);

    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    const updateData = { ...req.body, updatedBy: req.user._id };

    // Validate work type if provided
    if (updateData.workType) {
      const workTypeExists = await WorkType.findById(updateData.workType);
      if (!workTypeExists) {
        return res.status(404).json({ message: 'Work type not found.' });
      }
    }

    // Validate work sub-type if provided
    if (updateData.workSubType) {
      const workSubTypeExists = await WorkSubType.findById(updateData.workSubType);
      if (!workSubTypeExists) {
        return res.status(404).json({ message: 'Work sub-type not found.' });
      }
    }

    if (updateData.assignedTo && Array.isArray(updateData.assignedTo)) {
      updateData.assignedTo = updateData.assignedTo.map(workerId => ({ worker: workerId }));
    }

    workOrder = await WorkOrder.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: workOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a work order
// @route   DELETE /api/v1/work-orders/:id
// @access  Private
exports.deleteWorkOrder = async (req, res) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id);

    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    await WorkOrder.findByIdAndDelete(req.params.id);

    res.status(204).json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

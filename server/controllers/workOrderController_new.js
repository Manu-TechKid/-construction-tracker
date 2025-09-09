// CRITICAL FIX - Work Order Controller - Version 2024-01-10-FINAL
const WorkOrder = require('../models/WorkOrder');
const Building = require('../models/Building');
const User = require('../models/User');

/**
 * @desc    Create a new work order - SIMPLIFIED VERSION
 * @route   POST /api/v1/work-orders
 * @access  Private/Admin/Manager
 */
exports.createWorkOrder = async (req, res, next) => {
  try {
    console.log('🚀 WORK ORDER CREATION - FINAL FIX VERSION 2024-01-10');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request body keys:', Object.keys(req.body));
    console.log('User:', req.user ? { id: req.user._id, role: req.user.role } : 'No user');
    
    // Authentication check
    if (!req.user || !req.user._id) {
      console.error('❌ Authentication failed');
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
        version: 'FINAL-FIX-2024-01-10'
      });
    }
    
    // Extract required fields
    const { title, description, building } = req.body;
    
    if (!title || !building) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        status: 'error',
        message: 'Title and building are required',
        received: { title: !!title, building: !!building },
        timestamp: new Date().toISOString(),
        version: 'FINAL-FIX-2024-01-10'
      });
    }

    // Verify building exists
    const buildingDoc = await Building.findById(building);
    if (!buildingDoc) {
      console.error('❌ Building not found:', building);
      return res.status(404).json({
        status: 'error',
        message: 'Building not found',
        buildingId: building,
        timestamp: new Date().toISOString(),
        version: 'FINAL-FIX-2024-01-10'
      });
    }

    // Create minimal work order data
    const workOrderData = {
      title: title.trim(),
      description: description || 'Work order created',
      building,
      apartmentNumber: req.body.apartmentNumber || '',
      block: req.body.block || '',
      apartmentStatus: req.body.apartmentStatus || 'occupied',
      priority: req.body.priority || 'medium',
      status: 'pending',
      scheduledDate: new Date(),
      estimatedCost: 0,
      services: [{
        type: 'other',
        description: 'General maintenance',
        laborCost: 0,
        materialCost: 0,
        status: 'pending'
      }],
      assignedTo: [],
      notes: [],
      photos: [],
      createdBy: req.user._id,
      updatedBy: req.user._id
    };

    console.log('📝 Creating work order:', JSON.stringify(workOrderData, null, 2));
    
    // Create work order
    const workOrder = await WorkOrder.create(workOrderData);
    
    console.log('✅ Work order created successfully:', workOrder._id);
    
    return res.status(201).json({
      status: 'success',
      message: 'Work order created successfully',
      timestamp: new Date().toISOString(),
      version: 'FINAL-FIX-2024-01-10',
      data: workOrder
    });
    
  } catch (error) {
    console.error('❌ Work order creation error:', error);
    console.error('Error stack:', error.stack);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const fieldErrors = {};
      Object.keys(error.errors).forEach(key => {
        fieldErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        fieldErrors,
        timestamp: new Date().toISOString(),
        version: 'FINAL-FIX-2024-01-10'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Work order creation failed - FINAL FIX VERSION',
      timestamp: new Date().toISOString(),
      version: 'FINAL-FIX-2024-01-10',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * @desc    Get all work orders
 * @route   GET /api/v1/work-orders
 * @access  Private
 */
exports.getAllWorkOrders = async (req, res, next) => {
  try {
    console.log('📋 Fetching all work orders - FINAL VERSION');
    
    const workOrders = await WorkOrder.find({ isDeleted: { $ne: true } })
      .populate('building', 'name address')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo.worker', 'firstName lastName')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      results: workOrders.length,
      timestamp: new Date().toISOString(),
      version: 'FINAL-FIX-2024-01-10',
      data: workOrders
    });
    
  } catch (error) {
    console.error('❌ Error fetching work orders:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch work orders',
      timestamp: new Date().toISOString(),
      version: 'FINAL-FIX-2024-01-10',
      error: error.message
    });
  }
};

/**
 * @desc    Get single work order
 * @route   GET /api/v1/work-orders/:id
 * @access  Private
 */
exports.getWorkOrder = async (req, res, next) => {
  try {
    console.log('📄 Fetching work order:', req.params.id);
    
    const workOrder = await WorkOrder.findById(req.params.id)
      .populate('building', 'name address')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo.worker', 'firstName lastName');

    if (!workOrder || workOrder.isDeleted) {
      return res.status(404).json({
        status: 'error',
        message: 'Work order not found',
        timestamp: new Date().toISOString(),
        version: 'FINAL-FIX-2024-01-10'
      });
    }

    return res.status(200).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      version: 'FINAL-FIX-2024-01-10',
      data: workOrder
    });
    
  } catch (error) {
    console.error('❌ Error fetching work order:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch work order',
      timestamp: new Date().toISOString(),
      version: 'FINAL-FIX-2024-01-10',
      error: error.message
    });
  }
};

/**
 * @desc    Delete work order
 * @route   DELETE /api/v1/work-orders/:id
 * @access  Private/Admin/Manager
 */
exports.deleteWorkOrder = async (req, res, next) => {
  try {
    console.log('🗑️ Deleting work order:', req.params.id);
    
    const workOrder = await WorkOrder.findByIdAndUpdate(
      req.params.id,
      { 
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user._id
      },
      { new: true }
    );

    if (!workOrder) {
      return res.status(404).json({
        status: 'error',
        message: 'Work order not found',
        timestamp: new Date().toISOString(),
        version: 'FINAL-FIX-2024-01-10'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Work order deleted successfully',
      timestamp: new Date().toISOString(),
      version: 'FINAL-FIX-2024-01-10'
    });
    
  } catch (error) {
    console.error('❌ Error deleting work order:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete work order',
      timestamp: new Date().toISOString(),
      version: 'FINAL-FIX-2024-01-10',
      error: error.message
    });
  }
};

const express = require('express');
const router = express.Router();
const ClientPricing = require('../models/ClientPricing');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const auth = authController.protect;
const authorize = (roles) => restrictToRoles(...roles);

// @route   GET /api/v1/client-pricing
// @desc    Get all client pricing configurations
// @access  Private (Admin/Manager)
router.get('/', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { building, company, category, isActive } = req.query;
    
    let query = {};
    
    if (building) query.building = building;
    if (company) query['company.type'] = company;
    if (category) query['services.category'] = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const clientPricing = await ClientPricing.find(query)
      .populate('building', 'name address city')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: clientPricing.length,
      data: { clientPricing }
    });
  } catch (error) {
    console.error('Error fetching client pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching client pricing'
    });
  }
});

// @route   GET /api/v1/client-pricing/:id
// @desc    Get single client pricing configuration
// @access  Private (Admin/Manager)
router.get('/:id', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const clientPricing = await ClientPricing.findById(req.params.id)
      .populate('building', 'name address city paymentTerms')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!clientPricing) {
      return res.status(404).json({
        success: false,
        message: 'Client pricing configuration not found'
      });
    }
    
    res.json({
      success: true,
      data: { clientPricing }
    });
  } catch (error) {
    console.error('Error fetching client pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching client pricing'
    });
  }
});

// @route   GET /api/v1/client-pricing/building/:buildingId
// @desc    Get client pricing for a specific building
// @access  Private
router.get('/building/:buildingId', auth, async (req, res) => {
  try {
    const clientPricing = await ClientPricing.findOne({ 
      building: req.params.buildingId,
      isActive: true 
    })
      .populate('building', 'name address city paymentTerms')
      .populate('createdBy', 'name email');
    
    if (!clientPricing) {
      return res.status(404).json({
        success: false,
        message: 'No pricing configuration found for this building'
      });
    }
    
    res.json({
      success: true,
      data: { clientPricing }
    });
  } catch (error) {
    console.error('Error fetching building pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching building pricing'
    });
  }
});

// @route   GET /api/v1/client-pricing/building/:buildingId/services
// @desc    Get available services for a building with pricing
// @access  Private
router.get('/building/:buildingId/services', auth, async (req, res) => {
  try {
    const { category, apartmentType = 'standard' } = req.query;
    
    const clientPricing = await ClientPricing.findOne({ 
      building: req.params.buildingId,
      isActive: true 
    });
    
    if (!clientPricing) {
      return res.status(404).json({
        success: false,
        message: 'No pricing configuration found for this building'
      });
    }
    
    let services = clientPricing.services.filter(service => service.isActive);
    
    if (category) {
      services = services.filter(service => service.category === category);
    }
    
    // Calculate pricing for the specified apartment type
    const servicesWithPricing = services.map(service => {
      const pricing = clientPricing.getPricingForService(
        service.category, 
        service.subcategory, 
        apartmentType
      );
      
      return {
        ...service.toObject(),
        calculatedPricing: pricing ? pricing.pricing : service.pricing
      };
    });
    
    res.json({
      success: true,
      count: servicesWithPricing.length,
      data: { 
        services: servicesWithPricing,
        company: clientPricing.company,
        terms: clientPricing.terms
      }
    });
  } catch (error) {
    console.error('Error fetching building services:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching building services'
    });
  }
});

// @route   POST /api/v1/client-pricing/calculate
// @desc    Calculate pricing for services
// @access  Private
router.post('/calculate', auth, async (req, res) => {
  try {
    const { buildingId, services, apartmentType = 'standard' } = req.body;
    
    if (!buildingId || !services || !Array.isArray(services)) {
      return res.status(400).json({
        success: false,
        message: 'Building ID and services array are required'
      });
    }
    
    const clientPricing = await ClientPricing.findOne({ 
      building: buildingId,
      isActive: true 
    });
    
    if (!clientPricing) {
      return res.status(404).json({
        success: false,
        message: 'No pricing configuration found for this building'
      });
    }
    
    const calculations = services.map(serviceRequest => {
      const service = clientPricing.services.find(s => 
        s._id.toString() === serviceRequest.serviceId
      );
      
      if (!service) {
        return {
          serviceId: serviceRequest.serviceId,
          error: 'Service not found'
        };
      }
      
      const calculation = clientPricing.calculateServiceCost(
        serviceRequest.serviceId,
        serviceRequest.quantity || 1,
        apartmentType
      );
      
      return {
        serviceId: serviceRequest.serviceId,
        ...calculation
      };
    });
    
    const totalAmount = calculations.reduce((sum, calc) => 
      sum + (calc.total || 0), 0
    );
    
    res.json({
      success: true,
      data: {
        calculations,
        totalAmount,
        company: clientPricing.company,
        terms: clientPricing.terms
      }
    });
  } catch (error) {
    console.error('Error calculating pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while calculating pricing'
    });
  }
});

// @route   POST /api/v1/client-pricing
// @desc    Create new client pricing configuration
// @access  Private (Admin/Manager)
router.post('/', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const clientPricing = new ClientPricing({
      ...req.body,
      createdBy: req.user.id
    });
    
    await clientPricing.save();
    await clientPricing.populate('building', 'name address city');
    
    res.status(201).json({
      success: true,
      message: 'Client pricing configuration created successfully',
      data: { clientPricing }
    });
  } catch (error) {
    console.error('Error creating client pricing:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating client pricing'
    });
  }
});

// @route   PUT /api/v1/client-pricing/:id
// @desc    Update client pricing configuration
// @access  Private (Admin/Manager)
router.put('/:id', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const clientPricing = await ClientPricing.findById(req.params.id);
    
    if (!clientPricing) {
      return res.status(404).json({
        success: false,
        message: 'Client pricing configuration not found'
      });
    }
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'createdBy' && key !== 'createdAt') {
        clientPricing[key] = req.body[key];
      }
    });
    
    clientPricing.updatedBy = req.user.id;
    
    await clientPricing.save();
    await clientPricing.populate('building', 'name address city');
    
    res.json({
      success: true,
      message: 'Client pricing configuration updated successfully',
      data: { clientPricing }
    });
  } catch (error) {
    console.error('Error updating client pricing:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating client pricing'
    });
  }
});

// @route   DELETE /api/v1/client-pricing/:id
// @desc    Delete client pricing configuration
// @access  Private (Admin only)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const clientPricing = await ClientPricing.findById(req.params.id);
    
    if (!clientPricing) {
      return res.status(404).json({
        success: false,
        message: 'Client pricing configuration not found'
      });
    }
    
    await clientPricing.deleteOne();
    
    res.json({
      success: true,
      message: 'Client pricing configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting client pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting client pricing'
    });
  }
});

// @route   POST /api/v1/client-pricing/:id/services
// @desc    Add service to client pricing configuration
// @access  Private (Admin/Manager)
router.post('/:id/services', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const clientPricing = await ClientPricing.findById(req.params.id);
    
    if (!clientPricing) {
      return res.status(404).json({
        success: false,
        message: 'Client pricing configuration not found'
      });
    }
    
    // Validate service data - check required fields
    if (!req.body.category) {
      return res.status(400).json({
        success: false,
        message: 'Service category is required'
      });
    }
    
    if (!req.body.subcategory) {
      return res.status(400).json({
        success: false,
        message: 'Service subcategory is required'
      });
    }
    
    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required'
      });
    }
    
    if (!req.body.pricing || !req.body.pricing.basePrice) {
      return res.status(400).json({
        success: false,
        message: 'Service pricing with basePrice is required'
      });
    }
    
    if (!req.body.pricing.unitType) {
      return res.status(400).json({
        success: false,
        message: 'Service unitType is required'
      });
    }
    
    clientPricing.services.push(req.body);
    clientPricing.updatedBy = req.user.id;
    
    await clientPricing.save();
    
    res.json({
      success: true,
      message: 'Service added successfully',
      data: { clientPricing }
    });
  } catch (error) {
    console.error('Error adding service:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while adding service: ' + error.message
    });
  }
});

// @route   PUT /api/v1/client-pricing/:id/services/:serviceId
// @desc    Update service in client pricing configuration
// @access  Private (Admin/Manager)
router.put('/:id/services/:serviceId', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const clientPricing = await ClientPricing.findById(req.params.id);
    
    if (!clientPricing) {
      return res.status(404).json({
        success: false,
        message: 'Client pricing configuration not found'
      });
    }
    
    const service = clientPricing.services.id(req.params.serviceId);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found in this pricing configuration'
      });
    }
    
    // Validate required fields if being updated
    if (req.body.category !== undefined && !req.body.category) {
      return res.status(400).json({
        success: false,
        message: 'Service category cannot be empty'
      });
    }
    
    if (req.body.subcategory !== undefined && !req.body.subcategory) {
      return res.status(400).json({
        success: false,
        message: 'Service subcategory cannot be empty'
      });
    }
    
    if (req.body.name !== undefined && !req.body.name) {
      return res.status(400).json({
        success: false,
        message: 'Service name cannot be empty'
      });
    }
    
    if (req.body.pricing && !req.body.pricing.basePrice) {
      return res.status(400).json({
        success: false,
        message: 'Service basePrice cannot be empty'
      });
    }
    
    // Update service fields
    Object.keys(req.body).forEach(key => {
      service[key] = req.body[key];
    });
    
    clientPricing.updatedBy = req.user.id;
    
    await clientPricing.save();
    
    res.json({
      success: true,
      message: 'Service updated successfully',
      data: { clientPricing }
    });
  } catch (error) {
    console.error('Error updating service:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating service: ' + error.message
    });
  }
});

// @route   DELETE /api/v1/client-pricing/:id/services/:serviceId
// @desc    Remove service from client pricing configuration
// @access  Private (Admin/Manager)
router.delete('/:id/services/:serviceId', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const clientPricing = await ClientPricing.findById(req.params.id);
    
    if (!clientPricing) {
      return res.status(404).json({
        success: false,
        message: 'Client pricing configuration not found'
      });
    }
    
    const service = clientPricing.services.id(req.params.serviceId);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found in this pricing configuration'
      });
    }
    
    service.deleteOne();
    clientPricing.updatedBy = req.user.id;
    
    await clientPricing.save();
    
    res.json({
      success: true,
      message: 'Service removed successfully',
      data: { clientPricing }
    });
  } catch (error) {
    console.error('Error removing service:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while removing service: ' + error.message
    });
  }
});

module.exports = router;

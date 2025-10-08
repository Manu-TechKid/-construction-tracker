const express = require('express');
const employmentController = require('../controllers/employmentController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Worker routes - accessible to authenticated users (for their own data)
router.get('/my-letter', employmentController.getMyEmploymentLetter);
router.post('/request-letter', employmentController.requestEmploymentLetter);

// Admin/Manager routes
router.use(restrictToRoles('admin', 'manager'));

// Generate employment letter for any worker
router.get('/:workerId/letter', employmentController.generateEmploymentLetter);

// Get all employment letter requests
router.get('/requests', employmentController.getEmploymentRequests);

// Update employment letter request status
router.patch('/requests/:requestId', employmentController.updateEmploymentRequest);

module.exports = router;

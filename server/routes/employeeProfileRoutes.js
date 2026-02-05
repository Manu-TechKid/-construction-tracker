const express = require('express');
const employeeProfileController = require('../controllers/employeeProfileController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authController.protect);

// Worker/self routes
router.get('/me', employeeProfileController.getMyProfile);
router.put('/me', employeeProfileController.upsertMyProfile);
router.post('/me/submit', employeeProfileController.submitMyProfile);

router.get('/', restrictToRoles('admin', 'manager', 'supervisor'), employeeProfileController.getAllProfiles);
router.get('/:id', restrictToRoles('admin', 'manager', 'supervisor'), employeeProfileController.getProfile);
router.patch('/:id/review', restrictToRoles('admin', 'manager'), employeeProfileController.reviewProfile);

module.exports = router;

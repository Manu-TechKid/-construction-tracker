const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { hidePricesFromWorkers } = require('../middleware/roleMiddleware');
const logActivity = require('../middleware/activityLogger');

const router = express.Router();

// Authentication routes
router.post('/signup', logActivity('User', 'create'), authController.signup);
router.post('/login', logActivity('User', 'login'), authController.login);
router.post('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect);

// Hide prices from workers on all routes
router.use(hidePricesFromWorkers);

// User profile routes
router.patch('/updateMyPassword', logActivity('User', 'update'), authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', logActivity('User', 'update'), userController.updateMe);
router.delete('/deleteMe', logActivity('User', 'delete'), userController.deleteMe);

// Worker-specific routes - restricted to non-workers
router.get('/workers', authController.restrictTo('admin', 'manager', 'supervisor'), userController.getAllWorkers);
router.get('/workers/available', authController.restrictTo('admin', 'manager', 'supervisor'), userController.getAvailableWorkers);
router.post('/workers', authController.restrictTo('admin', 'manager'), logActivity('User', 'create'), userController.createWorker);
router.get('/workers/:id', authController.restrictTo('admin', 'manager', 'supervisor'), userController.getUser);
router.patch('/:id/approval', authController.restrictTo('admin', 'manager'), logActivity('User', 'approve'), userController.updateWorkerApproval);
router.patch('/:id/skills', authController.restrictTo('admin', 'manager', 'supervisor'), userController.updateWorkerSkills);
router.patch('/:id/status', authController.restrictTo('admin', 'manager'), userController.updateWorkerStatus);
router.get('/:id/assignments', userController.getWorkerAssignments);

// Admin routes - restrict to admin and manager
router.use(authController.restrictTo('admin', 'manager'));

// Admin password reset
router.patch('/admin/reset-password', authController.restrictTo('admin'), userController.adminResetPassword);

// General user management
router.get('/', userController.getAllUsers);
router.post('/', logActivity('User', 'create'), userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(logActivity('User', 'update'), userController.updateUser)
  .delete(logActivity('User', 'delete'), userController.deleteUser);

module.exports = router;

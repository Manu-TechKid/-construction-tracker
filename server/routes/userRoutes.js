const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

// Authentication routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect);

// User profile routes
router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

// Worker-specific routes
router.get('/workers', userController.getAllWorkers);
router.get('/workers/available', userController.getAvailableWorkers);
router.post('/workers', authController.restrictTo('admin', 'manager'), userController.createWorker);
router.get('/workers/:id', userController.getUser);
router.patch('/:id/approval', authController.restrictTo('admin', 'manager'), userController.updateWorkerApproval);
router.patch('/:id/skills', authController.restrictTo('admin', 'manager', 'supervisor'), userController.updateWorkerSkills);
router.patch('/:id/status', authController.restrictTo('admin', 'manager'), userController.updateWorkerStatus);
router.get('/:id/assignments', userController.getWorkerAssignments);

// Admin routes - restrict to admin and manager
router.use(authController.restrictTo('admin', 'manager'));

// Admin password reset
router.patch('/admin/reset-password', authController.restrictTo('admin'), userController.adminResetPassword);

// General user management
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;

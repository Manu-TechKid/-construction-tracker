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

// Debug endpoint to check current user and all work orders
router.get('/debug/assignments', async (req, res) => {
    try {
        const WorkOrder = require('../models/WorkOrder');
        const User = require('../models/User');
        
        // Get current user
        const currentUser = req.user;
        
        // Get all workers
        const allWorkers = await User.find({ role: 'worker' }).select('name email');
        
        // Get all work orders with assignments
        const allWorkOrders = await WorkOrder.find({})
            .populate('assignedTo.worker', 'name email')
            .populate('building', 'name')
            .select('title assignedTo building status');
        
        res.json({
            success: true,
            data: {
                currentUser: {
                    id: currentUser?._id,
                    name: currentUser?.name,
                    email: currentUser?.email,
                    role: currentUser?.role
                },
                allWorkers: allWorkers,
                allWorkOrders: allWorkOrders.map(wo => ({
                    id: wo._id,
                    title: wo.title,
                    building: wo.building?.name,
                    status: wo.status,
                    assignedTo: wo.assignedTo.map(a => ({
                        workerId: a.worker._id,
                        workerName: a.worker.name,
                        workerEmail: a.worker.email
                    }))
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin routes - restrict to admin and manager
router.use(authController.restrictTo('admin', 'manager'));

// General user management
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;

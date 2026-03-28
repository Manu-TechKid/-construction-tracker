const express = require('express');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');
const payStubController = require('../controllers/payStubController');

const router = express.Router();

router.use(authController.protect);

// Worker/self access
router.get('/me', payStubController.getMyPayStubs);

// Admin/manager access
router.use(restrictToRoles('admin', 'manager'));

router.get('/worker/:workerId', payStubController.getPayStubsForWorker);
router.post('/', payStubController.uploadPayStubFile, payStubController.createPayStub);
router.get('/:id', payStubController.getPayStubById);
router.delete('/:id', payStubController.deletePayStub);

module.exports = router;

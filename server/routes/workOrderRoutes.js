const express = require('express');
const router = express.Router();
const {
  createWorkOrder,
  getAllWorkOrders,
  getWorkOrderById,
  updateWorkOrder,
  deleteWorkOrder
} = require('../controllers/workOrderController');
const { uploadWorkOrderPhotos, deleteWorkOrderPhoto } = require('../controllers/photoController');
const { protect, restrictTo } = require('../controllers/authController');
const { restrictToRoles, hidePricesFromWorkers } = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

// All routes are protected
router.use(protect);

// Hide prices from workers on all routes
router.use(hidePricesFromWorkers);

// Special route for workers to get only their assigned work orders
router.get('/my-assignments', async (req, res) => {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({
        status: 'fail',
        message: 'This endpoint is only for workers'
      });
    }
    
    const { getAllWorkOrders } = require('../controllers/workOrderController');
    // Add filter for worker's assignments
    req.query.assignedTo = req.user._id;
    await getAllWorkOrders(req, res);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

router.route('/')
  .post(restrictTo('admin', 'manager', 'supervisor'), createWorkOrder)
  .get(restrictTo('admin', 'manager', 'supervisor'), getAllWorkOrders);

router.route('/:id')
  .get(restrictTo('admin', 'manager', 'supervisor'), getWorkOrderById)
  .patch(restrictTo('admin', 'manager', 'supervisor'), updateWorkOrder)
  .delete(restrictTo('admin', 'manager'), deleteWorkOrder);

// Photo upload routes - restricted to non-workers
router.post('/:id/photos', restrictTo('admin', 'manager', 'supervisor'), upload.array('photos', 5), uploadWorkOrderPhotos);
router.delete('/:id/photos/:photoId', restrictTo('admin', 'manager', 'supervisor'), deleteWorkOrderPhoto);

module.exports = router;

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
const upload = require('../middleware/upload');

// All routes are protected
router.use(protect);

router.route('/')
  .post(createWorkOrder)
  .get(getAllWorkOrders);

router.route('/:id')
  .get(getWorkOrderById)
  .patch(updateWorkOrder)
  .delete(deleteWorkOrder);

// Photo upload routes
router.post('/:id/photos', upload.array('photos', 5), uploadWorkOrderPhotos);
router.delete('/:id/photos/:photoId', deleteWorkOrderPhoto);

module.exports = router;

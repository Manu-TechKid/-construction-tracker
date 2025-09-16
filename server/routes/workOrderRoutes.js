const express = require('express');
const router = express.Router();
const {
  createWorkOrder,
  getAllWorkOrders,
  getWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  addNote,
  updateStatus,
  getWorkOrdersByBuilding
} = require('../controllers/workOrderController');
const { uploadWorkOrderPhotos, deleteWorkOrderPhoto } = require('../controllers/photoController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// All routes are protected
router.use(protect);

router.route('/')
  .post(createWorkOrder)
  .get(getAllWorkOrders);

router.route('/:id')
  .get(getWorkOrder)
  .patch(updateWorkOrder)
  .delete(deleteWorkOrder);

// Photo upload routes
router.post('/:id/photos', upload.array('photos', 5), uploadWorkOrderPhotos);
router.delete('/:id/photos/:photoId', deleteWorkOrderPhoto);

// Notes and status routes
router.post('/:id/notes', addNote);
router.patch('/:id/status', updateStatus);

// Building-specific work orders
router.get('/building/:buildingId', getWorkOrdersByBuilding);

module.exports = router;

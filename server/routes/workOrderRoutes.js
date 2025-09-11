const express = require('express');
const router = express.Router();
const {
  createWorkOrder,
  getAllWorkOrders,
  getWorkOrderById,
  updateWorkOrder,
  deleteWorkOrder,
} = require('../controllers/workOrderController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

router.route('/')
  .post(createWorkOrder)
  .get(getAllWorkOrders);

router.route('/:id')
  .get(getWorkOrderById)
  .patch(updateWorkOrder)
  .delete(deleteWorkOrder);

module.exports = router;

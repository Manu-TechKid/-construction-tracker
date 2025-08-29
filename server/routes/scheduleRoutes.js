const express = require('express');
const scheduleController = require('../controllers/scheduleController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(scheduleController.getAllSchedules)
  .post(scheduleController.createSchedule);

router
  .route('/:id')
  .get(scheduleController.getSchedule)
  .patch(scheduleController.updateSchedule)
  .delete(restrictTo('admin', 'manager'), scheduleController.deleteSchedule);

router.get('/building/:buildingId', scheduleController.getBuildingSchedules);

module.exports = router;

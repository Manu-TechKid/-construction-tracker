const express = require('express');
const authController = require('../controllers/authController');
const callLogController = require('../controllers/callLogController');

const router = express.Router();

// All routes protected
router.use(authController.protect);

router
  .route('/')
  .get(callLogController.getCallLogs)
  .post(callLogController.createCallLog);

router.get('/stats', callLogController.getCallStats);

router
  .route('/:id')
  .get(callLogController.getCallLog)
  .patch(callLogController.updateCallLog)
  .delete(callLogController.deleteCallLog);

module.exports = router;

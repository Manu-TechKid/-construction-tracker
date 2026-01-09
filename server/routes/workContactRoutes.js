const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');
const workContactController = require('../controllers/workContactController');

const router = express.Router();

// All routes below this are protected
router.use(protect);

// Restrict all subsequent routes to admin, manager, and supervisor
router.use(restrictTo('admin', 'manager', 'supervisor'));

router.route('/')
  .get(workContactController.getAllWorkContacts)
  .post(workContactController.createWorkContact);

router.route('/:id')
  .get(workContactController.getWorkContact)
  .patch(workContactController.updateWorkContact)
  .delete(workContactController.deleteWorkContact);

module.exports = router;

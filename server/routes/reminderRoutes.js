const express = require('express');
const reminderController = require('../controllers/reminderController');
const authController = require('../controllers/authController');
const { upload } = require('../utils/multer');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Routes for reminders
router
  .route('/')
  .get(reminderController.getAllReminders)
  .post(
    upload.reminder.array('photos', 10),
    reminderController.createReminder
  );

router
  .route('/upcoming')
  .get(reminderController.getUpcomingReminders);

router
  .route('/:id')
  .get(reminderController.getReminder)
  .patch(
    upload.reminder.array('photos', 10),
    reminderController.updateReminder
  )
  .delete(reminderController.deleteReminder);

// Route for adding notes to a reminder
router
  .route('/:id/notes')
  .post(reminderController.addNote);

module.exports = router;

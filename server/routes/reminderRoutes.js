const express = require('express');
const {
  createReminder,
  getAllReminders,
  getReminder,
  updateReminder,
  deleteReminder,
  addNote,
  getUpcomingReminders
} = require('../controllers/reminderController');
const { uploadReminderPhotos, deleteReminderPhoto } = require('../controllers/photoController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Routes for reminders
router
  .route('/')
  .get(getAllReminders)
  .post(createReminder);

router
  .route('/upcoming')
  .get(getUpcomingReminders);

router
  .route('/:id')
  .get(getReminder)
  .patch(updateReminder)
  .delete(deleteReminder);

// Photo upload routes
router.post('/:id/photos', upload.array('photos', 5), uploadReminderPhotos);
router.delete('/:id/photos/:photoId', deleteReminderPhoto);

// Route for adding notes to a reminder
router
  .route('/:id/notes')
  .post(addNote);

module.exports = router;

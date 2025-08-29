const express = require('express');
const noteController = require('../controllers/noteController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(noteController.getAllNotes)
  .post(noteController.createNote);

router.get('/search-buildings', noteController.searchBuildings);

router
  .route('/:id')
  .get(noteController.getNote)
  .patch(noteController.updateNote)
  .delete(restrictTo('admin', 'manager'), noteController.deleteNote);

router.get('/building/:buildingId', noteController.getBuildingNotes);

module.exports = router;

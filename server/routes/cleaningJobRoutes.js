const express = require('express');
const cleaningJobController = require('../controllers/cleaningJobController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware - only authenticated users can access
router.use(authController.protect);

router
  .route('/')
  .get(cleaningJobController.getAllCleaningJobs)
  .post(cleaningJobController.createCleaningJob);

router
  .route('/subcategories')
  .get(cleaningJobController.getCleaningJobSubcategories);

router
  .route('/:id')
  .patch(cleaningJobController.updateCleaningJob)
  .delete(cleaningJobController.deleteCleaningJob);

module.exports = router;

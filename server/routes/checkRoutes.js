const express = require('express');
const checkController = require('../controllers/checkController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(restrictToRoles('admin', 'manager', 'supervisor'), checkController.getAllChecks)
  .post(restrictToRoles('admin', 'manager', 'supervisor'), checkController.createCheck);

router
  .route('/:id')
  .get(restrictToRoles('admin', 'manager', 'supervisor'), checkController.getCheck)
  .patch(restrictToRoles('admin', 'manager', 'supervisor'), checkController.updateCheck)
  .delete(restrictToRoles('admin', 'manager'), checkController.deleteCheck);

router.get('/:id/pdf', restrictToRoles('admin', 'manager', 'supervisor'), checkController.generatePDF);
router.patch('/:id/void', restrictToRoles('admin', 'manager', 'supervisor'), checkController.voidCheck);
router.patch('/:id/mark-printed', restrictToRoles('admin', 'manager', 'supervisor'), checkController.markPrinted);

module.exports = router;

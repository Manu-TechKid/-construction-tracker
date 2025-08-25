const express = require('express');
const invoiceController = require('../controllers/invoiceController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router
  .route('/')
  .get(invoiceController.getAllInvoices)
  .post(invoiceController.createInvoice);

router
  .route('/:id')
  .get(invoiceController.getInvoice)
  .patch(invoiceController.updateInvoice)
  .delete(invoiceController.deleteInvoice);

router.patch('/:id/mark-paid', invoiceController.markAsPaid);
router.get('/building/:buildingId/unbilled', invoiceController.getUnbilledWorkOrders);

module.exports = router;

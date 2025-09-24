const express = require('express');
const invoiceController = require('../controllers/invoiceController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Get unbilled work orders (available to all authenticated users)
router.get('/building/:buildingId/unbilled', invoiceController.getUnbilledWorkOrders);

// Worker routes (view only)
router.get('/my-invoices', invoiceController.getMyInvoices);

// Supervisor/Manager/Admin routes
router.use(restrictToRoles('supervisor', 'manager', 'admin'));

router
  .route('/')
  .get(invoiceController.getAllInvoices)
  .post(invoiceController.createInvoice);

router
  .route('/:id')
  .get(invoiceController.getInvoice)
  .patch(invoiceController.updateInvoice)
  .delete(restrictToRoles('admin', 'manager'), invoiceController.deleteInvoice);

// Payment management (admin/manager only)
router.patch('/:id/mark-paid', restrictToRoles('admin', 'manager'), invoiceController.markAsPaid);
router.patch('/:id/update-payment', restrictToRoles('admin', 'manager'), invoiceController.updatePayment);

// Reports (admin/manager only)
router.get('/reports/summary', restrictToRoles('admin', 'manager'), invoiceController.getSummaryReport);
router.get('/reports/aging', restrictToRoles('admin', 'manager'), invoiceController.getAgingReport);

module.exports = router;

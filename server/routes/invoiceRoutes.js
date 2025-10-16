const express = require('express');
const invoiceController = require('../controllers/invoiceController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Get unbilled work orders (available to all authenticated users)
router.get('/building/:buildingId/unbilled', invoiceController.getUnbilledWorkOrders);

// Get filtered work orders for invoice creation
router.get('/work-orders/filtered', invoiceController.getFilteredWorkOrders);

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

// Enhanced invoice management
router.post('/from-estimate/:estimateId', invoiceController.createFromEstimate);
router.patch('/:id/send', invoiceController.sendInvoice);
router.patch('/:id/accept', invoiceController.acceptInvoice);
router.patch('/:id/calculate-totals', invoiceController['calculateTotals']);
router.get('/:id/pdf', invoiceController.generatePDF);
router.post('/:id/email', invoiceController.emailInvoice);

// Payment management (admin/manager only)
router.patch('/:id/mark-paid', restrictToRoles('admin', 'manager'), invoiceController.markAsPaid);
router.patch('/:id/update-payment', restrictToRoles('admin', 'manager'), invoiceController.updatePayment);

// Line items management
router.post('/:id/line-items', invoiceController.addLineItem);
router.put('/:id/line-items/:lineItemId', invoiceController.updateLineItem);
router.delete('/:id/line-items/:lineItemId', invoiceController.removeLineItem);

// Invoice numbering
router.get('/next-number', restrictToRoles('admin', 'manager'), invoiceController.getNextInvoiceNumber);

// Reports (admin/manager only)
router.get('/reports/summary', restrictToRoles('admin', 'manager'), invoiceController.getSummaryReport);
router.get('/reports/aging', restrictToRoles('admin', 'manager'), invoiceController.getAgingReport);
router.get('/reports/client-summary', restrictToRoles('admin', 'manager'), invoiceController.getClientSummaryReport);

module.exports = router;

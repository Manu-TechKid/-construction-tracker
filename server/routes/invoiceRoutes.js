const express = require('express');
const invoiceController = require('../controllers/invoiceController');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');
const logActivity = require('../middleware/activityLogger');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Get unbilled work orders (available to all authenticated users)
router.get('/building/:buildingId/unbilled', invoiceController.getUnbilledWorkOrders);

// Get filtered work orders for invoice creation
router.get('/work-orders/filtered', invoiceController.getFilteredWorkOrders);

// Debug endpoints
router.get('/debug/invoice-number/:invoiceNumber', invoiceController.debugInvoiceNumber);
router.post('/debug/force-delete-draft/:invoiceNumber', invoiceController.forceDeleteDraftInvoice);

// Worker routes (view only)
router.get('/my-invoices', invoiceController.getMyInvoices);

// Supervisor/Manager/Admin routes
router.use(restrictToRoles('supervisor', 'manager', 'admin'));

router
  .route('/')
  .get(invoiceController.getAllInvoices)
  .post(logActivity('Invoice', 'create'), invoiceController.createInvoice);

router
  .route('/:id')
  .get(invoiceController.getInvoice)
  .patch(logActivity('Invoice', 'update'), invoiceController.updateInvoice)
  .delete(restrictToRoles('admin', 'manager'), logActivity('Invoice', 'delete'), invoiceController.deleteInvoice);

// Enhanced invoice management
router.post('/from-estimate/:estimateId', logActivity('Invoice', 'create'), invoiceController.createFromEstimate);
router.patch('/:id/send', invoiceController.sendInvoice);
router.patch('/:id/accept', invoiceController.acceptInvoice);
router.patch('/:id/calculate-totals', invoiceController['calculateTotals']);
router.get('/:id/pdf', invoiceController.generatePDF);
router.post('/:id/email', invoiceController.emailInvoice);

// Payment management (admin/manager only)
router.patch('/:id/mark-paid', restrictToRoles('admin', 'manager'), logActivity('Invoice', 'paid'), invoiceController.markAsPaid);
router.patch('/:id/update-payment', restrictToRoles('admin', 'manager'), invoiceController.updatePayment);

// Work order management in invoices (NEW - allows editing invoices)
router.post('/:id/add-work-orders', invoiceController.addWorkOrdersToInvoice);
router.post('/:id/remove-work-orders', invoiceController.removeWorkOrdersFromInvoice);

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

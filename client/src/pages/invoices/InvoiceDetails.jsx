import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  Typography,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Print as PrintIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

import { 
  useGetInvoiceQuery,
  useMarkInvoiceAsPaidMutation,
  useDeleteInvoiceMutation
} from '../../features/invoices/invoicesApiSlice';
import { useAuth } from '../../hooks/useAuth';

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const { data: invoiceData, isLoading, error } = useGetInvoiceQuery(id);
  const [markAsPaid, { isLoading: isMarkingPaid }] = useMarkInvoiceAsPaidMutation();
  const [deleteInvoice, { isLoading: isDeleting }] = useDeleteInvoiceMutation();
  
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load invoice details: {error?.data?.message || error.message}
        </Alert>
      </Container>
    );
  }
  
  const invoice = invoiceData?.data;
  
  if (!invoice) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">Invoice not found</Alert>
      </Container>
    );
  }
  
  const handleMarkAsPaid = async () => {
    try {
      await markAsPaid(id).unwrap();
      toast.success('Invoice marked as paid successfully');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to mark invoice as paid');
    }
  };
  
  const handleDelete = async () => {
    try {
      await deleteInvoice(id).unwrap();
      toast.success('Invoice deleted successfully');
      navigate('/invoices');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to delete invoice');
    }
    setDeleteDialogOpen(false);
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'sent': return 'info';
      case 'overdue': return 'error';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/invoices')} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1">
              Invoice {invoice.invoiceNumber}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {invoice.building?.name}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip 
            label={invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1) || 'Draft'}
            color={getStatusColor(invoice.status)}
            size="large"
          />
          {hasPermission('update:invoices') && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/invoices/${id}/edit`)}
            >
              Edit
            </Button>
          )}
          {hasPermission('delete:invoices') && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          )}
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Invoice Details */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title="Invoice Information"
              avatar={<ReceiptIcon />}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Building
                  </Typography>
                  <Typography variant="body1">
                    {invoice.building?.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {invoice.building?.address}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Issue Date
                  </Typography>
                  <Typography variant="body1">
                    {(() => {
                      try {
                        if (!invoice.issueDate) return 'Not set';
                        const date = new Date(invoice.issueDate);
                        if (isNaN(date.getTime())) return 'Invalid date';
                        return format(date, 'MMM dd, yyyy');
                      } catch (error) {
                        console.warn('Error formatting issue date:', error);
                        return 'Error';
                      }
                    })()}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Due Date
                  </Typography>
                  <Typography variant="body1">
                    {(() => {
                      try {
                        if (!invoice.dueDate) return 'Not set';
                        const date = new Date(invoice.dueDate);
                        if (isNaN(date.getTime())) return 'Invalid date';
                        return format(date, 'MMM dd, yyyy');
                      } catch (error) {
                        console.warn('Error formatting due date:', error);
                        return 'Error';
                      }
                    })()}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Status
                  </Typography>
                  <Chip 
                    label={invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1) || 'Draft'}
                    color={getStatusColor(invoice.status)}
                    size="small"
                  />
                </Grid>
                
                {invoice.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Notes
                    </Typography>
                    <Typography variant="body2">
                      {invoice.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
          
          {/* Work Orders */}
          {invoice.workOrders && invoice.workOrders.length > 0 && (
            <Card>
              <CardHeader title="Work Orders" />
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Work Order</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.workOrders.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {item.workOrder?.title || 'Work Order'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Apt: {item.workOrder?.apartmentNumber || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">${item.unitPrice?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell align="right">${item.totalPrice?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </Grid>
        
        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Cost Summary */}
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Cost Summary" />
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Subtotal:</Typography>
                <Typography variant="body2">${invoice.subtotal?.toFixed(2) || '0.00'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Tax:</Typography>
                <Typography variant="body2">${invoice.tax?.toFixed(2) || '0.00'}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6">${invoice.total?.toFixed(2) || '0.00'}</Typography>
              </Box>
            </CardContent>
          </Card>
          
          {/* Actions */}
          <Card>
            <CardHeader title="Actions" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {invoice.status !== 'paid' && hasPermission('update:invoices') && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PaymentIcon />}
                    onClick={handleMarkAsPaid}
                    disabled={isMarkingPaid}
                    fullWidth
                  >
                    {isMarkingPaid ? 'Marking as Paid...' : 'Mark as Paid'}
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => window.print()}
                  fullWidth
                >
                  Print Invoice
                </Button>
                
                {hasPermission('update:invoices') && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/invoices/${id}/edit`)}
                    fullWidth
                  >
                    Edit Invoice
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Invoice</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete invoice {invoice.invoiceNumber}? 
            This action cannot be undone and will reset the billing status of associated work orders.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InvoiceDetails;

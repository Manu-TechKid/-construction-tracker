import React, { useState, useEffect } from 'react';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Assignment as WorkOrderIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

import {
  useGetInvoiceQuery,
  useUpdateInvoiceMutation
} from '../../features/invoices/invoicesApiSlice';

const validationSchema = Yup.object({
  status: Yup.string().oneOf(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  dueDate: Yup.date().required('Due date is required'),
  notes: Yup.string(),
});

const EditInvoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: invoiceData, isLoading, error } = useGetInvoiceQuery(id);
  const [updateInvoice, { isLoading: isUpdating }] = useUpdateInvoiceMutation();

  const formik = useFormik({
    initialValues: {
      status: 'draft',
      dueDate: new Date(),
      notes: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const updateData = {
          status: values.status,
          dueDate: values.dueDate instanceof Date ? values.dueDate.toISOString() : new Date(values.dueDate).toISOString(),
          notes: values.notes,
        };

        await updateInvoice({ id, ...updateData }).unwrap();
        toast.success('Invoice updated successfully');
        navigate('/invoices');
      } catch (error) {
        console.error('Failed to update invoice:', error);
        const errorMessage = error?.data?.message || error?.message || 'Failed to update invoice';
        toast.error(errorMessage);
      }
    },
  });

  // Load invoice data when available
  useEffect(() => {
    console.log('EditInvoice: Invoice data received:', invoiceData);
    if (invoiceData?.data) {
      const invoice = invoiceData.data;
      console.log('EditInvoice: Setting form values for invoice:', invoice);
      try {
        let dueDateValue = new Date();
        if (invoice.dueDate) {
          const parsedDate = new Date(invoice.dueDate);
          if (!isNaN(parsedDate.getTime())) {
            // Ensure we handle timezone properly - convert to local date
            dueDateValue = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000);
          }
        }

        formik.setValues({
          status: invoice.status || 'draft',
          dueDate: dueDateValue,
          notes: invoice.notes || '',
        });
      } catch (error) {
        console.warn('Error setting form values:', error);
        // Set default values if there's an error
        formik.setValues({
          status: invoice.status || 'draft',
          dueDate: new Date(),
          notes: invoice.notes || '',
        });
      }
    }
  }, [invoiceData]);

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body1" color="textSecondary">
          Loading invoice details...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load invoice: {error?.data?.message || error.message}
        </Alert>
      </Container>
    );
  }

  const invoice = invoiceData?.data?.invoice;

  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('EditInvoice: Final invoice object:', invoice);
    console.log('EditInvoice: Invoice total:', invoice?.total);
    console.log('EditInvoice: Invoice subtotal:', invoice?.subtotal);
    console.log('EditInvoice: Invoice tax:', invoice?.tax);
    console.log('EditInvoice: Invoice workOrders:', invoice?.workOrders);
  }

  if (!invoice) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">
          Invoice not found. Invoice ID: {id}
          <br />
          <Typography variant="caption" component="div" sx={{ mt: 1 }}>
            Debug info: {JSON.stringify(invoiceData, null, 2)}
          </Typography>
        </Alert>
      </Container>
    );
  }

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'sent': return 'info';
      case 'overdue': return 'error';
      case 'cancelled': return 'default';
      default: return 'warning';
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => navigate(`/invoices/${id}`)}
            color="primary"
            disabled={isUpdating}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Edit Invoice {invoice.invoiceNumber}
          </Typography>
        </Box>

        {/* Invoice Summary */}
        <Card sx={{ mb: 3 }}>
          <CardHeader title="Invoice Summary" />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {formatCurrency(invoice.total)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Amount
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Chip
                    label={invoice.status?.toUpperCase() || 'DRAFT'}
                    color={getStatusColor(invoice.status)}
                    size="large"
                  />
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Current Status
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Due Date
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">
                    {invoice.workOrders?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Work Orders
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Work Orders Details */}
        {invoice.workOrders && invoice.workOrders.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title="Work Orders in This Invoice"
              avatar={<WorkOrderIcon />}
            />
            <CardContent>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Apartment</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Cost</TableCell>
                      <TableCell align="right">Profit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoice.workOrders.map((item, index) => (
                      <TableRow key={item.workOrder?._id || index} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.workOrder?.title || 'Untitled Work Order'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {item.workOrder?._id || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {item.workOrder?.description || item.description || 'No description'}
                        </TableCell>
                        <TableCell>
                          {item.workOrder?.apartmentNumber ? (
                            <Box>
                              <Typography variant="body2">
                                {invoice.building?.name || 'Unknown Building'}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                Apt {item.workOrder.apartmentNumber}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              No apartment
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.workOrder?.status || 'pending'}
                            color={item.workOrder?.status === 'completed' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="success.main" fontWeight="medium">
                            {formatCurrency(item.unitPrice || item.workOrder?.price || item.workOrder?.estimatedCost)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="error.main" fontWeight="medium">
                            {formatCurrency(item.workOrder?.cost || item.workOrder?.actualCost)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="primary.main" fontWeight="medium">
                            {formatCurrency(item.totalPrice || ((item.unitPrice || item.workOrder?.price || 0) * (item.quantity || 1)))}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Cost Summary */}
        <Card sx={{ mb: 3 }}>
          <CardHeader title="Cost Summary" />
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Subtotal:</Typography>
              <Typography variant="body2">
                {formatCurrency(invoice.subtotal)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Tax:</Typography>
              <Typography variant="body2">
                {formatCurrency(invoice.tax)}
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6">
                {formatCurrency(invoice.total)}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <form onSubmit={formik.handleSubmit}>
          <Card>
            <CardHeader title="Edit Invoice Details" />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl
                    fullWidth
                    error={formik.touched.status && Boolean(formik.errors.status)}
                  >
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="status"
                      value={formik.values.status}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="Status"
                    >
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="sent">Sent</MenuItem>
                      <MenuItem value="paid">Paid</MenuItem>
                      <MenuItem value="overdue">Overdue</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                    <FormHelperText>
                      {formik.touched.status && formik.errors.status}
                    </FormHelperText>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Due Date"
                    value={formik.values.dueDate}
                    onChange={(newValue) => formik.setFieldValue('dueDate', newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: formik.touched.dueDate && Boolean(formik.errors.dueDate),
                        helperText: formik.touched.dueDate && formik.errors.dueDate
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    name="notes"
                    label="Notes"
                    value={formik.values.notes}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.notes && Boolean(formik.errors.notes)}
                    helperText={formik.touched.notes && formik.errors.notes}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/invoices/${id}`)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isUpdating || !formik.isValid}
              startIcon={isUpdating ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </form>
      </Container>
    </LocalizationProvider>
  );
};

export default EditInvoice;

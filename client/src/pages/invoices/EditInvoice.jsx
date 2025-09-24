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
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon
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
        await updateInvoice({ id, ...values }).unwrap();
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
    if (invoiceData?.data) {
      const invoice = invoiceData.data;
      try {
        let dueDateValue = new Date();
        if (invoice.dueDate) {
          const parsedDate = new Date(invoice.dueDate);
          if (!isNaN(parsedDate.getTime())) {
            dueDateValue = parsedDate;
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
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
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
  
  const invoice = invoiceData?.data;
  
  if (!invoice) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">Invoice not found</Alert>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
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
        
        <form onSubmit={formik.handleSubmit}>
          <Card>
            <CardHeader title="Invoice Details" />
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
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        fullWidth 
                        error={formik.touched.dueDate && Boolean(formik.errors.dueDate)}
                        helperText={formik.touched.dueDate && formik.errors.dueDate}
                      />
                    )}
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

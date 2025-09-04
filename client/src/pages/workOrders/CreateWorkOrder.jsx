import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Container,
  Box,
  Typography,
  Paper,
  IconButton
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import WorkOrderForm from '../../components/workOrders/WorkOrderForm';
import { useCreateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';

const CreateWorkOrder = () => {
  const navigate = useNavigate();
  const [createWorkOrder, { isLoading }] = useCreateWorkOrderMutation();

  const handleSubmit = async (values, { setErrors, setSubmitting, setStatus }) => {
    try {
      console.log('Submitting work order:', values);
      
      // Validate required fields
      const requiredFields = ['title', 'building', 'apartmentNumber', 'workType'];
      const missingFields = requiredFields.filter(field => !values[field]);
      
      if (missingFields.length > 0) {
        const errors = {};
        missingFields.forEach(field => {
          errors[field] = 'This field is required';
        });
        setErrors(errors);
        setSubmitting(false);
        return;
      }
      
      // Show loading state
      const loadingToast = toast.loading('Creating work order...');
      
      try {
        const result = await createWorkOrder(values).unwrap();
        console.log('Work order creation response:', result);
        
        // Update loading toast to success
        toast.update(loadingToast, {
          render: result.message || 'Work order created successfully!',
          type: 'success',
          isLoading: false,
          autoClose: 3000
        });
        
        // Navigate to work orders list after a short delay
        setTimeout(() => {
          navigate('/work-orders');
        }, 1000);
        
        return { success: true, data: result };
      } catch (error) {
        console.error('API Error:', error);
        
        // Update loading toast to error
        toast.update(loadingToast, {
          render: error?.data?.message || error?.message || 'Failed to create work order',
          type: 'error',
          isLoading: false,
          autoClose: 5000
        });
        
        // Handle validation errors
        if (error?.data?.errors) {
          const formErrors = {};
          Object.entries(error.data.errors).forEach(([field, message]) => {
            formErrors[field] = Array.isArray(message) ? message[0] : message;
          });
          setErrors(formErrors);
        } else if (error?.data?.fieldErrors) {
          // Handle field-specific errors
          const formErrors = {};
          Object.entries(error.data.fieldErrors).forEach(([field, messages]) => {
            formErrors[field] = Array.isArray(messages) ? messages[0] : messages;
          });
          setErrors(formErrors);
        }
        
        // Set form status with error
        setStatus({ error: error?.data?.message || 'Failed to create work order' });
        
        return { success: false, error };
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred. Please try again.');
      setStatus({ error: 'An unexpected error occurred. Please try again.' });
      return { success: false, error };
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" mb={3}>
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              Create New Work Order
            </Typography>
          </Box>

          <WorkOrderForm
            mode="create"
            onSubmit={handleSubmit}
            isSubmitting={isLoading}
            onCancel={() => navigate('/work-orders')}
          />
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

export default CreateWorkOrder;

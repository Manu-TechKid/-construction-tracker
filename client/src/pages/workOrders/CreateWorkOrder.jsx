import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Container,
  Box,
  Typography,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import WorkOrderForm from '../../components/workOrders/WorkOrderForm';
import { useCreateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';

const CreateWorkOrder = () => {
  const navigate = useNavigate();
  const [createWorkOrder, { isLoading }] = useCreateWorkOrderMutation();

  const handleSubmit = async (values, { setSubmitting, setErrors, setStatus }) => {
    try {
      console.log('Submitting work order:', values);
      
      // Prepare the data for the API
      const workOrderData = {
        ...values,
        // Format assigned workers for the API
        assignedTo: values.assignedWorkers?.map(workerId => ({
          worker: workerId,
          status: 'pending',
          assignedAt: new Date().toISOString(),
          assignedBy: 'system' // This should be the current user's ID in a real app
        })) || [],
        // Ensure dates are properly formatted for the API
        scheduledDate: values.scheduledDate ? new Date(values.scheduledDate).toISOString() : null,
        estimatedCompletionDate: values.estimatedCompletionDate 
          ? new Date(values.estimatedCompletionDate).toISOString() 
          : null,
        // Remove the temporary assignedWorkers field
        assignedWorkers: undefined
      };
      
      console.log('Sending work order data to API:', workOrderData);
      
      // Show loading state
      const loadingToast = toast.loading('Creating work order...');
      
      try {
        const result = await createWorkOrder(workOrderData).unwrap();
        console.log('Work order creation response:', result);
        
        // Show success message
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
        
        // Show error message
        const errorMessage = error?.data?.message || error?.message || 'Failed to create work order';
        toast.update(loadingToast, {
          render: errorMessage,
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
          
          // Also set status for non-field specific errors
          setStatus({ 
            error: errorMessage,
            details: error?.data?.details
          });
        } else {
          // For non-validation errors
          setStatus({ 
            error: errorMessage,
            details: error?.data?.details
          });
        }
        
        // Re-throw to allow form to handle the error state
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred. Please try again.');
      setStatus({ 
        error: 'An unexpected error occurred. Please try again.',
        details: error.message
      });
      return { success: false, error };
    } finally {
      setSubmitting(false);
    }
  };

  // Wrap the component in a try-catch to prevent rendering errors
  try {
    if (isLoading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
          <Box ml={2}>Loading work order form...</Box>
        </Box>
      );
    }

    return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" mb={3}>
            <IconButton 
              onClick={() => navigate(-1)} 
              sx={{ mr: 2 }}
              aria-label="Go back"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              Create New Work Order
            </Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <WorkOrderForm
              mode="create"
              onSubmit={handleSubmit}
              isSubmitting={isLoading}
              onCancel={() => navigate('/work-orders')}
              initialValues={{
                title: '',
                workType: '',
                status: 'pending',
                building: '',
                apartmentNumber: '',
                description: '',
                scheduledDate: null,
                estimatedCompletionDate: null,
                assignedWorkers: [],
                photos: [],
                priority: 'medium',
                workSubType: ''
              }}
            />
          </Box>
          </Paper>
        </Container>
      </LocalizationProvider>
    );
  } catch (error) {
    console.error('Error rendering CreateWorkOrder:', error);
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          An error occurred while rendering the form. Please try again.
        </Alert>
        <Button 
          variant="outlined" 
          onClick={() => window.location.reload()}
          startIcon={<RefreshIcon />}
        >
          Reload Page
        </Button>
      </Box>
    );
  }
};

export default CreateWorkOrder;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import WorkOrderForm from '../../components/workOrders/WorkOrderFormNew';
import { useCreateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';

const CreateWorkOrder = () => {
  const navigate = useNavigate();
  const [createWorkOrder, { isLoading }] = useCreateWorkOrderMutation();

  const handleSubmit = async (values) => {
    try {
      console.log('Submitting work order:', values);
      
      // Show loading state
      const loadingToast = toast.loading('Creating work order...');
      
      try {
        const result = await createWorkOrder(values).unwrap();
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
        
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      return { success: false, error };
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
        <Box sx={{ p: 3 }}>
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
          />
        </Box>
      </Box>
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

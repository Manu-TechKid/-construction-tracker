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

  const handleSubmit = async (values) => {
    try {
      console.log('Submitting work order:', values);
      const result = await createWorkOrder(values).unwrap();
      
      // Log the API response for debugging
      console.log('Work order creation response:', result);
      
      // Show success message
      toast.success(result.message || 'Work order created successfully!');
      
      // Navigate to work orders list after a short delay
      setTimeout(() => {
        navigate('/work-orders');
      }, 500);
      
      return result; // Return the result to the form
    } catch (error) {
      console.error('Error creating work order:', {
        error,
        status: error?.status,
        data: error?.data,
        message: error?.message
      });
      
      // Show error message
      toast.error(error?.data?.message || error?.message || 'Failed to create work order');
      
      // Re-throw to let WorkOrderForm handle the error state
      throw error;
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

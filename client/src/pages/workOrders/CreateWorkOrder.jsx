import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Button, Typography, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCreateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import WorkOrderForm from '../../components/workOrders/WorkOrderForm';
import { toast } from 'react-toastify';

const CreateWorkOrder = () => {
  const navigate = useNavigate();
  const [createWorkOrder, { isLoading }] = useCreateWorkOrderMutation();

  const handleSubmit = async (formData) => {
    try {
      const result = await createWorkOrder(formData).unwrap();
      toast.success('Work order created successfully');
      navigate('/work-orders');
    } catch (error) {
      console.error('Failed to create work order:', error);
      const errorMessage = error?.data?.message || error?.message || 'Failed to create work order';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    navigate('/work-orders');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/work-orders')}
        sx={{ mb: 2 }}
      >
        Back to Work Orders
      </Button>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Work Order
        </Typography>
        
        <WorkOrderForm
          onSubmit={handleSubmit}
          isSubmitting={isLoading}
          onCancel={handleCancel}
        />
      </Paper>
    </Container>
  );
};

export default CreateWorkOrder;

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Box, Button, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useGetWorkOrderQuery, useUpdateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import WorkOrderForm from '../../components/workOrders/WorkOrderForm';
import { toast } from 'react-toastify';

const EditWorkOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: workOrderData, isLoading, error } = useGetWorkOrderQuery(id);
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  const [initialValues, setInitialValues] = useState(null);

  useEffect(() => {
    if (workOrderData) {
      // Extract work order from API response
      const workOrder = workOrderData.data || workOrderData;
      
      setInitialValues({
        building: workOrder.building?._id || workOrder.building,
        apartmentNumber: workOrder.apartmentNumber || '',
        block: workOrder.block || '',
        apartmentStatus: workOrder.apartmentStatus || 'vacant',
        description: workOrder.description || '',
        priority: workOrder.priority || 'medium',
        status: workOrder.status || 'pending',
        estimatedCost: workOrder.estimatedCost || 0,
        actualCost: workOrder.actualCost || 0,
        startDate: workOrder.startDate ? new Date(workOrder.startDate) : null,
        endDate: workOrder.endDate ? new Date(workOrder.endDate) : null,
        scheduledDate: workOrder.scheduledDate ? new Date(workOrder.scheduledDate) : null,
        estimatedCompletionDate: workOrder.estimatedCompletionDate ? new Date(workOrder.estimatedCompletionDate) : null,
        services: workOrder.services || [],
        assignedTo: workOrder.assignedTo?.map(assignment => assignment.worker) || [],
        photos: workOrder.photos || []
      });
    }
  }, [workOrderData]);

  const handleSubmit = async (formData) => {
    try {
      const result = await updateWorkOrder({ id, ...formData }).unwrap();
      toast.success('Work order updated successfully');
      navigate('/work-orders');
    } catch (error) {
      console.error('Failed to update work order:', error);
      const errorMessage = error?.data?.message || error?.message || 'Failed to update work order';
      toast.error(errorMessage);
      throw error; // Re-throw to let form handle it
    }
  };

  const handleCancel = () => {
    navigate('/work-orders');
  };

  const handleBack = () => {
    navigate('/work-orders');
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Failed to load work order: {error?.data?.message || error?.message}
        </Alert>
      </Container>
    );
  }

  if (!initialValues) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={handleBack}
        sx={{ mb: 2 }}
        variant="outlined"
      >
        Back to Work Orders
      </Button>
      
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
          Edit Work Order
        </Typography>
        
        <WorkOrderForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isSubmitting={isUpdating}
          onCancel={handleCancel}
          isEdit={true}
        />
      </Paper>
    </Container>
  );
};

export default EditWorkOrder;

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Box, Button, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCreateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import WorkOrderForm from '../../components/workOrders/WorkOrderForm';
import { toast } from 'react-toastify';

const CreateWorkOrder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [createWorkOrder, { isLoading }] = useCreateWorkOrderMutation();
  const [initialValues, setInitialValues] = useState({
    building: '',
    apartmentNumber: '',
    block: '',
    apartmentStatus: '',
    workType: '',
    workSubType: '',
    description: '',
    priority: 'medium',
    startDate: new Date(),
    estimatedCost: '',
    notes: ''
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Get building ID from URL parameters
    const buildingId = searchParams.get('building');
    if (buildingId) {
      setInitialValues(prev => ({
        ...prev,
        building: buildingId
      }));
    }
    setIsInitialized(true);
  }, [searchParams]);

  const handleSubmit = async (formData) => {
    try {
      if (!formData.building) {
        throw new Error('Building is required');
      }
      
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

  if (!isInitialized) {
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
        onClick={() => navigate('/work-orders')}
        sx={{ mb: 2 }}
        variant="outlined"
      >
        Back to Work Orders
      </Button>
      
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
          Create New Work Order
        </Typography>
        
        <WorkOrderForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isSubmitting={isLoading}
          onCancel={handleCancel}
        />
      </Paper>
    </Container>
  );
};

export default CreateWorkOrder;

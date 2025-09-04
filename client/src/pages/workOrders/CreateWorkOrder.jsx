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
      await createWorkOrder(values).unwrap();
      // The success toast will be shown by the WorkOrderForm
      navigate('/work-orders');
    } catch (error) {
      console.error('Error creating work order:', error);
      // The error will be handled by the WorkOrderForm
      throw error; // Re-throw to let WorkOrderForm handle the error state
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

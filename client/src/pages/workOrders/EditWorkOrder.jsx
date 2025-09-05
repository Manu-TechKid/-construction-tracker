import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Button, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle,
  IconButton,
  Tooltip
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import { 
  useGetWorkOrderQuery, 
  useUpdateWorkOrderMutation, 
  useDeleteWorkOrderMutation 
} from '../../features/workOrders/workOrdersApiSlice';
import WorkOrderForm from '../../components/workOrders/WorkOrderForm';
import { toast } from 'react-toastify';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const EditWorkOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: workOrderData, isLoading, error, refetch } = useGetWorkOrderQuery(id);
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  const [deleteWorkOrder, { isLoading: isDeleting }] = useDeleteWorkOrderMutation();
  const [initialValues, setInitialValues] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (workOrderData) {
      // Extract work order from API response
      const workOrder = workOrderData.data || workOrderData;
      
      setInitialValues({
        _id: workOrder._id,
        title: workOrder.title || '',
        building: workOrder.building?._id || workOrder.building,
        apartmentNumber: workOrder.apartmentNumber || '',
        block: workOrder.block || '',
        apartmentStatus: workOrder.apartmentStatus || 'vacant',
        workType: workOrder.workType || '',
        workSubType: workOrder.workSubType || '',
        description: workOrder.description || '',
        priority: workOrder.priority || 'medium',
        status: workOrder.status || 'pending',
        estimatedCost: workOrder.estimatedCost || 0,
        actualCost: workOrder.actualCost || 0,
        scheduledDate: workOrder.scheduledDate ? new Date(workOrder.scheduledDate) : null,
        estimatedCompletionDate: workOrder.estimatedCompletionDate ? new Date(workOrder.estimatedCompletionDate) : null,
        startDate: workOrder.startDate ? new Date(workOrder.startDate) : null,
        endDate: workOrder.endDate ? new Date(workOrder.endDate) : null,
        services: workOrder.services || [],
        assignedTo: workOrder.assignedTo?.map(assignment => ({
          worker: assignment.worker?._id || assignment.worker,
          status: assignment.status || 'pending',
          assignedAt: assignment.assignedAt || new Date().toISOString(),
          assignedBy: assignment.assignedBy || 'system'
        })) || [],
        photos: workOrder.photos || [],
        notes: workOrder.notes || ''
      });
    }
  }, [workOrderData]);

  const handleSubmit = async (formData) => {
    try {
      console.log('Submitting work order update:', formData);
      
      // Transform the data for the API
      const updateData = {
        ...formData,
        // Format assigned workers
        assignedTo: formData.assignedWorkers?.map(workerId => ({
          worker: workerId,
          status: 'pending',
          assignedAt: new Date().toISOString(),
          assignedBy: 'system' // This should be the current user's ID in a real app
        })) || [],
        // Ensure dates are properly formatted
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate).toISOString() : null,
        estimatedCompletionDate: formData.estimatedCompletionDate ? new Date(formData.estimatedCompletionDate).toISOString() : null
      };
      
      console.log('Sending update data:', updateData);
      
      const result = await updateWorkOrder({ 
        id, 
        ...updateData
      }).unwrap();
      
      console.log('Update successful:', result);
      
      toast.success('Work order updated successfully', { autoClose: 3000 });
      navigate(`/work-orders/${id}`);
      
      return result;
    } catch (error) {
      console.error('Failed to update work order:', error);
      const errorMessage = error?.data?.message || error?.message || 'Failed to update work order';
      setSubmitError(errorMessage);
      toast.error(errorMessage, { autoClose: 5000 });
      
      // Format API errors for form fields
      if (error?.data?.errors) {
        const fieldErrors = {};
        Object.entries(error.data.errors).forEach(([field, messages]) => {
          fieldErrors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        throw { errors: fieldErrors };
      }
      
      throw error; // Re-throw to let WorkOrderForm handle the error state
    }
  };

  const handleDelete = async () => {
    try {
      await deleteWorkOrder(id).unwrap();
      toast.success('Work order deleted successfully', { autoClose: 3000 });
      navigate('/work-orders');
    } catch (error) {
      console.error('Failed to delete work order:', error);
      const errorMessage = error?.data?.message || 'Failed to delete work order';
      toast.error(errorMessage, { autoClose: 5000 });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleCancel = () => {
    navigate(`/work-orders/${id}`);
  };

  if (isLoading || !workOrderData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Box ml={2}>Loading work order data...</Box>
      </Box>
    );
  }

  if (error) {
    console.error('Error loading work order:', error);
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.data?.message || 'Error loading work order'}
        </Alert>
        <Button 
          variant="outlined" 
          onClick={() => window.location.reload()}
          startIcon={<RefreshIcon />}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  try {
    return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center">
              <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h4" component="h1">
                Edit Work Order
              </Typography>
            </Box>
            <Tooltip title="Delete Work Order">
              <IconButton 
                color="error" 
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isDeleting}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {submitError}
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            <WorkOrderForm
              initialValues={initialValues}
              onSubmit={handleSubmit}
              isSubmitting={isUpdating}
              onCancel={handleCancel}
              mode="edit"
            />
          </Box>
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !isDeleting && setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this work order? This action cannot be undone.
              <br />
              <strong>Title:</strong> {initialValues?.title || 'Untitled Work Order'}
              <br />
              <strong>ID:</strong> {id}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={() => setDeleteDialogOpen(false)} 
              disabled={isDeleting}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete} 
              color="error"
              variant="contained"
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
            >
              {isDeleting ? 'Deleting...' : 'Delete Work Order'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
  } catch (error) {
    console.error('Error rendering EditWorkOrder:', error);
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

export default EditWorkOrder;

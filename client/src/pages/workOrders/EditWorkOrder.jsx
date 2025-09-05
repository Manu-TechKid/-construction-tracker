import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Typography, 
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
import WorkOrderForm from '../../components/workOrders/WorkOrderFormNew';
import { toast } from 'react-toastify';

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
        ...workOrder,
        building: workOrder.building?._id || workOrder.building,
        assignedTo: workOrder.assignedTo?.map(assignment => ({
          worker: assignment.worker?._id || assignment.worker,
          status: assignment.status || 'pending',
          notes: assignment.notes || '',
          timeSpent: assignment.timeSpent || { hours: 0, minutes: 0 },
          materials: assignment.materials || []
        })) || [],
        services: workOrder.services?.map(service => ({
          ...service,
          status: service.status || 'pending',
          laborCost: service.laborCost || 0,
          materialCost: service.materialCost || 0,
          notes: service.notes || []
        })) || [],
        photos: workOrder.photos || [],
        scheduledDate: workOrder.scheduledDate ? new Date(workOrder.scheduledDate) : null,
        estimatedCompletionDate: workOrder.estimatedCompletionDate ? new Date(workOrder.estimatedCompletionDate) : null,
        startDate: workOrder.startDate ? new Date(workOrder.startDate) : null,
        endDate: workOrder.endDate ? new Date(workOrder.endDate) : null,
        createdAt: workOrder.createdAt ? new Date(workOrder.createdAt) : new Date(),
        updatedAt: workOrder.updatedAt ? new Date(workOrder.updatedAt) : new Date(),
      });
    }
  }, [workOrderData]);

  const handleSubmit = async (values) => {
    try {
      // Show loading state
      const loadingToast = toast.loading('Updating work order...');
      
      try {
        const result = await updateWorkOrder({ id, ...values }).unwrap();
        
        // Show success message
        toast.update(loadingToast, {
          render: result.message || 'Work order updated successfully!',
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
        const errorMessage = error?.data?.message || error?.message || 'Failed to update work order';
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

  if (isLoading || !initialValues) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Box ml={2}>Loading work order data...</Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.data?.message || 'Failed to load work order data. Please try again.'}
        </Alert>
        <Button 
          variant="outlined" 
          onClick={() => refetch()}
          startIcon={<RefreshIcon />}
        >
          Retry
        </Button>
      </Box>
    );
  }

  try {
    return (
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center">
            <IconButton 
              onClick={() => navigate(-1)} 
              sx={{ mr: 2 }}
              aria-label="Go back"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              Edit Work Order
            </Typography>
          </Box>
          
          <Tooltip title="Delete Work Order">
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </Tooltip>
        </Box>

        {submitError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {submitError}
          </Alert>
        )}

        <WorkOrderForm
          mode="edit"
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isSubmitting={isUpdating}
          onCancel={() => navigate('/work-orders')}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete Work Order</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this work order? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              color="error"
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={20} /> : null}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
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

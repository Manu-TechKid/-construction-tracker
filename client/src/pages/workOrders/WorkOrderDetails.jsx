import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Divider,
  Paper,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useGetWorkOrderQuery, useDeleteWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { format } from 'date-fns';

const getStatusChipColor = (status) => {
  switch (status) {
    case 'completed': return 'success';
    case 'in_progress': return 'info';
    case 'on_hold': return 'warning';
    case 'cancelled': return 'error';
    case 'pending':
    default: return 'default';
  }
};

const getPriorityChipColor = (priority) => {
  switch (priority) {
    case 'high':
    case 'urgent': return 'error';
    case 'medium': return 'warning';
    case 'low':
    default: return 'success';
  }
};

const WorkOrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: workOrderData, isLoading, error } = useGetWorkOrderQuery(id);
  const [deleteWorkOrder, { isLoading: isDeleting }] = useDeleteWorkOrderMutation();

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error || !workOrderData?.data) {
    return <Alert severity="error">Error loading work order details.</Alert>;
  }

  const workOrder = workOrderData.data;

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this work order?')) {
      await deleteWorkOrder(id);
      navigate('/work-orders');
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1">
            {workOrder.title}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Work Order Details
          </Typography>
        </Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/work-orders')}>
          Back to List
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Description</Typography>
              <Typography paragraph>{workOrder.description}</Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Location</Typography>
              <Typography><strong>Building:</strong> {workOrder.building?.name}</Typography>
              {workOrder.block && <Typography><strong>Block:</strong> {workOrder.block}</Typography>}
              {workOrder.apartmentNumber && <Typography><strong>Apartment:</strong> {workOrder.apartmentNumber}</Typography>}
            </CardContent>
          </Card>

          {workOrder.photos && workOrder.photos.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Photos</Typography>
                <Box display="flex" flexWrap="wrap" gap={2}>
                  {workOrder.photos.map((photo, index) => (
                    <img key={index} src={photo.url} alt={`work order photo ${index + 1}`} width="150" height="150" style={{ objectFit: 'cover', borderRadius: '4px' }} />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Details</Typography>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography><strong>Status:</strong></Typography>
              <Chip label={workOrder.status} color={getStatusChipColor(workOrder.status)} size="small" />
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography><strong>Priority:</strong></Typography>
              <Chip label={workOrder.priority} color={getPriorityChipColor(workOrder.priority)} size="small" />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography><strong>Work Type:</strong> {workOrder.workType}</Typography>
            <Typography><strong>Sub-Type:</strong> {workOrder.workSubType}</Typography>
            <Typography><strong>Scheduled:</strong> {format(new Date(workOrder.scheduledDate), 'MM/dd/yyyy')}</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography><strong>Estimated Cost:</strong> ${workOrder.estimatedCost?.toFixed(2)}</Typography>
            <Typography><strong>Actual Cost:</strong> ${workOrder.actualCost?.toFixed(2)}</Typography>
            <Divider sx={{ my: 2 }} />
            <Box mt={2}>
              <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/work-orders/${id}/edit`)} fullWidth>Edit</Button>
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete} disabled={isDeleting} fullWidth sx={{ mt: 1 }}>Delete</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default WorkOrderDetails;

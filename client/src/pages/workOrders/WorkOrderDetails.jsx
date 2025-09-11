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
} from '@mui/material';
import { useGetWorkOrderQuery, useDeleteWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { format } from 'date-fns';

const WorkOrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: workOrderData, isLoading, error } = useGetWorkOrderQuery(id);
  const [deleteWorkOrder, { isLoading: isDeleting }] = useDeleteWorkOrderMutation();

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error loading work order details.</Alert>;
  }

  const workOrder = workOrderData?.data;

  const handleDelete = async () => {
    await deleteWorkOrder(id);
    navigate('/work-orders');
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {workOrder.title}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6">Description</Typography>
              <Typography>{workOrder.description}</Typography>

              <Box mt={2}>
                <Typography variant="h6">Details</Typography>
                <Typography><strong>Building:</strong> {workOrder.building?.name}</Typography>
                <Typography><strong>Work Type:</strong> {workOrder.workType}</Typography>
                <Typography><strong>Sub-Type:</strong> {workOrder.workSubType}</Typography>
                <Typography><strong>Status:</strong> <Chip label={workOrder.status} size="small" /></Typography>
                <Typography><strong>Priority:</strong> <Chip label={workOrder.priority} size="small" /></Typography>
                <Typography><strong>Scheduled Date:</strong> {format(new Date(workOrder.scheduledDate), 'MM/dd/yyyy')}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Actions</Typography>
              <Button variant="contained" onClick={() => navigate(`/work-orders/${id}/edit`)} fullWidth>Edit</Button>
              <Button variant="contained" color="error" onClick={handleDelete} disabled={isDeleting} fullWidth sx={{ mt: 1 }}>Delete</Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default WorkOrderDetails;

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

const getPhotoUrl = (photo) => {
  try {
    if (!photo) return null;

    // Handle different possible photo path sources
    let photoPath = photo.filename || photo.path || photo.url || photo;
    if (!photoPath) return null;

    // If it's already a full URL, validate it
    if (typeof photoPath === 'string' && photoPath.startsWith('http')) {
      try {
        new URL(photoPath); // Validate URL format
        return photoPath;
      } catch {
        return null; // Invalid URL
      }
    }

    // Ensure photoPath is a string
    const pathString = String(photoPath || '').trim();
    if (!pathString) return null;

    // Clean up the path and remove any duplicate segments
    let cleanPath = pathString
      .replace(/^[\/\\]+/, '') // Remove leading slashes
      .replace(/\/+/g, '/') // Replace multiple slashes with single
      .replace(/^api\/v1\//i, '') // Remove any api/v1/ prefix
      .replace(/^uploads\//i, '') // Remove any uploads/ prefix
      .replace(/^\/?(uploads\/photos?\/)+/i, '') // Remove any uploads/photo(s)/ prefix
      .replace(/^photos?\//i, '') // Remove any remaining photo(s)/ prefix
      .replace(/^\//, ''); // Remove leading slash if still present

    if (!cleanPath) return null;

    // Construct the clean URL with exactly one /photos/ segment
    const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
    return `${apiUrl}/api/v1/uploads/photos/${cleanPath}`;
  } catch (error) {
    console.error('Error processing photo URL:', { photo, error });
    return null;
  }
};

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
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Alert severity="error">
          Error loading work order details: {error?.data?.message || error?.message || 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  if (!workOrderData?.data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Alert severity="warning">Work order not found or data is unavailable</Alert>
      </Box>
    );
  }

  const workOrder = workOrderData.data;

  // Validate work order data
  if (!workOrder || typeof workOrder !== 'object') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Alert severity="error">Invalid work order data</Alert>
      </Box>
    );
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this work order?')) {
      try {
        await deleteWorkOrder(id).unwrap();
        navigate('/work-orders');
      } catch (error) {
        console.error('Error deleting work order:', error);
        alert('Failed to delete work order. Please try again.');
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1">
            {workOrder.title || 'Untitled Work Order'}
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
              <Typography paragraph>{workOrder.description || 'No description available'}</Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Location</Typography>
              <Typography><strong>Building:</strong> {workOrder.building?.name || workOrder.building?.code || 'Unknown Building'}</Typography>
              {workOrder.block && <Typography><strong>Block:</strong> {workOrder.block}</Typography>}
              {workOrder.apartmentNumber && <Typography><strong>Apartment:</strong> {workOrder.apartmentNumber}</Typography>}
            </CardContent>
          </Card>

          {/* Photos Section - Only render if photos exist and are valid */}
          {workOrder.photos && Array.isArray(workOrder.photos) && workOrder.photos.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Photos</Typography>
                <Box display="flex" flexWrap="wrap" gap={2}>
                  {workOrder.photos
                    .filter(photo => photo) // Filter out null/undefined photos
                    .map((photo, index) => {
                      try {
                        const photoUrl = getPhotoUrl(photo);
                        return photoUrl ? (
                          <img
                            key={index}
                            src={photoUrl}
                            alt={`work order photo ${index + 1}`}
                            width="150"
                            height="150"
                            style={{ objectFit: 'cover', borderRadius: '4px' }}
                            onError={(e) => {
                              console.warn('Error loading image:', photoUrl, photo);
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : null;
                      } catch (error) {
                        console.warn('Error processing photo:', photo, error);
                        return null;
                      }
                    })
                    .filter(Boolean) // Remove null entries
                  }
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
              <Chip
                label={workOrder.status || 'unknown'}
                color={getStatusChipColor(workOrder.status)}
                size="small"
              />
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography><strong>Priority:</strong></Typography>
              <Chip
                label={workOrder.priority || 'normal'}
                color={getPriorityChipColor(workOrder.priority)}
                size="small"
              />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography><strong>Work Type:</strong> {workOrder.workType?.name || workOrder.workType || 'Not specified'}</Typography>
            <Typography><strong>Sub-Type:</strong> {workOrder.workSubType?.name || workOrder.workSubType || 'Not specified'}</Typography>
            <Typography><strong>Scheduled:</strong> {
              workOrder.scheduledDate
                ? format(new Date(workOrder.scheduledDate), 'MM/dd/yyyy')
                : 'Not scheduled'
            }</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography><strong>Estimated Cost:</strong> ${workOrder.estimatedCost?.toFixed(2) || '0.00'}</Typography>
            <Typography><strong>Actual Cost:</strong> ${workOrder.actualCost?.toFixed(2) || '0.00'}</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography><strong>Assigned To:</strong></Typography>
            <Box mt={1}>
              {workOrder.assignedTo && Array.isArray(workOrder.assignedTo) && workOrder.assignedTo.length > 0 ? (
                workOrder.assignedTo.map((assignment, index) => (
                  <Chip
                    key={index}
                    label={assignment?.worker?.name || assignment?.worker?.code || 'Unknown Worker'}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">No workers assigned</Typography>
              )}
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box mt={2}>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/work-orders/${id}/edit`)}
                fullWidth
                sx={{ mb: 1 }}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                disabled={isDeleting}
                fullWidth
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default WorkOrderDetails;

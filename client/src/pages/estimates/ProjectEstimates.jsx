import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Fab,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import { useGetProjectEstimatesQuery, useDeleteProjectEstimateMutation } from '../../features/estimates/projectEstimatesApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const ProjectEstimates = () => {
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: estimatesData, isLoading, error, refetch } = useGetProjectEstimatesQuery({
    building: filterBuilding,
    status: filterStatus
  });
  
  const { data: buildingsData } = useGetBuildingsQuery();
  const [deleteEstimate] = useDeleteProjectEstimateMutation();

  const estimates = estimatesData?.data?.projectEstimates || [];
  const buildings = buildingsData?.data?.buildings || [];

  const handleMenuOpen = (event, estimate) => {
    setAnchorEl(event.currentTarget);
    setSelectedEstimate(estimate);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEstimate(null);
  };

  const handleDelete = async () => {
    try {
      await deleteEstimate(selectedEstimate._id).unwrap();
      toast.success('Project estimate deleted successfully');
      setDeleteDialogOpen(false);
      handleMenuClose();
      refetch();
    } catch (error) {
      toast.error('Failed to delete project estimate');
      console.error('Delete error:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      submitted: 'info',
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
      client_accepted: 'success',
      client_rejected: 'error',
      converted_to_invoice: 'secondary'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Draft',
      submitted: 'Submitted',
      pending: 'Pending Review',
      approved: 'Approved',
      rejected: 'Rejected',
      client_accepted: 'Client Accepted',
      client_rejected: 'Client Rejected',
      converted_to_invoice: 'Converted to Invoice'
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading project estimates...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading project estimates: {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Project Estimates
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          href="/estimates/new"
          sx={{ ml: 2 }}
        >
          New Estimate
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Filter by Building</InputLabel>
                <Select
                  value={filterBuilding}
                  onChange={(e) => setFilterBuilding(e.target.value)}
                  label="Filter by Building"
                >
                  <MenuItem value="">All Buildings</MenuItem>
                  {buildings.map((building) => (
                    <MenuItem key={building._id} value={building._id}>
                      {building.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Filter by Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="submitted">Submitted</MenuItem>
                  <MenuItem value="pending">Pending Review</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="client_accepted">Client Accepted</MenuItem>
                  <MenuItem value="client_rejected">Client Rejected</MenuItem>
                  <MenuItem value="converted_to_invoice">Converted to Invoice</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Estimates Grid */}
      <Grid container spacing={3}>
        {estimates.length === 0 ? (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No project estimates found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Create your first project estimate to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  href="/estimates/new"
                >
                  Create Estimate
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          estimates.map((estimate) => (
            <Grid item xs={12} md={6} lg={4} key={estimate._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Header with actions */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h3" sx={{ flexGrow: 1, mr: 1 }}>
                      {estimate.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, estimate)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  {/* Building and apartment */}
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {estimate.building?.name}
                    {estimate.apartmentNumber && ` - Apt ${estimate.apartmentNumber}`}
                  </Typography>

                  {/* Description */}
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {estimate.description}
                  </Typography>

                  {/* Status */}
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={getStatusLabel(estimate.status)}
                      color={getStatusColor(estimate.status)}
                      size="small"
                    />
                  </Box>

                  {/* Financial info */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Estimated Cost: ${estimate.estimatedCost?.toLocaleString() || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Estimated Price: ${estimate.estimatedPrice?.toLocaleString() || '0'}
                    </Typography>
                  </Box>

                  {/* Dates */}
                  <Typography variant="caption" color="text.secondary">
                    Created: {format(new Date(estimate.createdAt), 'MMM dd, yyyy')}
                  </Typography>
                  {estimate.submittedAt && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Submitted: {format(new Date(estimate.submittedAt), 'MMM dd, yyyy')}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          window.open(`/estimates/${selectedEstimate?._id}`, '_blank');
          handleMenuClose();
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => {
          window.location.href = `/estimates/${selectedEstimate?._id}/edit`;
          handleMenuClose();
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          // TODO: Implement send to client
          toast.info('Send to client feature coming soon');
          handleMenuClose();
        }}>
          <SendIcon sx={{ mr: 1 }} />
          Send to Client
        </MenuItem>
        <MenuItem onClick={() => {
          // TODO: Implement PDF download
          toast.info('PDF download feature coming soon');
          handleMenuClose();
        }}>
          <DownloadIcon sx={{ mr: 1 }} />
          Download PDF
        </MenuItem>
        {selectedEstimate?.status === 'client_accepted' && (
          <MenuItem onClick={() => {
            // TODO: Implement convert to invoice
            toast.info('Convert to invoice feature coming soon');
            handleMenuClose();
          }}>
            <ReceiptIcon sx={{ mr: 1 }} />
            Convert to Invoice
          </MenuItem>
        )}
        <MenuItem 
          onClick={() => {
            setDeleteDialogOpen(true);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Project Estimate</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedEstimate?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Tooltip title="Create New Estimate">
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          href="/estimates/new"
        >
          <AddIcon />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default ProjectEstimates;

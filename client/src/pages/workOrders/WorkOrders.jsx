import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

import { 
  useGetWorkOrdersQuery, 
  useDeleteWorkOrderMutation 
} from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useAuth } from '../../hooks/useAuth';

const WorkOrders = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // API queries
  const { data: workOrdersData, isLoading, error } = useGetWorkOrdersQuery();
  const { data: buildingsData } = useGetBuildingsQuery();
  const [deleteWorkOrder, { isLoading: isDeleting }] = useDeleteWorkOrderMutation();

  const workOrders = workOrdersData?.data?.workOrders || [];
  const buildings = buildingsData?.data?.buildings || [];

  const handleMenuClick = (event, workOrder) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorkOrder(workOrder);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkOrder(null);
  };

  const handleDeleteWorkOrder = async () => {
    if (selectedWorkOrder) {
      try {
        await deleteWorkOrder(selectedWorkOrder._id).unwrap();
        toast.success('Work order deleted successfully');
        setDeleteDialogOpen(false);
        handleMenuClose();
      } catch (error) {
        console.error('Error deleting work order:', error);
        const errorMessage = error?.data?.message || error?.message || 'Failed to delete work order';
        toast.error(errorMessage);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'on_hold':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'pending':
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
      default:
        return 'default';
    }
  };

  const filteredWorkOrders = workOrders.filter(workOrder => {
    const statusMatch = !filterStatus || workOrder.status === filterStatus;
    const buildingMatch = !filterBuilding || workOrder.building?._id === filterBuilding;
    const priorityMatch = !filterPriority || workOrder.priority === filterPriority;
    return statusMatch && buildingMatch && priorityMatch;
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Alert severity="error">
          Error loading work orders: {error?.data?.message || 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Work Orders
        </Typography>
        {hasPermission('create:workorders') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/work-orders/new')}
          >
            Create Work Order
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="on_hold">On Hold</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Building</InputLabel>
                <Select
                  value={filterBuilding}
                  onChange={(e) => setFilterBuilding(e.target.value)}
                  label="Building"
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
          </Grid>
        </CardContent>
      </Card>

      {/* Work Orders Table */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Building</TableCell>
                <TableCell>Apartment</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Scheduled Date</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredWorkOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Box py={4}>
                      <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No work orders found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {filterStatus || filterBuilding || filterPriority ? 'Try adjusting your filters or ' : ''}
                        Create your first work order to get started
                      </Typography>
                      {hasPermission('create:workorders') && (
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => navigate('/work-orders/new')}
                          sx={{ mt: 2 }}
                        >
                          Create Your First Work Order
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkOrders.map((workOrder) => (
                  <TableRow key={workOrder._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {workOrder.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {workOrder.description?.substring(0, 50)}
                        {workOrder.description?.length > 50 ? '...' : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {workOrder.building?.name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {workOrder.apartmentNumber || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={workOrder.priority?.charAt(0).toUpperCase() + workOrder.priority?.slice(1) || 'Medium'}
                        color={getPriorityColor(workOrder.priority)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={workOrder.status?.charAt(0).toUpperCase() + workOrder.status?.slice(1) || 'Pending'}
                        color={getStatusColor(workOrder.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {workOrder.scheduledDate ? format(new Date(workOrder.scheduledDate), 'MMM dd, yyyy') : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {workOrder.assignedTo?.length > 0 
                          ? `${workOrder.assignedTo.length} worker(s)`
                          : 'Unassigned'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => handleMenuClick(e, workOrder)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          navigate(`/work-orders/${selectedWorkOrder?._id}/details`);
          handleMenuClose();
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        {hasPermission('update:workorders') && (
          <MenuItem onClick={() => {
            navigate(`/work-orders/${selectedWorkOrder?._id}/edit`);
            handleMenuClose();
          }}>
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {hasPermission('delete:workorders') && (
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
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Work Order</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete work order "{selectedWorkOrder?.title}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteWorkOrder} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkOrders;

import React, { useState, useEffect } from 'react';
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
  Avatar,
  AvatarGroup,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

import { useGetWorkOrdersQuery, useDeleteWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useAuth } from '../../hooks/useAuth';
import { useBuildingContext } from '../../contexts/BuildingContext';

const WorkOrders = () => {
  const navigate = useNavigate();
  const { user, hasPermission, isWorker } = useAuth();
  const { selectedBuilding } = useBuildingContext();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    building: selectedBuilding?._id || '',
    search: ''
  });

  // API calls
  const { data: workOrdersData, isLoading, error, refetch } = useGetWorkOrdersQuery(filters);
  const { data: buildingsData } = useGetBuildingsQuery();
  const [deleteWorkOrder, { isLoading: isDeleting }] = useDeleteWorkOrderMutation();

  const workOrders = workOrdersData?.data?.workOrders || [];
  const buildings = buildingsData?.data?.buildings || [];

  // Filter work orders for workers - show only assigned tasks
  const filteredWorkOrders = isWorker 
    ? workOrders.filter(wo => wo.assignedTo?.some(assignment => assignment.worker?._id === user?._id))
    : workOrders;

  // Update building filter when selectedBuilding changes
  useEffect(() => {
    if (selectedBuilding) {
      setFilters(prev => ({ ...prev, building: selectedBuilding._id }));
    }
  }, [selectedBuilding]);

  const handleMenuClick = (event, workOrder) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorkOrder(workOrder);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkOrder(null);
  };

  const handleDelete = async () => {
    if (selectedWorkOrder) {
      try {
        await deleteWorkOrder(selectedWorkOrder._id).unwrap();
        toast.success('Work order deleted successfully');
        setDeleteDialogOpen(false);
        handleMenuClose();
        refetch();
      } catch (error) {
        console.error('Error deleting work order:', error);
        toast.error(error?.data?.message || 'Failed to delete work order');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'on_hold': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const renderAssignedWorkers = (assignedTo) => {
    if (!assignedTo || assignedTo.length === 0) {
      return <Typography variant="body2" color="text.secondary">Unassigned</Typography>;
    }

    return (
      <AvatarGroup max={3} sx={{ justifyContent: 'flex-start' }}>
        {assignedTo.map((assignment, index) => (
          <Tooltip key={index} title={`${assignment.worker?.name} (${assignment.status})`}>
            <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
              {assignment.worker?.name?.charAt(0)?.toUpperCase()}
            </Avatar>
          </Tooltip>
        ))}
      </AvatarGroup>
    );
  };

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
        <Typography color="error">Error loading work orders: {error?.data?.message || 'Unknown error'}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          {isWorker ? 'My Work Orders' : 'Work Orders'}
        </Typography>
        {!isWorker && hasPermission(['create:workorders']) && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/work-orders/create')}
          >
            Create Work Order
          </Button>
        )}
      </Box>

      {/* Filters - simplified for workers */}
      {!isWorker && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  InputProps={{
                    startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    label="Status"
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="on_hold">On Hold</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={filters.priority}
                    onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
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
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Building</InputLabel>
                  <Select
                    value={filters.building}
                    onChange={(e) => setFilters(prev => ({ ...prev, building: e.target.value }))}
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
      )}

      {/* Work Orders Table */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Service Type</TableCell>
                <TableCell>Building</TableCell>
                <TableCell>Apartment</TableCell>
                <TableCell>Assigned Workers</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Description</TableCell>
                {!isWorker && <TableCell>Est. Cost</TableCell>}
                <TableCell>Scheduled</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredWorkOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isWorker ? 9 : 10} align="center">
                    <Box py={4}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        {isWorker ? 'No work orders assigned to you' : 'No work orders found'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isWorker 
                          ? 'Check back later for new assignments'
                          : 'Create your first work order to get started'
                        }
                      </Typography>
                      {!isWorker && hasPermission(['create:workorders']) && (
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => navigate('/work-orders/create')}
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
                        {workOrder.services?.[0]?.type?.toUpperCase() || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {workOrder.services?.[0]?.description || 'No description'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {workOrder.building?.name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {workOrder.apartmentNumber || 'N/A'}
                      {workOrder.block && ` (${workOrder.block})`}
                    </TableCell>
                    <TableCell>
                      {renderAssignedWorkers(workOrder.assignedTo)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={workOrder.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                        color={getStatusColor(workOrder.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={workOrder.priority?.toUpperCase() || 'MEDIUM'}
                        color={getPriorityColor(workOrder.priority)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {workOrder.description || 'No description'}
                      </Typography>
                    </TableCell>
                    {!isWorker && (
                      <TableCell>
                        <Typography variant="body2">
                          ${workOrder.estimatedCost?.toFixed(2) || '0.00'}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      {workOrder.scheduledDate ? format(new Date(workOrder.scheduledDate), 'MMM dd, yyyy') : 'Not scheduled'}
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
        <MenuItem onClick={() => navigate(`/work-orders/${selectedWorkOrder?._id}`)}>
          <ViewIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        {!isWorker && hasPermission(['update:workorders']) && (
          <MenuItem onClick={() => navigate(`/work-orders/${selectedWorkOrder?._id}/edit`)}>
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {!isWorker && hasPermission(['delete:workorders']) && (
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
            Are you sure you want to delete this work order? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkOrders;

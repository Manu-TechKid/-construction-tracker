import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Business as BuildingIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CompletedIcon,
  PlayArrow as InProgressIcon,
  Pending as PendingIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useAuth } from '../../hooks/useAuth';

const WorkProgress = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const { data: workOrdersData, isLoading: workOrdersLoading, refetch } = useGetWorkOrdersQuery({
    building: selectedBuilding || undefined,
    assignedTo: selectedWorker || undefined,
    status: selectedStatus || undefined
  });

  const { data: workersData } = useGetWorkersQuery();
  const { data: buildingsData } = useGetBuildingsQuery();

  const workOrders = workOrdersData?.data?.workOrders || [];
  const workers = workersData?.data?.workers?.filter(w => w.role === 'worker') || [];
  const buildings = buildingsData?.data?.buildings || [];

  // Calculate progress statistics
  const progressStats = {
    total: workOrders.length,
    pending: workOrders.filter(wo => wo.status === 'pending').length,
    inProgress: workOrders.filter(wo => wo.status === 'in_progress').length,
    completed: workOrders.filter(wo => wo.status === 'completed').length,
    onHold: workOrders.filter(wo => wo.status === 'on_hold').length
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      in_progress: 'info',
      on_hold: 'default',
      completed: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <PendingIcon />,
      in_progress: <InProgressIcon />,
      completed: <CompletedIcon />,
      on_hold: <PendingIcon />
    };
    return icons[status] || <PendingIcon />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const getWorkerName = (assignedTo) => {
    if (!assignedTo || assignedTo.length === 0) return 'Unassigned';
    return assignedTo.map(assignment => assignment.worker?.name || 'Unknown').join(', ');
  };

  const clearFilters = () => {
    setSelectedBuilding('');
    setSelectedWorker('');
    setSelectedStatus('');
  };

  if (!hasPermission(['read:work_orders'])) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          You don't have permission to view work progress.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Work Progress Tracking
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refetch}
        >
          Refresh
        </Button>
      </Box>

      {/* Progress Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" component="div">
                {progressStats.total}
              </Typography>
              <Typography color="text.secondary">
                Total Work Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PendingIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" component="div">
                {progressStats.pending}
              </Typography>
              <Typography color="text.secondary">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <InProgressIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" component="div">
                {progressStats.inProgress}
              </Typography>
              <Typography color="text.secondary">
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CompletedIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" component="div">
                {progressStats.completed}
              </Typography>
              <Typography color="text.secondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PendingIcon sx={{ fontSize: 40, color: 'grey.500', mb: 1 }} />
              <Typography variant="h4" component="div">
                {progressStats.onHold}
              </Typography>
              <Typography color="text.secondary">
                On Hold
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progress Bar */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Overall Progress
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress
                variant="determinate"
                value={progressStats.total > 0 ? (progressStats.completed / progressStats.total) * 100 : 0}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">
                {progressStats.total > 0 ? Math.round((progressStats.completed / progressStats.total) * 100) : 0}%
              </Typography>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {progressStats.completed} of {progressStats.total} work orders completed
          </Typography>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filter Work Orders
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Building</InputLabel>
                <Select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Worker</InputLabel>
                <Select
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                  label="Worker"
                >
                  <MenuItem value="">All Workers</MenuItem>
                  {workers.map((worker) => (
                    <MenuItem key={worker._id} value={worker._id}>
                      {worker.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
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
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                onClick={clearFilters}
                sx={{ height: '56px', width: '100%' }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Work Orders Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Work Orders ({workOrders.length})
          </Typography>
          {workOrdersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Work Type</TableCell>
                    <TableCell>Building</TableCell>
                    <TableCell>Assigned Worker(s)</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Scheduled Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workOrders.map((workOrder) => (
                    <TableRow key={workOrder._id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {workOrder.workType?.toUpperCase()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {workOrder.workSubType}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <BuildingIcon sx={{ mr: 1, fontSize: 20 }} />
                          <Box>
                            <Typography variant="body2">
                              {workOrder.building?.name || 'Unknown'}
                            </Typography>
                            {workOrder.apartmentNumber && (
                              <Typography variant="caption" color="text.secondary">
                                Apt {workOrder.apartmentNumber}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                          <Typography variant="body2">
                            {getWorkerName(workOrder.assignedTo)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(workOrder.status)}
                          label={workOrder.status?.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(workOrder.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={workOrder.priority?.toUpperCase() || 'MEDIUM'}
                          color={workOrder.priority === 'high' || workOrder.priority === 'urgent' ? 'error' : 
                                 workOrder.priority === 'medium' ? 'warning' : 'success'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <ScheduleIcon sx={{ mr: 1, fontSize: 20 }} />
                          <Typography variant="body2">
                            {formatDate(workOrder.scheduledDate)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/work-orders/${workOrder._id}`)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default WorkProgress;

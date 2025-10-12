import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';

const WorkProgress = () => {
  const { data: workOrdersData, isLoading, error } = useGetWorkOrdersQuery();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load work progress data. Please try again later.
      </Alert>
    );
  }

  const workOrders = workOrdersData?.data?.workOrders || [];
  
  // Calculate statistics
  const totalOrders = workOrders.length;
  const completedOrders = workOrders.filter(wo => wo.status === 'completed').length;
  const inProgressOrders = workOrders.filter(wo => wo.status === 'in_progress').length;
  const pendingOrders = workOrders.filter(wo => wo.status === 'pending').length;
  const onHoldOrders = workOrders.filter(wo => wo.status === 'on_hold').length;
  
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  // New: Calculate hours data
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Assuming Monday start
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Aggregate hours by worker for the current week
  const hoursByWorker = {};
  workOrders.forEach(order => {
    if (order.assignedTo && order.assignedTo.length > 0) {
      order.assignedTo.forEach(assignment => {
        const workerId = assignment.worker?._id;
        const workerName = assignment.worker?.name || 'Unknown Worker';
        const workerRate = assignment.worker?.workerProfile?.hourlyRate || 0;
        const orderDate = new Date(order.scheduledDate || order.createdAt);
        
        if (isWithinInterval(orderDate, { start: weekStart, end: weekEnd })) {
          const hours = order.actualHours || 0; // Assuming 'actualHours' field exists in work orders
          if (!hoursByWorker[workerId]) {
            hoursByWorker[workerId] = {
              name: workerName,
              totalHours: 0,
              totalValue: 0,
              rate: workerRate,
            };
          }
          hoursByWorker[workerId].totalHours += hours;
          hoursByWorker[workerId].totalValue += hours * workerRate;
        }
      });
    }
  });

  const hoursArray = Object.values(hoursByWorker);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'pending': return 'warning';
      case 'on_hold': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon />;
      case 'in_progress': return <ScheduleIcon />;
      case 'pending': return <AssignmentIcon />;
      case 'on_hold': return <WarningIcon />;
      default: return <AssignmentIcon />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Work Progress Overview
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                Total Orders
              </Typography>
              <Typography variant="h3">{totalOrders}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                Completed
              </Typography>
              <Typography variant="h3">{completedOrders}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                In Progress
              </Typography>
              <Typography variant="h3">{inProgressOrders}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                Pending
              </Typography>
              <Typography variant="h3">{pendingOrders}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progress Bar */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Overall Completion Rate
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={completionRate} 
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">
                {Math.round(completionRate)}%
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* New: Hours Control Section */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Hours Control - Week of {format(weekStart, 'MMM dd')} to {format(weekEnd, 'MMM dd, yyyy')}
          </Typography>
          {hoursArray.length > 0 ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Total Weekly Hours: {hoursArray.reduce((sum, w) => sum + w.totalHours, 0)} | 
                Total Value: ${hoursArray.reduce((sum, w) => sum + w.totalValue, 0).toFixed(2)}
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Worker</TableCell>
                    <TableCell align="right">Hours</TableCell>
                    <TableCell align="right">Rate ($/hr)</TableCell>
                    <TableCell align="right">Total Value ($)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hoursArray.map((worker) => (
                    <TableRow key={worker.name}>
                      <TableCell>{worker.name}</TableCell>
                      <TableCell align="right">{worker.totalHours}</TableCell>
                      <TableCell align="right">${worker.rate}</TableCell>
                      <TableCell align="right">${worker.totalValue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No hours recorded for this week. Enter hours in work orders to see data here.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Recent Work Orders */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Work Orders
            </Typography>
            <List>
              {workOrders.slice(0, 5).map((workOrder) => (
                <ListItem key={workOrder._id}>
                  <ListItemIcon>
                    {getStatusIcon(workOrder.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={workOrder.title}
                    secondary={`Building: ${workOrder.building?.name || 'N/A'}`}
                  />
                  <Chip 
                    label={workOrder.status} 
                    color={getStatusColor(workOrder.status)}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Status Breakdown
            </Typography>
            <List>
              <ListItem>
                <ListItemText primary="Completed" />
                <Chip label={completedOrders} color="success" />
              </ListItem>
              <ListItem>
                <ListItemText primary="In Progress" />
                <Chip label={inProgressOrders} color="info" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Pending" />
                <Chip label={pendingOrders} color="warning" />
              </ListItem>
              <ListItem>
                <ListItemText primary="On Hold" />
                <Chip label={onHoldOrders} color="error" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default WorkProgress;

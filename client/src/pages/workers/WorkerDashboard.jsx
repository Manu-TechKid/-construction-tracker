import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  Grid,
  Paper,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Badge,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Notes as NotesIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { toast } from 'react-toastify';

import { useGetWorkerAssignmentsQuery } from '../../features/workers/workersApiSlice';
import { useUpdateWorkOrderStatusMutation } from '../../features/workOrders/workOrdersApiSlice';
import { useAuth } from '../../hooks/useAuth';

const WorkerDashboard = () => {
  const { user } = useAuth();
  const [statusUpdateDialog, setStatusUpdateDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    notes: ''
  });

  // Get worker assignments
  const {
    data: assignmentsData,
    isLoading,
    isError,
    error,
    refetch
  } = useGetWorkerAssignmentsQuery(user?.id, {
    pollingInterval: 30000, // Poll every 30 seconds for real-time updates
  });

  const [updateWorkOrderStatus, { isLoading: updatingStatus }] = useUpdateWorkOrderStatusMutation();

  // Extract assignments from API response
  const assignments = assignmentsData || [];
  
  // Group assignments by status
  const groupedAssignments = {
    pending: assignments.filter(a => a.assignedTo?.find(at => at.worker._id === user?.id)?.status === 'pending'),
    in_progress: assignments.filter(a => a.assignedTo?.find(at => at.worker._id === user?.id)?.status === 'in_progress'),
    completed: assignments.filter(a => a.assignedTo?.find(at => at.worker._id === user?.id)?.status === 'completed'),
  };

  const totalPending = groupedAssignments.pending.length;
  const totalInProgress = groupedAssignments.in_progress.length;
  const totalCompleted = groupedAssignments.completed.length;

  // Handle status updates
  const handleStatusUpdate = async () => {
    if (!selectedAssignment || !statusUpdate.status) {
      toast.error('Please select a status');
      return;
    }

    try {
      await updateWorkOrderStatus({
        id: selectedAssignment._id,
        status: statusUpdate.status,
        notes: statusUpdate.notes,
        workerId: user?.id
      }).unwrap();

      toast.success('Status updated successfully');
      setStatusUpdateDialog(false);
      setSelectedAssignment(null);
      setStatusUpdate({ status: '', notes: '' });
      refetch();
    } catch (error) {
      console.error('Status update failed:', error);
      toast.error(error?.data?.message || 'Failed to update status');
    }
  };

  const openStatusDialog = (assignment) => {
    setSelectedAssignment(assignment);
    const currentStatus = assignment.assignedTo?.find(at => at.worker._id === user?.id)?.status || 'pending';
    setStatusUpdate({ status: currentStatus, notes: '' });
    setStatusUpdateDialog(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'on_hold': return 'default';
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

  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd, yyyy');
  };

  const renderAssignmentCard = (assignment) => {
    const workerAssignment = assignment.assignedTo?.find(at => at.worker._id === user?.id);
    const status = workerAssignment?.status || 'pending';
    const assignedDate = workerAssignment?.assignedAt;
    const otherWorkers = assignment.assignedTo?.filter(at => at.worker._id !== user?.id) || [];

    return (
      <Card 
        key={assignment._id}
        sx={{ 
          mb: 2,
          border: status === 'in_progress' ? 2 : 1,
          borderColor: status === 'in_progress' ? 'primary.main' : 'divider',
          '&:hover': {
            boxShadow: 3
          }
        }}
      >
        <CardContent sx={{ pb: 1 }}>
          {/* Header with work type and priority */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h6" component="h3" gutterBottom>
                {assignment.workType?.toUpperCase()} - {assignment.workSubType}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Chip
                  label={status.replace('_', ' ').toUpperCase()}
                  color={getStatusColor(status)}
                  size="small"
                  variant="filled"
                />
                <Chip
                  label={assignment.priority?.toUpperCase() || 'MEDIUM'}
                  color={getPriorityColor(assignment.priority)}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>
            <IconButton
              onClick={() => openStatusDialog(assignment)}
              color="primary"
              size="small"
            >
              <NotesIcon />
            </IconButton>
          </Box>

          {/* Building and apartment info */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <LocationIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary">
              {assignment.building?.name || 'Unknown Building'}
              {assignment.apartmentNumber && ` - Apt ${assignment.apartmentNumber}`}
              {assignment.block && ` (Block ${assignment.block})`}
            </Typography>
          </Box>

          {/* Scheduled date */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <ScheduleIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary">
              Assigned: {formatDate(assignedDate)}
            </Typography>
          </Box>

          {/* Description */}
          {assignment.description && (
            <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
              "{assignment.description}"
            </Typography>
          )}

          {/* Other assigned workers */}
          {otherWorkers.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Working with:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {otherWorkers.map(aw => (
                  <Chip
                    key={aw.worker._id}
                    avatar={<Avatar sx={{ width: 24, height: 24 }}><PersonIcon /></Avatar>}
                    label={aw.worker.name}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Estimated cost */}
          {assignment.estimatedCost && (
            <Typography variant="body2" color="text.secondary">
              Estimated Cost: ${assignment.estimatedCost.toFixed(2)}
            </Typography>
          )}
        </CardContent>

        <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: '100%' }}>
            {status === 'pending' && (
              <Button
                size="small"
                variant="contained"
                startIcon={<StartIcon />}
                onClick={() => {
                  setSelectedAssignment(assignment);
                  setStatusUpdate({ status: 'in_progress', notes: 'Started working on this task' });
                  handleStatusUpdate();
                }}
                sx={{ flex: 1, minWidth: 120 }}
              >
                Start Work
              </Button>
            )}
            
            {status === 'in_progress' && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PauseIcon />}
                  onClick={() => {
                    setSelectedAssignment(assignment);
                    setStatusUpdate({ status: 'on_hold', notes: 'Work paused' });
                    handleStatusUpdate();
                  }}
                  sx={{ flex: 1, minWidth: 100 }}
                >
                  Pause
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => {
                    setSelectedAssignment(assignment);
                    setStatusUpdate({ status: 'completed', notes: 'Work completed successfully' });
                    handleStatusUpdate();
                  }}
                  sx={{ flex: 1, minWidth: 120 }}
                >
                  Complete
                </Button>
              </>
            )}
            
            <Button
              size="small"
              variant="text"
              startIcon={<NotesIcon />}
              onClick={() => openStatusDialog(assignment)}
              sx={{ minWidth: 100 }}
            >
              Update
            </Button>
          </Box>
        </CardActions>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Error loading assignments: {error?.data?.message || error?.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            My Assignments
          </Typography>
          <IconButton onClick={refetch} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
        
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Welcome back, {user?.name}! Here are your current work assignments.
        </Typography>

        {/* Summary cards */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Badge badgeContent={totalPending} color="warning" max={99}>
                <AssignmentIcon color="action" />
              </Badge>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Pending
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Badge badgeContent={totalInProgress} color="primary" max={99}>
                <WorkIcon color="action" />
              </Badge>
              <Typography variant="body2" sx={{ mt: 1 }}>
                In Progress
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Badge badgeContent={totalCompleted} color="success" max={99}>
                <CheckCircleIcon color="action" />
              </Badge>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Completed
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Assignments sections */}
      {totalPending > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon />
            Pending Tasks ({totalPending})
          </Typography>
          {groupedAssignments.pending.map(renderAssignmentCard)}
        </Box>
      )}

      {totalInProgress > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WorkIcon />
            In Progress ({totalInProgress})
          </Typography>
          {groupedAssignments.in_progress.map(renderAssignmentCard)}
        </Box>
      )}

      {totalCompleted > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon />
            Recently Completed ({totalCompleted})
          </Typography>
          {groupedAssignments.completed.slice(0, 5).map(renderAssignmentCard)}
        </Box>
      )}

      {assignments.length === 0 && (
        <Alert severity="info" sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            No assignments yet
          </Typography>
          <Typography>
            You don't have any work assignments at the moment. Check back later or contact your supervisor.
          </Typography>
        </Alert>
      )}

      {/* Status Update Dialog */}
      <Dialog
        open={statusUpdateDialog}
        onClose={() => setStatusUpdateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Assignment Status</DialogTitle>
        <DialogContent>
          {selectedAssignment && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {selectedAssignment.workType?.toUpperCase()} - {selectedAssignment.workSubType}
                {selectedAssignment.building?.name && ` at ${selectedAssignment.building.name}`}
              </Typography>
            </Box>
          )}
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusUpdate.status}
              label="Status"
              onChange={(e) => setStatusUpdate(prev => ({ ...prev, status: e.target.value }))}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="on_hold">On Hold</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={3}
            value={statusUpdate.notes}
            onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add notes about the status update..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusUpdateDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleStatusUpdate}
            disabled={updatingStatus || !statusUpdate.status}
          >
            {updatingStatus ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating refresh button for mobile */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
        onClick={refetch}
      >
        <RefreshIcon />
      </Fab>
    </Container>
  );
};

export default WorkerDashboard;

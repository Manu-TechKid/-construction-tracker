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
  Work as WorkIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  Notes as NotesIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { toast } from 'react-toastify';

import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';
import { useUpdateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { useAuth } from '../../hooks/useAuth';

const WorkerDashboard = () => {
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [noteDialog, setNoteDialog] = useState({ open: false, workOrderId: null, note: '' });
  
  // Fetch work orders assigned to this worker
  const { data: workOrdersData, isLoading, error, refetch } = useGetWorkOrdersQuery({
    assignedTo: user?.id,
    status: selectedStatus !== 'all' ? selectedStatus : undefined
  });
  
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  
  // Extract work orders from API response
  const workOrders = workOrdersData?.data?.workOrders || workOrdersData?.data || [];
  
  const handleStatusUpdate = async (workOrderId, newStatus) => {
    try {
      await updateWorkOrder({
        id: workOrderId,
        status: newStatus,
        updatedBy: user.id,
        ...(newStatus === 'completed' && { 
          completedBy: user.id, 
          actualCompletionDate: new Date().toISOString() 
        })
      }).unwrap();
      
      toast.success(`Work order ${newStatus === 'completed' ? 'completed' : 'updated'} successfully`);
      refetch();
    } catch (error) {
      console.error('Failed to update work order:', error);
      toast.error(error?.data?.message || 'Failed to update work order');
    }
  };
  
  const handleAddNote = async () => {
    if (!noteDialog.note.trim()) {
      toast.error('Please enter a note');
      return;
    }
    
    try {
      const workOrder = workOrders.find(wo => wo._id === noteDialog.workOrderId);
      const updatedNotes = [
        ...(workOrder?.notes || []),
        {
          content: noteDialog.note,
          createdBy: user.id,
          isPrivate: false,
          createdAt: new Date().toISOString()
        }
      ];
      
      await updateWorkOrder({
        id: noteDialog.workOrderId,
        notes: updatedNotes
      }).unwrap();
      
      toast.success('Note added successfully');
      setNoteDialog({ open: false, workOrderId: null, note: '' });
      refetch();
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error('Failed to add note');
    }
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
  
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'success',
      medium: 'warning',
      high: 'error',
      urgent: 'error'
    };
    return colors[priority] || 'default';
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd, yyyy');
  };

  const renderAssignmentCard = (assignment) => {
    return (
      <Card 
        key={assignment._id}
        sx={{ 
          mb: 2,
          border: assignment.status === 'in_progress' ? 2 : 1,
          borderColor: assignment.status === 'in_progress' ? 'primary.main' : 'divider',
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
                  label={assignment.status.replace('_', ' ').toUpperCase()}
                  color={getStatusColor(assignment.status)}
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
              onClick={() => setNoteDialog({ open: true, workOrderId: assignment._id, note: '' })}
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
              Scheduled: {formatDate(assignment.scheduledDate)}
            </Typography>
          </Box>

          {/* Description */}
          {assignment.description && (
            <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
              "{assignment.description}"
            </Typography>
          )}
        </CardContent>

        <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: '100%' }}>
            {assignment.status === 'pending' && (
              <Button
                size="small"
                variant="contained"
                startIcon={<StartIcon />}
                onClick={() => handleStatusUpdate(assignment._id, 'in_progress')}
                sx={{ flex: 1, minWidth: 120 }}
              >
                Start Work
              </Button>
            )}
            
            {assignment.status === 'in_progress' && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PauseIcon />}
                  onClick={() => handleStatusUpdate(assignment._id, 'on_hold')}
                  sx={{ flex: 1, minWidth: 100 }}
                >
                  Pause
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleStatusUpdate(assignment._id, 'completed')}
                  sx={{ flex: 1, minWidth: 120 }}
                >
                  Complete
                </Button>
              </>
            )}
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

  if (error) {
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
              <Badge badgeContent={workOrders.filter(wo => wo.status === 'pending').length} color="warning" max={99}>
                <AssignmentIcon color="action" />
              </Badge>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Pending
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Badge badgeContent={workOrders.filter(wo => wo.status === 'in_progress').length} color="primary" max={99}>
                <WorkIcon color="action" />
              </Badge>
              <Typography variant="body2" sx={{ mt: 1 }}>
                In Progress
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Badge badgeContent={workOrders.filter(wo => wo.status === 'completed').length} color="success" max={99}>
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
      {workOrders.filter(wo => wo.status === 'pending').length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon />
            Pending Tasks ({workOrders.filter(wo => wo.status === 'pending').length})
          </Typography>
          {workOrders.filter(wo => wo.status === 'pending').map(renderAssignmentCard)}
        </Box>
      )}

      {workOrders.filter(wo => wo.status === 'in_progress').length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WorkIcon />
            In Progress ({workOrders.filter(wo => wo.status === 'in_progress').length})
          </Typography>
          {workOrders.filter(wo => wo.status === 'in_progress').map(renderAssignmentCard)}
        </Box>
      )}

      {workOrders.filter(wo => wo.status === 'completed').length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon />
            Recently Completed ({workOrders.filter(wo => wo.status === 'completed').length})
          </Typography>
          {workOrders.filter(wo => wo.status === 'completed').slice(0, 5).map(renderAssignmentCard)}
        </Box>
      )}

      {workOrders.length === 0 && (
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
        open={noteDialog.open}
        onClose={() => setNoteDialog({ open: false, workOrderId: null, note: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Note</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Note"
            multiline
            rows={3}
            value={noteDialog.note}
            onChange={(e) => setNoteDialog(prev => ({ ...prev, note: e.target.value }))}
            placeholder="Add a note..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog({ open: false, workOrderId: null, note: '' })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddNote}
            disabled={isUpdating || !noteDialog.note.trim()}
          >
            {isUpdating ? 'Adding...' : 'Add Note'}
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

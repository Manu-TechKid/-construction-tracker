import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  useMediaQuery,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as CompleteIcon,
  Assignment as TaskIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useGetWorkerAssignmentsQuery, useUpdateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils';

const WorkerDashboard = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [completeDialog, setCompleteDialog] = useState({ open: false, workOrder: null });
  const [completionNotes, setCompletionNotes] = useState('');
  
  // Debug logging
  console.log('=== Worker Dashboard Debug ===');
  console.log('Current user:', user);
  console.log('User ID:', user?.id);
  console.log('User role:', user?.role);
  
  // Fetch worker's assigned work orders
  const { data: assignmentsData, isLoading, refetch, error } = useGetWorkerAssignmentsQuery(user?.id, {
    skip: !user?.id,
  });
  
  console.log('Assignments data:', assignmentsData);
  console.log('API Error:', error);
  
  // Test debug endpoint
  React.useEffect(() => {
    if (user?.id) {
      fetch('/api/v1/users/debug/assignments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        }
      })
      .then(res => res.json())
      .then(data => {
        console.log('=== DEBUG ENDPOINT RESPONSE ===');
        console.log('Current user from backend:', data.data?.currentUser);
        console.log('All workers:', data.data?.allWorkers);
        console.log('All work orders:', data.data?.allWorkOrders);
        console.log('Work orders assigned to current user:', 
          data.data?.allWorkOrders?.filter(wo => 
            wo.assignedTo.some(a => a.workerId === user.id)
          )
        );
      })
      .catch(err => console.log('Debug endpoint error:', err));
    }
  }, [user]);
  
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  
  // Extract data with fallbacks
  const workOrders = assignmentsData?.data?.workOrders || [];
  const stats = assignmentsData?.data?.stats || {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    completedToday: 0
  };
  
  const pendingOrders = workOrders.filter(wo => wo.status === 'pending' || wo.status === 'in_progress');
  const completedToday = workOrders.filter(wo => 
    wo.status === 'completed' && 
    new Date(wo.updatedAt).toDateString() === new Date().toDateString()
  );
  
  

  const handleCompleteTask = (workOrder) => {
    setCompleteDialog({ open: true, workOrder });
    setCompletionNotes('');
  };

  const handleConfirmComplete = async () => {
    try {
      await updateWorkOrder({
        id: completeDialog.workOrder._id,
        status: 'completed',
        completionNotes,
        completedAt: new Date().toISOString(),
        completedBy: user.id
      }).unwrap();
      
      toast.success('Task marked as completed!');
      setCompleteDialog({ open: false, workOrder: null });
      setCompletionNotes('');
      refetch();
    } catch (error) {
      toast.error('Failed to complete task');
      console.error('Error completing task:', error);
    }
  };


  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load assignments. Please try again.
        </Alert>
        <Button variant="contained" onClick={refetch} startIcon={<RefreshIcon />}>
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4, px: isMobile ? 1 : 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom>
          My Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.name}!
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <TaskIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="primary">
              {pendingOrders.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending Tasks
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <CompleteIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="success.main">
              {completedToday.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completed Today
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <ScheduleIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="warning.main">
              {workOrders.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Assignments
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Tasks */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        My Tasks ({pendingOrders.length})
      </Typography>
      
      {pendingOrders.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No pending tasks assigned. Great job!
        </Alert>
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
          {pendingOrders.map((workOrder) => (
            <Grid item xs={12} sm={6} md={4} key={workOrder._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom noWrap>
                    {workOrder.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {workOrder.description}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" display="block">
                      <strong>Building:</strong> {workOrder.building?.name}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Apartment:</strong> {workOrder.apartmentNumber || 'N/A'}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Block:</strong> {workOrder.block || 'N/A'}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Due:</strong> {formatDate(workOrder.scheduledDate)}
                    </Typography>
                  </Box>
                  
                  <Chip 
                    label={workOrder.priority} 
                    color={workOrder.priority === 'high' ? 'error' : workOrder.priority === 'medium' ? 'warning' : 'default'}
                    size="small"
                  />
                </CardContent>
                <CardActions>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    startIcon={<CompleteIcon />}
                    onClick={() => handleCompleteTask(workOrder)}
                    size={isMobile ? "large" : "medium"}
                  >
                    Mark Complete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Completion Dialog */}
      <Dialog 
        open={completeDialog.open} 
        onClose={() => setCompleteDialog({ open: false, workOrder: null })}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          Complete Task: {completeDialog.workOrder?.title}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Completion Notes (Optional)"
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            placeholder="Add any notes about the completed work..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setCompleteDialog({ open: false, workOrder: null })}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmComplete}
            variant="contained"
            color="success"
            disabled={isUpdating}
            startIcon={isUpdating ? <CircularProgress size={20} /> : <CompleteIcon />}
          >
            {isUpdating ? 'Completing...' : 'Complete Task'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WorkerDashboard;

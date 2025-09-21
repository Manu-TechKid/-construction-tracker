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
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Avatar,
  AvatarGroup,
  Divider,
  LinearProgress,
  Paper,
  IconButton,
  Badge,
  Tooltip
} from '@mui/material';
import {
  CheckCircle as CompleteIcon,
  Assignment as TaskIcon,
  Schedule as ScheduleIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  LocationOn as LocationIcon,
  Group as TeamIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Work as WorkIcon,
  Home as BuildingIcon
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
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Fetch worker's assigned work orders with polling for real-time updates
  const { data: assignmentsData, isLoading, refetch, error } = useGetWorkerAssignmentsQuery(user?.id, {
    skip: !user?.id,
    pollingInterval: 30000, // Poll every 30 seconds for updates
  });
  
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
  
  // Filter work orders based on selected status
  const filteredOrders = selectedStatus === 'all' 
    ? workOrders 
    : workOrders.filter(wo => {
        if (selectedStatus === 'active') return wo.status === 'pending' || wo.status === 'in_progress';
        return wo.status === selectedStatus;
      });
  
  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) {
        refetch();
      }
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [user?.id, refetch]);

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

  const handleStartTask = async (workOrder) => {
    try {
      await updateWorkOrder({
        id: workOrder._id,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        startedBy: user.id
      }).unwrap();
      
      toast.success('Task started!');
      refetch();
    } catch (error) {
      toast.error('Failed to start task');
      console.error('Error starting task:', error);
    }
  };

  const handlePauseTask = async (workOrder) => {
    try {
      await updateWorkOrder({
        id: workOrder._id,
        status: 'on_hold',
        pausedAt: new Date().toISOString(),
        pausedBy: user.id
      }).unwrap();
      
      toast.success('Task paused!');
      refetch();
    } catch (error) {
      toast.error('Failed to pause task');
      console.error('Error pausing task:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'on_hold': return 'error';
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
      {/* Header */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
          <Box>
            <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
              My Dashboard
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Welcome back, {user?.name}! You have {stats.pending + stats.inProgress} active tasks.
            </Typography>
          </Box>
          <IconButton 
            onClick={refetch} 
            sx={{ color: 'white' }}
            disabled={isLoading}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Paper>

      {/* Enhanced Summary Cards */}
      <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 2, cursor: 'pointer' }} onClick={() => setSelectedStatus('pending')}>
            <TaskIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="warning.main">
              {stats.pending}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending Tasks
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 2, cursor: 'pointer' }} onClick={() => setSelectedStatus('in_progress')}>
            <WorkIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="info.main">
              {stats.inProgress}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In Progress
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 2, cursor: 'pointer' }} onClick={() => setSelectedStatus('completed')}>
            <CompleteIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="success.main">
              {stats.completedToday}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completed Today
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 2, cursor: 'pointer' }} onClick={() => setSelectedStatus('all')}>
            <ScheduleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="primary.main">
              {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Assignments
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Chips */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {['all', 'active', 'pending', 'in_progress', 'completed'].map((status) => (
          <Chip
            key={status}
            label={status === 'all' ? 'All Tasks' : status === 'active' ? 'Active Tasks' : status.replace('_', ' ').toUpperCase()}
            onClick={() => setSelectedStatus(status)}
            color={selectedStatus === status ? 'primary' : 'default'}
            variant={selectedStatus === status ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {/* Task List */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TaskIcon />
        My Tasks ({filteredOrders.length})
        {selectedStatus !== 'all' && (
          <Chip 
            label={selectedStatus === 'active' ? 'Active' : selectedStatus.replace('_', ' ')} 
            size="small" 
            color="primary" 
          />
        )}
      </Typography>
      
      {filteredOrders.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {selectedStatus === 'all' 
            ? "No tasks assigned yet. Check back later!" 
            : `No ${selectedStatus === 'active' ? 'active' : selectedStatus.replace('_', ' ')} tasks found.`
          }
        </Alert>
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
          {filteredOrders.map((workOrder) => (
            <Grid item xs={12} sm={6} md={6} lg={4} key={workOrder._id}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                border: workOrder.status === 'in_progress' ? '2px solid #2196f3' : 'none',
                boxShadow: workOrder.priority === 'urgent' || workOrder.priority === 'high' ? '0 4px 20px rgba(244, 67, 54, 0.3)' : undefined
              }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Header with Status and Priority */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" gutterBottom noWrap sx={{ flex: 1, mr: 1 }}>
                      {workOrder.title}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Chip 
                        label={workOrder.status.replace('_', ' ')} 
                        color={getStatusColor(workOrder.status)}
                        size="small"
                      />
                      <Chip 
                        label={workOrder.priority} 
                        color={getPriorityColor(workOrder.priority)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {workOrder.description}
                  </Typography>
                  
                  {/* Location Info */}
                  <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <BuildingIcon sx={{ fontSize: 16, mr: 1, color: 'primary.main' }} />
                      <Typography variant="body2" fontWeight="medium">
                        {workOrder.building?.name || 'Unknown Building'}
                      </Typography>
                    </Box>
                    {workOrder.building?.address && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {workOrder.building.address}
                      </Typography>
                    )}
                    {workOrder.apartmentNumber && (
                      <Typography variant="caption" display="block">
                        <strong>Apartment:</strong> {workOrder.apartmentNumber}
                        {workOrder.block && ` (Block ${workOrder.block})`}
                      </Typography>
                    )}
                    <Typography variant="caption" display="block">
                      <strong>Scheduled:</strong> {formatDate(workOrder.scheduledDate)}
                    </Typography>
                  </Box>

                  {/* Team Members */}
                  {workOrder.teamMembers && workOrder.teamMembers.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        <TeamIcon sx={{ fontSize: 14, mr: 0.5 }} />
                        Team Members:
                      </Typography>
                      <AvatarGroup max={3} sx={{ justifyContent: 'flex-start' }}>
                        {workOrder.teamMembers.map((member) => (
                          <Tooltip key={member._id} title={member.name}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                              {member.name?.charAt(0)}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                    </Box>
                  )}

                  {/* Work Type */}
                  <Box sx={{ mb: 1 }}>
                    <Chip 
                      label={`${workOrder.workType} - ${workOrder.workSubType}`}
                      size="small"
                      variant="outlined"
                      color="default"
                    />
                  </Box>
                </CardContent>

                {/* Action Buttons */}
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                    {workOrder.status === 'pending' && (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<StartIcon />}
                        onClick={() => handleStartTask(workOrder)}
                        size="small"
                        sx={{ flex: 1 }}
                      >
                        Start
                      </Button>
                    )}
                    {workOrder.status === 'in_progress' && (
                      <>
                        <Button
                          variant="outlined"
                          color="warning"
                          startIcon={<PauseIcon />}
                          onClick={() => handlePauseTask(workOrder)}
                          size="small"
                          sx={{ flex: 1 }}
                        >
                          Pause
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CompleteIcon />}
                          onClick={() => handleCompleteTask(workOrder)}
                          size="small"
                          sx={{ flex: 1 }}
                        >
                          Complete
                        </Button>
                      </>
                    )}
                    {workOrder.status === 'completed' && (
                      <Button
                        variant="outlined"
                        color="success"
                        startIcon={<CompleteIcon />}
                        disabled
                        size="small"
                        sx={{ flex: 1 }}
                      >
                        Completed
                      </Button>
                    )}
                    {workOrder.status === 'on_hold' && (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<StartIcon />}
                        onClick={() => handleStartTask(workOrder)}
                        size="small"
                        sx={{ flex: 1 }}
                      >
                        Resume
                      </Button>
                    )}
                  </Box>
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

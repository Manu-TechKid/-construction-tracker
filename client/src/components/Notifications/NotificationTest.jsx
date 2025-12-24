import { Button, Typography, Paper, Grid } from '@mui/material';
import { useNotifications } from '../../contexts/NotificationContext';
import { 
  notifyWorkOrderAssigned, 
  notifyWorkOrderStatusChanged,
  notifyWorkOrderCompleted,
  notifyGeofenceViolation,
  notifyNewWorkerRegistration,
  notifyReminderDue,
  notifySystemError
} from '../../utils/notificationTriggers';

const NotificationTest = () => {
  const { simulateNotification } = useNotifications();

  // Sample data for testing
  const sampleWorkOrder = {
    id: '123',
    title: 'Fix Plumbing Issue',
    description: 'Repair leaking pipe in bathroom'
  };

  const sampleWorker = {
    id: '456',
    name: 'John Doe',
    email: 'john@example.com'
  };

  const sampleTimeSession = {
    id: '789',
    workerName: 'Jane Smith',
    startTime: new Date().toISOString()
  };

  const sampleReminder = {
    id: '101',
    description: 'Follow up with client about invoice payment'
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Notification Test Panel
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Click the buttons below to test different notification types
      </Typography>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={() => simulateNotification('info')}
          >
            Basic Info Notification
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={() => simulateNotification('success')}
          >
            Success Notification
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={() => simulateNotification('warning')}
          >
            Warning Notification
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={() => simulateNotification('error')}
          >
            Error Notification
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={() => notifyWorkOrderAssigned(sampleWorkOrder, sampleWorker)}
          >
            Work Order Assigned
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={() => notifyWorkOrderStatusChanged(sampleWorkOrder, 'In Progress', 'Completed')}
          >
            Status Changed
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={() => notifyWorkOrderCompleted(sampleWorkOrder)}
          >
            Work Order Completed
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={() => notifyGeofenceViolation(sampleTimeSession, 'Downtown Apartments')}
          >
            Geofence Violation
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={() => notifyNewWorkerRegistration(sampleWorker)}
          >
            New Worker Registration
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={() => notifyReminderDue(sampleReminder)}
          >
            Reminder Due
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={() => notifySystemError('Database connection failed')}
          >
            System Error
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default NotificationTest;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardHeader,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Typography,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Notifications as ReminderIcon,
  Add as AddIcon,
  CheckCircle as CompletedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CalendarToday as CalendarIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
  Apartment as ApartmentIcon,
} from '@mui/icons-material';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useGetRemindersQuery } from '../../features/reminders/remindersApiSlice';
import { useAuth } from '../../hooks/useAuth';

const RemindersTab = ({ buildingId, apartmentId }) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // Fetch reminders for this building or apartment
  const { 
    data: remindersData, 
    isLoading, 
    isError, 
    error 
  } = useGetRemindersQuery({ 
    building: buildingId,
    apartment: apartmentId || undefined,
    limit: 50
  });
  
  const reminders = remindersData?.data?.reminders || [];
  
  // Determine the context for creating new reminders
  
  // Handle create new reminder
  const handleCreateReminder = () => {
    let url = `/reminders/new?building=${buildingId}`;
    if (apartmentId) {
      url += `&apartmentId=${apartmentId}&type=apartment`;
      // Get the apartment number for the title
      const apartmentNumber = reminders[0]?.apartment?.number || 'this apartment';
      url += `&title=Reminder for apartment ${apartmentNumber}`;
    } else {
      url += '&type=building';
      const buildingName = reminders[0]?.building?.name || 'this building';
      url += `&title=Reminder for ${buildingName}`;
    }
    navigate(url);
  };

  // Handle view reminder details
  const handleViewReminder = (reminderId) => {
    navigate(`/reminders/${reminderId}`);
  };

  // Get status chip based on reminder status and due date
  const getStatusChip = (status, dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const isOverdue = due < now && status !== 'completed';
    const isDueToday = due.toDateString() === now.toDateString() && status !== 'completed';
    
    if (status === 'completed') {
      return (
        <Chip 
          icon={<CompletedIcon fontSize="small" />} 
          label="Completed" 
          color="success" 
          size="small" 
          variant="outlined"
          sx={{ '& .MuiChip-icon': { color: 'success.main' } }}
        />
      );
    } else if (isOverdue) {
      return (
        <Chip
          icon={<ErrorIcon fontSize="small" />}
          label={`Overdue (${formatDistanceToNow(due, { addSuffix: true })})`}
          color="error"
          size="small"
          sx={{ '& .MuiChip-icon': { color: 'error.main' } }}
        />
      );
    } else if (isDueToday) {
      return (
        <Chip
          icon={<WarningIcon fontSize="small" />}
          label="Due Today"
          color="warning"
          size="small"
          sx={{ '& .MuiChip-icon': { color: 'warning.main' } }}
        />
      );
    } else {
      return (
        <Chip
          icon={<WarningIcon fontSize="small" />}
          label={`Due ${formatDistanceToNow(due, { addSuffix: true })}`}
          color="warning"
          size="small"
          variant="outlined"
        />
      );
    }
  };
  
  // Get priority chip color
  const getPriorityChip = (priority) => {
    const priorityMap = {
      high: { label: 'High', color: 'error' },
      medium: { label: 'Medium', color: 'warning' },
      low: { label: 'Low', color: 'info' },
    };
    
    const { label, color } = priorityMap[priority] || { label: 'Medium', color: 'default' };
    
    return (
      <Chip 
        label={label} 
        color={color} 
        size="small" 
        variant="outlined"
      />
    );
  };
  
  // Loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Error state
  if (isError) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
        <Typography color="error" gutterBottom>
          Error loading {apartmentId ? 'apartment' : 'building'} reminders
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {error?.data?.message || 'Failed to load reminders. Please try again later.'}
        </Typography>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={() => window.location.reload()}
          startIcon={<RefreshIcon />}
        >
          Retry
        </Button>
      </Paper>
    );
  }
  
  // Empty state
  if (reminders.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <ReminderIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No {apartmentId ? 'Apartment' : 'Building'} Reminders
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
          {apartmentId 
            ? 'There are no reminders for this apartment. Create one to keep track of important tasks, maintenance, or notes.' 
            : 'There are no reminders for this building yet. Create reminders to track important tasks, maintenance schedules, or notes.'
          }
        </Typography>
        {hasPermission(['admin', 'manager', 'supervisor']) && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateReminder}
            size="large"
            sx={{ mt: 1 }}
          >
            Create Reminder
          </Button>
        )}
      </Paper>
    );
  }
  
  // Main content
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          {apartmentId ? 'Apartment Reminders' : 'Building Reminders'}
        </Typography>
        {hasPermission(['admin', 'manager', 'supervisor']) && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateReminder}
            size="small"
          >
            New {apartmentId ? 'Apartment' : 'Building'} Reminder
          </Button>
        )}
      </Box>
      
      <Card>
        <CardHeader 
          title={`${apartmentId ? 'Apartment' : 'Building'} Reminders (${reminders.length})`} 
          titleTypographyProps={{ variant: 'h6' }}
        />
        <Divider />
        <List disablePadding>
          {reminders.map((reminder) => (
            <React.Fragment key={reminder._id}>
              <ListItem 
                button 
                onClick={() => handleViewReminder(reminder._id)}
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <ReminderIcon color={reminder.status === 'completed' ? 'success' : 'primary'} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" mb={0.5}>
                      <Typography variant="subtitle1" component="span" sx={{ fontWeight: 500, mr: 1 }}>
                        {reminder.title}
                      </Typography>
                      {getStatusChip(reminder.status, reminder.dueDate)}
                      <Box ml="auto">
                        {getPriorityChip(reminder.priority)}
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Box>
                      {reminder.type === 'apartment' && reminder.apartment?.number && (
                        <Box display="flex" alignItems="center" mb={0.5}>
                          <ApartmentIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary" component="span">
                            Apartment {reminder.apartment.number}
                          </Typography>
                        </Box>
                      )}
                      <Box display="flex" alignItems="center" mt={0.5}>
                        <CalendarIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" component="span">
                          Due {formatDistanceToNow(parseISO(reminder.dueDate), { addSuffix: true })}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleViewReminder(reminder._id)}>
                    <ArrowForwardIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      </Card>
    </Box>
  );
};

export default RemindersTab;

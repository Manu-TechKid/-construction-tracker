import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { format, parseISO, isBefore } from 'date-fns';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Chip,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Grid,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Badge,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  PhotoCamera as PhotoCameraIcon,
  NoteAdd as NoteAddIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useGetReminderQuery, useUpdateReminderMutation, useAddNoteToReminderMutation, useDeleteReminderMutation } from '../../features/reminders/remindersApiSlice';
import { selectCurrentUser } from '../../features/auth/authSlice';
import ReminderForm from '../../components/reminders/ReminderForm';
import { timeAgo } from '../../utils/dateUtils';

const statusColors = {
  pending: 'warning',
  'in-progress': 'info',
  completed: 'success',
  overdue: 'error'
};

const priorityColors = {
  low: 'info',
  medium: 'warning',
  high: 'error'
};

const ReminderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  
  // Fetch reminder data
  const { 
    data: reminderData, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useGetReminderQuery(id);
  
  const [updateReminder, { isLoading: isUpdating }] = useUpdateReminderMutation();
  const [addNote] = useAddNoteToReminderMutation();
  const [deleteReminder, { isLoading: isDeleting }] = useDeleteReminderMutation();
  
  const user = useSelector(selectCurrentUser);
  const reminder = reminderData?.data?.reminder;
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleEditClick = () => {
    setIsEditing(true);
  };
  
  const handleSave = async (formData) => {
    try {
      await updateReminder({
        id,
        ...formData
      }).unwrap();
      
      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error('Failed to update reminder:', error);
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
  };
  
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      await deleteReminder(id).unwrap();
      navigate('/reminders');
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    }
    setDeleteDialogOpen(false);
  };
  
  const handleCompleteClick = () => {
    setCompleteDialogOpen(true);
  };
  
  const handleCompleteConfirm = async () => {
    try {
      await updateReminder({
        id,
        status: 'completed',
        completedAt: new Date().toISOString()
      }).unwrap();
      
      refetch();
      setCompleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to complete reminder:', error);
    }
  };
  
  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    
    try {
      await addNote({
        reminderId: id,
        text: noteText
      }).unwrap();
      
      setNoteText('');
      refetch();
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };
  
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (isError) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Alert severity="error">
          {error?.data?.message || 'Failed to load reminder details'}
        </Alert>
      </Box>
    );
  }
  
  if (!reminder) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Alert severity="warning">Reminder not found</Alert>
      </Box>
    );
  }
  
  const isOverdue = isBefore(parseISO(reminder.dueDate), new Date()) && reminder.status !== 'completed';
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Back to Reminders
        </Button>
        
        {isEditing ? (
          <ReminderForm
            initialValues={{
              title: reminder.title,
              description: reminder.description,
              building: reminder.building?._id || reminder.building,
              apartment: reminder.apartment,
              dueDate: parseISO(reminder.dueDate),
              status: reminder.status,
              priority: reminder.priority,
              category: reminder.category,
              notes: reminder.notes || [],
              photos: reminder.photos || []
            }}
            onSubmit={handleSave}
            isSubmitting={isUpdating}
            isEdit={true}
            onCancel={handleCancelEdit}
          />
        ) : (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
              <Box>
                <Box display="flex" alignItems="center" mb={1}>
                  <Typography variant="h4" component="h1" sx={{ mr: 2 }}>
                    {reminder.title}
                  </Typography>
                  <Chip 
                    label={reminder.status.replace('-', ' ')}
                    color={statusColors[reminder.status] || 'default'}
                    size="small"
                    sx={{ textTransform: 'capitalize', mr: 1 }}
                  />
                  <Chip 
                    label={reminder.priority}
                    color={priorityColors[reminder.priority] || 'default'}
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>
                
                {reminder.building && (
                  <Typography variant="subtitle1" color="textSecondary">
                    {reminder.building.displayName || reminder.building.name} {reminder.apartment && `• ${reminder.apartment}`}
                  </Typography>
                )}
                
                <Box display="flex" alignItems="center" mt={1}>
                  <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <NotificationsIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Due: {format(parseISO(reminder.dueDate), 'MMM d, yyyy')}
                    {isOverdue && (
                      <Chip 
                        label="Overdue" 
                        color="error" 
                        size="small" 
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                </Box>
              </Box>
              
              <Box display="flex" gap={1}>
                {reminder.status !== 'completed' && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleCompleteClick}
                    disabled={isUpdating}
                  >
                    Mark Complete
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEditClick}
                  disabled={isUpdating}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </Box>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {reminder.description || 'No description provided.'}
                    </Typography>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Tabs
                      value={tabValue}
                      onChange={handleTabChange}
                      indicatorColor="primary"
                      textColor="primary"
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{ mb: 2 }}
                    >
                      <Tab label="Notes" />
                      <Tab 
                        label={
                          <Box display="flex" alignItems="center">
                            Photos
                            {reminder.photos?.length > 0 && (
                              <Chip 
                                label={reminder.photos.length} 
                                size="small" 
                                sx={{ ml: 1 }} 
                              />
                            )}
                          </Box>
                        } 
                      />
                      <Tab label="History" />
                    </Tabs>
                    
                    {tabValue === 0 && (
                      <Box>
                        <Box component="form" onSubmit={handleNoteSubmit} sx={{ mb: 3 }}>
                          <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Add a note..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            multiline
                            rows={2}
                            margin="normal"
                          />
                          <Box display="flex" justifyContent="flex-end" mt={1}>
                            <Button
                              type="submit"
                              variant="contained"
                              color="primary"
                              disabled={!noteText.trim()}
                              startIcon={<NoteAddIcon />}
                            >
                              Add Note
                            </Button>
                          </Box>
                        </Box>
                        
                        <List>
                          {reminder.notes?.length > 0 ? (
                            reminder.notes.map((note, index) => (
                              <React.Fragment key={index}>
                                <ListItem alignItems="flex-start">
                                  <ListItemAvatar>
                                    <Avatar>
                                      {note.createdBy?.name?.charAt(0) || 'U'}
                                    </Avatar>
                                  </ListItemAvatar>
                                  <ListItemText
                                    primary={note.text}
                                    secondary={
                                      <>
                                        {timeAgo(note.createdAt)}
                                        {note.createdBy?.name && ` • ${note.createdBy.name}`}
                                      </>
                                    }
                                  />
                                </ListItem>
                                {index < reminder.notes.length - 1 && (
                                  <Divider variant="inset" component="li" />
                                )}
                              </React.Fragment>
                            ))
                          ) : (
                            <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                              No notes yet. Add a note to track updates.
                            </Typography>
                          )}
                        </List>
                      </Box>
                    )}
                    
                    {tabValue === 1 && (
                      <Box>
                        {reminder.photos?.length > 0 ? (
                          <Grid container spacing={2}>
                            {reminder.photos.map((photo, index) => (
                              <Grid item xs={12} sm={6} md={4} key={index}>
                                <Paper
                                  elevation={2}
                                  sx={{
                                    position: 'relative',
                                    paddingTop: '100%',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    '&:hover img': {
                                      transform: 'scale(1.05)',
                                    },
                                  }}
                                >
                                  <Box
                                    component="img"
                                    src={`${process.env.REACT_APP_API_URL}/img/reminders/${photo}`}
                                    alt={`Reminder ${index + 1}`}
                                    sx={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      transition: 'transform 0.3s ease-in-out',
                                    }}
                                  />
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        ) : (
                          <Box
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="center"
                            minHeight="200px"
                            border="1px dashed"
                            borderColor="divider"
                            borderRadius={1}
                            p={3}
                            textAlign="center"
                          >
                            <PhotoCameraIcon color="action" sx={{ fontSize: 48, mb: 2 }} />
                            <Typography variant="body1" color="textSecondary" gutterBottom>
                              No photos added yet
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Click the Edit button to add photos to this reminder
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                    
                    {tabValue === 2 && (
                      <Box>
                        <List>
                          <ListItem>
                            <ListItemText
                              primary="Reminder created"
                              secondary={timeAgo(reminder.createdAt) + ' by ' + (reminder.createdBy?.name || 'System')}
                            />
                          </ListItem>
                          
                          {reminder.completedAt && (
                            <ListItem>
                              <ListItemText
                                primary="Reminder completed"
                                secondary={timeAgo(reminder.completedAt) + ' by ' + (reminder.completedBy?.name || 'System')}
                              />
                            </ListItem>
                          )}
                          
                          {reminder.updatedAt !== reminder.createdAt && (
                            <ListItem>
                              <ListItemText
                                primary="Last updated"
                                secondary={timeAgo(reminder.updatedAt) + ' by ' + (reminder.updatedBy?.name || 'System')}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Details
                    </Typography>
                    
                    <Box mb={2}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Category
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {reminder.category || 'Not specified'}
                      </Typography>
                    </Box>
                    
                    <Box mb={2}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Created
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {format(parseISO(reminder.createdAt), 'MMM d, yyyy h:mm a')}
                      </Typography>
                    </Box>
                    
                    {reminder.completedAt && (
                      <Box mb={2}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Completed
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {format(parseISO(reminder.completedAt), 'MMM d, yyyy h:mm a')}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box mb={2}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Created By
                      </Typography>
                      <Box display="flex" alignItems="center" mt={1}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            fontSize: '0.875rem',
                            mr: 1
                          }}
                        >
                          {reminder.createdBy?.name?.charAt(0) || 'U'}
                        </Avatar>
                        <Typography variant="body1">
                          {reminder.createdBy?.name || 'Unknown User'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Quick Actions
                    </Typography>
                    
                    <Box display="flex" flexDirection="column" gap={1}>
                      {reminder.status !== 'completed' && (
                        <Button
                          variant="outlined"
                          color="primary"
                          fullWidth
                          startIcon={<CheckCircleIcon />}
                          onClick={handleCompleteClick}
                          disabled={isUpdating}
                        >
                          Mark as Complete
                        </Button>
                      )}
                      
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<EditIcon />}
                        onClick={handleEditClick}
                        disabled={isUpdating}
                      >
                        Edit Reminder
                      </Button>
                      
                      <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                        startIcon={<DeleteIcon />}
                        onClick={handleDeleteClick}
                        disabled={isDeleting}
                      >
                        Delete Reminder
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Reminder
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this reminder? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            autoFocus
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Complete Confirmation Dialog */}
      <Dialog
        open={completeDialogOpen}
        onClose={() => setCompleteDialogOpen(false)}
        aria-labelledby="complete-dialog-title"
        aria-describedby="complete-dialog-description"
      >
        <DialogTitle id="complete-dialog-title">
          Mark as Complete
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="complete-dialog-description">
            Are you sure you want to mark this reminder as complete?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleCompleteConfirm} 
            color="primary" 
            variant="contained"
            autoFocus
            disabled={isUpdating}
            startIcon={isUpdating ? <CircularProgress size={20} /> : null}
          >
            {isUpdating ? 'Updating...' : 'Mark Complete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReminderDetail;

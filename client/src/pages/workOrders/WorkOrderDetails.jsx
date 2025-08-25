import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  Grid,
  Typography,
  Paper,
  Avatar,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  TextField,
  CircularProgress,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Assignment as WorkOrderIcon,
  Person as PersonIcon,
  Home as BuildingIcon,
  Description as DescriptionIcon,
  Event as EventIcon,
  PriorityHigh as PriorityHighIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  AssignmentLate as AssignmentLateIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  AssignmentReturned as AssignmentReturnedIcon,
  Comment as CommentIcon,
  Add as AddIcon,
  AttachFile as AttachFileIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format, parseISO, isBefore } from 'date-fns';
import { useGetWorkOrderQuery, useUpdateWorkOrderMutation, useAddNoteToWorkOrderMutation, useUpdateNoteInWorkOrderMutation, useDeleteNoteFromWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, timeAgo } from '../../utils/dateUtils';
import ProgressTracker from '../../components/workOrders/ProgressTracker';

// Tab components
const WorkOrderInfoTab = ({ workOrder, buildings, workers, onUpdateWorkOrder }) => {
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: workOrder?.title || '',
    description: workOrder?.description || '',
    building: workOrder?.building?._id || '',
    assignedTo: workOrder?.assignedTo?.map(user => user._id) || [],
    priority: workOrder?.priority || 'medium',
    status: workOrder?.status || 'pending',
    dueDate: workOrder?.dueDate ? format(parseISO(workOrder.dueDate), 'yyyy-MM-dd') : '',
    estimatedHours: workOrder?.estimatedHours || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onUpdateWorkOrder(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating work order:', error);
    }
  };

  if (!workOrder) return null;

  const statusMap = {
    pending: { label: 'Pending', icon: <PendingIcon />, color: 'warning' },
    in_progress: { label: 'In Progress', icon: <AssignmentLateIcon />, color: 'info' },
    on_hold: { label: 'On Hold', icon: <AssignmentReturnedIcon />, color: 'default' },
    completed: { label: 'Completed', icon: <AssignmentTurnedInIcon />, color: 'success' },
  };

  const priorityMap = {
    low: { label: 'Low', color: 'success' },
    medium: { label: 'Medium', color: 'warning' },
    high: { label: 'High', color: 'error' },
  };

  const status = statusMap[workOrder.status] || { label: workOrder.status, color: 'default' };
  const priority = priorityMap[workOrder.priority] || { label: workOrder.priority, color: 'default' };
  const isOverdue = workOrder.dueDate && isBefore(parseISO(workOrder.dueDate), new Date()) && workOrder.status !== 'completed';

  if (isEditing) {
    return (
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                margin="normal"
                required
              />
              
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={4}
              />
              
              <FormControl fullWidth margin="normal" required>
                <InputLabel id="building-label">Building</InputLabel>
                <Select
                  labelId="building-label"
                  id="building"
                  name="building"
                  value={formData.building}
                  onChange={handleChange}
                  label="Building"
                >
                  {buildings?.map((building) => (
                    <MenuItem key={building._id} value={building._id}>
                      {building.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="assigned-to-label">Assigned To</InputLabel>
                <Select
                  labelId="assigned-to-label"
                  id="assignedTo"
                  name="assignedTo"
                  multiple
                  value={formData.assignedTo}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    assignedTo: e.target.value
                  }))}
                  label="Assigned To"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((userId) => {
                        const worker = workers?.find(w => w._id === userId);
                        return worker ? (
                          <Chip 
                            key={userId} 
                            label={worker.name} 
                            size="small" 
                            avatar={<Avatar src={worker.avatar} />}
                          />
                        ) : null;
                      })}
                    </Box>
                  )}
                >
                  {workers?.map((worker) => (
                    <MenuItem key={worker._id} value={worker._id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          src={worker.avatar} 
                          sx={{ width: 24, height: 24, mr: 1 }}
                        />
                        {worker.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label="Status"
                >
                  {Object.entries(statusMap).map(([value, { label }]) => (
                    <MenuItem key={value} value={value}>
                      <Chip 
                        label={label} 
                        icon={statusMap[value].icon} 
                        color={statusMap[value].color}
                        size="small"
                        variant="outlined"
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal" required>
                <InputLabel id="priority-label">Priority</InputLabel>
                <Select
                  labelId="priority-label"
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  label="Priority"
                >
                  {Object.entries(priorityMap).map(([value, { label, color }]) => (
                    <MenuItem key={value} value={value}>
                      <Chip 
                        label={label} 
                        color={color}
                        size="small"
                        variant="outlined"
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                margin="normal"
                type="date"
                label="Due Date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              
              <TextField
                fullWidth
                margin="normal"
                type="number"
                label="Estimated Hours"
                name="estimatedHours"
                value={formData.estimatedHours}
                onChange={handleChange}
                inputProps={{
                  min: 0,
                  step: 0.5,
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                >
                  Save Changes
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h2" gutterBottom>
            {workOrder.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={status.icon}
              label={status.label}
              color={status.color}
              variant="outlined"
              size="small"
            />
            <Chip
              label={priority.label}
              color={priority.color}
              variant="outlined"
              size="small"
            />
            {isOverdue && (
              <Chip
                label="Overdue"
                color="error"
                size="small"
              />
            )}
          </Box>
        </Box>
        
        {hasPermission('update:work-orders') && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
      </Box>
      
      <Typography variant="body1" paragraph>
        {workOrder.description || 'No description provided.'}
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            DETAILS
          </Typography>
          
          <List dense>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.light' }}>
                  <WorkOrderIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Work Order #" 
                secondary={workOrder.workOrderNumber || workOrder._id.slice(-8).toUpperCase()} 
              />
            </ListItem>
            
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.light' }}>
                  <BuildingIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Building" 
                secondary={workOrder.building?.name || 'Not assigned'} 
              />
            </ListItem>
            
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.light' }}>
                  <EventIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Created" 
                secondary={formatDate(workOrder.createdAt, 'full')} 
              />
            </ListItem>
            
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: isOverdue ? 'error.light' : 'primary.light' }}>
                  <EventIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Due Date" 
                secondary={
                  <>
                    {formatDate(workOrder.dueDate, 'full')}
                    {isOverdue && (
                      <Chip 
                        label="Overdue" 
                        size="small" 
                        color="error"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </>
                } 
              />
            </ListItem>
          </List>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            ASSIGNED TO
          </Typography>
          
          {workOrder.assignedTo?.length > 0 ? (
            <List dense>
              {workOrder.assignedTo.map((user) => (
                <ListItem key={user._id}>
                  <ListItemAvatar>
                    <Avatar src={user.avatar}>
                      {user.name?.charAt(0) || '?'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={user.name} 
                    secondary={user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Worker'} 
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <PersonIcon color="action" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No one is assigned to this work order
              </Typography>
            </Box>
          )}
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              ESTIMATED HOURS
            </Typography>
            <Typography variant="h6">
              {workOrder.estimatedHours || 'Not specified'}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

const WorkOrderNotesTab = ({ workOrder, onAddNote }) => {
  const [newNote, setNewNote] = useState('');
  const { user } = useAuth();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    
    onAddNote({
      content: newNote,
      user: user._id,
    });
    
    setNewNote('');
  };
  
  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            variant="outlined"
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              size="small"
              disabled={!newNote.trim()}
            >
              Add Note
            </Button>
          </Box>
        </form>
      </Paper>
      
      <List>
        {workOrder.notes?.length > 0 ? (
          [...workOrder.notes].reverse().map((note) => (
            <Paper key={note._id} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    src={note.user?.avatar} 
                    sx={{ width: 32, height: 32, mr: 1 }}
                  >
                    {note.user?.name?.charAt(0) || '?'}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2">
                      {note.user?.name || 'Unknown User'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {timeAgo(note.createdAt)}
                    </Typography>
                  </Box>
                </Box>
                <IconButton size="small">
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', pl: 4 }}>
                {note.content}
              </Typography>
            </Paper>
          ))
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <DescriptionIcon color="disabled" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              No notes yet. Add your first note above.
            </Typography>
          </Box>
        )}
      </List>
    </Box>
  );
};

const WorkOrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [workOrder, setWorkOrder] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [workers, setWorkers] = useState([]);
  
  // Fetch work order data
  const { data: workOrderData, isLoading: isLoadingWorkOrder } = useGetWorkOrderQuery(id);
  
  // Fetch buildings and workers for the form
  const { data: buildingsData } = useGetBuildingsQuery();
  const { data: workersData } = useGetWorkersQuery();
  
  // Update work order mutation
  const [updateWorkOrder] = useUpdateWorkOrderMutation();
  const [addNote] = useAddNoteToWorkOrderMutation();
  const [updateNote] = useUpdateNoteInWorkOrderMutation();
  const [deleteNote] = useDeleteNoteFromWorkOrderMutation();
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle update work order
  const handleUpdateWorkOrder = async (data) => {
    try {
      const updatedWorkOrder = await updateWorkOrder({
        id,
        ...data
      }).unwrap();
      
      setWorkOrder(updatedWorkOrder.data);
      return updatedWorkOrder;
    } catch (error) {
      console.error('Error updating work order:', error);
      throw error;
    }
  };
  
  // Handle progress tracker actions
  const handleAddNote = async (noteData) => {
    try {
      await addNote({ id, note: noteData }).unwrap();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleUpdateNote = async (noteId, noteData) => {
    try {
      await updateNote({ id, noteId, note: noteData }).unwrap();
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote({ id, noteId }).unwrap();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };
  
  // Set data when loaded
  useEffect(() => {
    if (workOrderData) {
      setWorkOrder(workOrderData.data);
    }
    
    if (buildingsData) {
      setBuildings(buildingsData.data || []);
    }
    
    if (workersData) {
      setWorkers(workersData.data || []);
    }
    
    if (workOrderData && buildingsData && workersData) {
      setIsLoading(false);
    }
  }, [workOrderData, buildingsData, workersData]);
  
  // Tabs
  const tabs = [
    { label: 'Overview', component: (
      <WorkOrderInfoTab 
        workOrder={workOrder} 
        buildings={buildings}
        workers={workers}
        onUpdateWorkOrder={handleUpdateWorkOrder}
      />
    ) },
    { label: 'Progress & Incidents', component: (
      <ProgressTracker
        workOrderId={id}
        notes={workOrder?.notes || []}
        onAddNote={handleAddNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
      />
    ) },
    { label: 'Notes', component: (
      <WorkOrderNotesTab 
        workOrder={workOrder} 
        onAddNote={handleAddNote} 
      />
    ) },
    { label: 'Attachments', component: <div>Attachments will be displayed here</div> },
  ];
  
  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Error state
  if (!workOrder) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" gutterBottom>
            Work order not found or you don't have permission to view it.
          </Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => navigate(-1)}
            startIcon={<ArrowBackIcon />}
            sx={{ mt: 2 }}
          >
            Back to Work Orders
          </Button>
        </Paper>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 1 }}
        >
          Back
        </Button>
        
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/work-orders" color="inherit">
            Work Orders
          </Link>
          <Typography color="text.primary">
            {workOrder.workOrderNumber || `#${workOrder._id.slice(-6).toUpperCase()}`}
          </Typography>
        </Breadcrumbs>
        
        <Card variant="outlined">
          <CardContent sx={{ p: 0 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                px: 2,
                '& .MuiTab-root': {
                  minHeight: 60,
                },
              }}
            >
              {tabs.map((tab, index) => (
                <Tab 
                  key={index} 
                  label={tab.label} 
                  sx={{ textTransform: 'none', fontWeight: 500 }}
                />
              ))}
            </Tabs>
            
            <Box sx={{ p: 3 }}>
              {tabs[activeTab].component}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default WorkOrderDetails;

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  Typography,
  Chip,
  Avatar,
  Button,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Note as NoteIcon,
  Photo as PhotoIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

import { 
  useGetWorkOrderQuery,
  useDeleteWorkOrderMutation,
  useAddNoteToWorkOrderMutation,
  useUpdateWorkOrderStatusMutation
} from '../../features/workOrders/workOrdersApiSlice';
import { useAuth } from '../../hooks/useAuth';

const WorkOrderDetailsNew = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  
  const { data: workOrderData, isLoading, error } = useGetWorkOrderQuery(id);
  const [deleteWorkOrder, { isLoading: isDeleting }] = useDeleteWorkOrderMutation();
  const [addNote, { isLoading: isAddingNote }] = useAddNoteToWorkOrderMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateWorkOrderStatusMutation();
  
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load work order details: {error?.data?.message || error.message}
        </Alert>
      </Container>
    );
  }
  
  const workOrder = workOrderData?.data;
  
  if (!workOrder) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">Work order not found</Alert>
      </Container>
    );
  }
  
  const handleDelete = async () => {
    try {
      await deleteWorkOrder(id).unwrap();
      toast.success('Work order deleted successfully');
      navigate('/work-orders');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to delete work order');
    }
    setDeleteDialogOpen(false);
  };
  
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      await addNote({
        id,
        note: {
          content: newNote,
          createdBy: user._id,
          isPrivate: false
        }
      }).unwrap();
      toast.success('Note added successfully');
      setNewNote('');
      setNoteDialogOpen(false);
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to add note');
    }
  };
  
  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    
    try {
      await updateStatus({ id, status: newStatus }).unwrap();
      toast.success('Status updated successfully');
      setStatusDialogOpen(false);
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to update status');
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'on_hold': return 'secondary';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };
  
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'urgent': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/work-orders')} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1">
              {workOrder.title || 'Work Order Details'}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              ID: {workOrder._id}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {hasPermission('update:work-orders') && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/work-orders/${id}/edit`)}
            >
              Edit
            </Button>
          )}
          {hasPermission('delete:work-orders') && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          )}
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Main Details */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title="Work Order Information"
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip 
                    label={workOrder.status} 
                    color={getStatusColor(workOrder.status)}
                    onClick={() => setStatusDialogOpen(true)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip 
                    label={workOrder.priority} 
                    color={getPriorityColor(workOrder.priority)}
                  />
                </Box>
              }
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Description:</strong>
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {workOrder.description}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationIcon color="primary" />
                    <Typography variant="subtitle2">Location</Typography>
                  </Box>
                  <Typography variant="body2">
                    {workOrder.building?.name}<br />
                    Block: {workOrder.block}, Apt: {workOrder.apartmentNumber}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarIcon color="primary" />
                    <Typography variant="subtitle2">Schedule</Typography>
                  </Box>
                  <Typography variant="body2">
                    Scheduled: {format(new Date(workOrder.scheduledDate), 'MMM dd, yyyy')}<br />
                    {workOrder.estimatedCompletionDate && (
                      <>Est. Completion: {format(new Date(workOrder.estimatedCompletionDate), 'MMM dd, yyyy')}</>
                    )}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          {/* Services */}
          {workOrder.services && workOrder.services.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Services" />
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Service Type</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Labor Cost</TableCell>
                        <TableCell align="right">Material Cost</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {workOrder.services.map((service, index) => (
                        <TableRow key={index}>
                          <TableCell>{service.type}</TableCell>
                          <TableCell>{service.description}</TableCell>
                          <TableCell align="right">${service.laborCost || 0}</TableCell>
                          <TableCell align="right">${service.materialCost || 0}</TableCell>
                          <TableCell>
                            <Chip 
                              label={service.status} 
                              color={getStatusColor(service.status)}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
          
          {/* Notes */}
          <Card>
            <CardHeader 
              title="Notes"
              action={
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setNoteDialogOpen(true)}
                >
                  Add Note
                </Button>
              }
            />
            <CardContent>
              {workOrder.notes && workOrder.notes.length > 0 ? (
                <List>
                  {workOrder.notes.map((note, index) => (
                    <ListItem key={index} divider>
                      <ListItemAvatar>
                        <Avatar>
                          <NoteIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={note.content}
                        secondary={`By ${note.createdBy?.name || 'Unknown'} on ${format(new Date(note.createdAt), 'MMM dd, yyyy HH:mm')}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No notes available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Assigned Workers */}
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title="Assigned Workers"
              avatar={<AssignmentIcon />}
            />
            <CardContent>
              {workOrder.assignedTo && workOrder.assignedTo.length > 0 ? (
                <List dense>
                  {workOrder.assignedTo.map((assignment, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={assignment.worker?.name || 'Unknown Worker'}
                        secondary={`Status: ${assignment.status}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No workers assigned
                </Typography>
              )}
            </CardContent>
          </Card>
          
          {/* Cost Summary */}
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title="Cost Summary"
              avatar={<MoneyIcon />}
            />
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Estimated Cost:</Typography>
                <Typography variant="body2">${workOrder.estimatedCost || 0}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Actual Cost:</Typography>
                <Typography variant="body2">${workOrder.actualCost || 0}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">Total Services:</Typography>
                <Typography variant="subtitle2">
                  ${workOrder.services?.reduce((total, service) => 
                    total + (service.laborCost || 0) + (service.materialCost || 0), 0
                  ) || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
          
          {/* Photos */}
          {workOrder.photos && workOrder.photos.length > 0 && (
            <Card>
              <CardHeader 
                title="Photos"
                avatar={<PhotoIcon />}
              />
              <CardContent>
                <Grid container spacing={1}>
                  {workOrder.photos.map((photo, index) => (
                    <Grid item xs={6} key={index}>
                      <Paper
                        sx={{
                          aspectRatio: '1',
                          backgroundImage: `url(${photo.url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(photo.url, '_blank')}
                      />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this work order? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Note Dialog */}
      <Dialog open={noteDialogOpen} onClose={() => setNoteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Note</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Enter your note here..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddNote}
            disabled={!newNote.trim() || isAddingNote}
            startIcon={isAddingNote ? <CircularProgress size={20} /> : null}
          >
            Add Note
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>Update Status</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ mt: 1 }}
          >
            <option value="">Select Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleStatusUpdate}
            disabled={!newStatus || isUpdatingStatus}
            startIcon={isUpdatingStatus ? <CircularProgress size={20} /> : null}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WorkOrderDetailsNew;

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
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

import { 
  useGetWorkOrderQuery,
  useUpdateWorkOrderStatusMutation,
  useDeleteWorkOrderMutation,
  useAddNoteToWorkOrderMutation
} from '../../features/workOrders/workOrdersApiSlice';
import { useAuth } from '../../hooks/useAuth';

const WorkOrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  
  const { data: workOrderData, isLoading, error } = useGetWorkOrderQuery(id);
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateWorkOrderStatusMutation();
  const [deleteWorkOrder, { isLoading: isDeleting }] = useDeleteWorkOrderMutation();
  const [addNote, { isLoading: isAddingNote }] = useAddNoteToWorkOrderMutation();
  
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
  
  const handleStatusUpdate = async () => {
    try {
      await updateStatus({ id, status: newStatus }).unwrap();
      toast.success('Work order status updated successfully');
      setStatusDialogOpen(false);
      setNewStatus('');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to update status');
    }
  };
  
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
          isPrivate: false
        }
      }).unwrap();
      toast.success('Note added successfully');
      setNoteDialogOpen(false);
      setNewNote('');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to add note');
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'on_hold': return 'warning';
      case 'cancelled': return 'error';
      case 'pending':
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low':
      default: return 'default';
    }
  };

  const getApartmentStatusColor = (status) => {
    switch (status) {
      case 'occupied': return 'success';
      case 'vacant': return 'default';
      case 'under_renovation': return 'warning';
      case 'reserved': return 'info';
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
              {workOrder.title}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {workOrder.building?.name} - {workOrder.apartmentNumber || 'N/A'}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip 
            label={workOrder.status?.charAt(0).toUpperCase() + workOrder.status?.slice(1) || 'Pending'}
            color={getStatusColor(workOrder.status)}
            size="large"
          />
          <Chip 
            label={workOrder.priority?.charAt(0).toUpperCase() + workOrder.priority?.slice(1) || 'Medium'}
            color={getPriorityColor(workOrder.priority)}
            size="large"
          />
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Work Order Information */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title="Work Order Information"
              avatar={<AssignmentIcon />}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {workOrder.description}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Building
                  </Typography>
                  <Typography variant="body1">
                    {workOrder.building?.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {workOrder.building?.address}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Apartment Details
                  </Typography>
                  <Typography variant="body1">
                    Apartment: {workOrder.apartmentNumber || 'N/A'}
                  </Typography>
                  {workOrder.block && (
                    <Typography variant="body2" color="textSecondary">
                      Block: {workOrder.block}
                    </Typography>
                  )}
                  <Chip
                    label={workOrder.apartmentStatus?.charAt(0).toUpperCase() + workOrder.apartmentStatus?.slice(1).replace('_', ' ') || 'Occupied'}
                    color={getApartmentStatusColor(workOrder.apartmentStatus)}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Scheduled Date
                  </Typography>
                  <Typography variant="body1">
                    {workOrder.scheduledDate ? format(new Date(workOrder.scheduledDate), 'MMM dd, yyyy') : 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Estimated Completion
                  </Typography>
                  <Typography variant="body1">
                    {workOrder.estimatedCompletionDate ? format(new Date(workOrder.estimatedCompletionDate), 'MMM dd, yyyy') : 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Estimated Cost
                  </Typography>
                  <Typography variant="body1">
                    ${workOrder.estimatedCost?.toFixed(2) || '0.00'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Actual Cost
                  </Typography>
                  <Typography variant="body1">
                    ${workOrder.actualCost?.toFixed(2) || '0.00'}
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
                        <TableCell>Type</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Labor Cost</TableCell>
                        <TableCell align="right">Material Cost</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {workOrder.services.map((service, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {service.type?.charAt(0).toUpperCase() + service.type?.slice(1)}
                            </Typography>
                          </TableCell>
                          <TableCell>{service.description}</TableCell>
                          <TableCell align="right">${service.laborCost?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell align="right">${service.materialCost?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>
                            <Chip
                              label={service.status?.charAt(0).toUpperCase() + service.status?.slice(1) || 'Pending'}
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
          
          {/* Assigned Workers */}
          {workOrder.assignedTo && workOrder.assignedTo.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Assigned Workers" />
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Worker</TableCell>
                        <TableCell>Assigned Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Time Spent</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {workOrder.assignedTo.map((assignment, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {assignment.worker?.name || 'Unknown Worker'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {assignment.worker?.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {assignment.assignedAt ? format(new Date(assignment.assignedAt), 'MMM dd, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={assignment.status?.charAt(0).toUpperCase() + assignment.status?.slice(1) || 'Pending'}
                              color={getStatusColor(assignment.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {assignment.timeSpent ? 
                              `${assignment.timeSpent.hours || 0}h ${assignment.timeSpent.minutes || 0}m` : 
                              '0h 0m'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
          
          {/* Photos */}
          {workOrder.photos && workOrder.photos.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Photos" />
              <CardContent>
                <Grid container spacing={2}>
                  {workOrder.photos.map((photo, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card>
                        <img
                          src={photo.url}
                          alt={`Work order photo ${index + 1}`}
                          style={{
                            width: '100%',
                            height: 200,
                            objectFit: 'cover',
                            borderRadius: '4px 4px 0 0'
                          }}
                        />
                        <CardContent sx={{ p: 1 }}>
                          <Typography variant="caption" color="textSecondary">
                            Uploaded: {photo.uploadedAt ? format(new Date(photo.uploadedAt), 'MMM dd, yyyy') : 'N/A'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {workOrder.notes && workOrder.notes.length > 0 && (
            <Card>
              <CardHeader 
                title="Notes"
                action={
                  hasPermission('update:workorders') && (
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setNoteDialogOpen(true)}
                    >
                      Add Note
                    </Button>
                  )
                }
              />
              <CardContent>
                {workOrder.notes.map((note, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2">
                      {note.content}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {note.createdBy?.name} - {note.createdAt ? format(new Date(note.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>
        
        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Actions */}
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Actions" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {hasPermission('update:workorders') && (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/work-orders/${id}/edit`)}
                    fullWidth
                  >
                    Edit Work Order
                  </Button>
                )}
                
                {hasPermission('update:workorders') && (
                  <Button
                    variant="outlined"
                    startIcon={<ScheduleIcon />}
                    onClick={() => {
                      setNewStatus(workOrder.status);
                      setStatusDialogOpen(true);
                    }}
                    fullWidth
                  >
                    Update Status
                  </Button>
                )}
                
                {hasPermission('update:workorders') && (
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setNoteDialogOpen(true)}
                    fullWidth
                  >
                    Add Note
                  </Button>
                )}
                
                {hasPermission('delete:workorders') && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteDialogOpen(true)}
                    fullWidth
                  >
                    Delete Work Order
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
          
          {/* Work Order Stats */}
          <Card>
            <CardHeader title="Work Order Stats" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Created:</Typography>
                  <Typography variant="body2">
                    {workOrder.createdAt ? format(new Date(workOrder.createdAt), 'MMM dd, yyyy') : 'N/A'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Last Updated:</Typography>
                  <Typography variant="body2">
                    {workOrder.updatedAt ? format(new Date(workOrder.updatedAt), 'MMM dd, yyyy') : 'N/A'}
                  </Typography>
                </Box>
                {workOrder.completedAt && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Completed:</Typography>
                    <Typography variant="body2">
                      {format(new Date(workOrder.completedAt), 'MMM dd, yyyy')}
                    </Typography>
                  </Box>
                )}
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Services:</Typography>
                  <Typography variant="body2">
                    {workOrder.services?.length || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Assigned Workers:</Typography>
                  <Typography variant="body2">
                    {workOrder.assignedTo?.length || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Notes:</Typography>
                  <Typography variant="body2">
                    {workOrder.notes?.length || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>Update Work Order Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="on_hold">On Hold</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)} disabled={isUpdatingStatus}>
            Cancel
          </Button>
          <Button 
            onClick={handleStatusUpdate} 
            variant="contained"
            disabled={isUpdatingStatus || !newStatus}
            startIcon={isUpdatingStatus ? <CircularProgress size={20} /> : null}
          >
            {isUpdatingStatus ? 'Updating...' : 'Update Status'}
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
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialogOpen(false)} disabled={isAddingNote}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddNote} 
            variant="contained"
            disabled={isAddingNote || !newNote.trim()}
            startIcon={isAddingNote ? <CircularProgress size={20} /> : null}
          >
            {isAddingNote ? 'Adding...' : 'Add Note'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Work Order</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete work order "{workOrder.title}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WorkOrderDetails;

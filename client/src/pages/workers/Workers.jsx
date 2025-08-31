import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { useGetWorkersQuery, useDeleteWorkerMutation } from '../../features/workers/workersApiSlice';
import { toast } from 'react-toastify';

const Workers = () => {
  const navigate = useNavigate();
  const { data: workersData, isLoading, error } = useGetWorkersQuery();
  const [deleteWorker, { isLoading: isDeleting }] = useDeleteWorkerMutation();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Extract workers from API response
  const workers = workersData?.data?.workers || workersData?.data || [];

  const handleMenuClick = (event, worker) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorker(worker);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorker(null);
  };

  const handleView = (worker) => {
    navigate(`/workers/${worker._id}`);
    handleMenuClose();
  };

  const handleEdit = (worker) => {
    navigate(`/workers/${worker._id}/edit`);
    handleMenuClose();
  };

  const handleDeleteClick = (worker) => {
    setSelectedWorker(worker);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (selectedWorker) {
      try {
        await deleteWorker(selectedWorker._id).unwrap();
        toast.success('Worker deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedWorker(null);
      } catch (error) {
        console.error('Failed to delete worker:', error);
        toast.error(error?.data?.message || 'Failed to delete worker');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'on_leave': return 'warning';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Error loading workers: {error?.data?.message || error?.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Workers ({workers.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/workers/create')}
        >
          Add Worker
        </Button>
      </Box>

      {workers.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            No workers found
          </Typography>
          <Typography>
            Start by adding your first worker to the system.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/workers/create')}
            sx={{ mt: 2 }}
          >
            Add First Worker
          </Button>
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {workers.map((worker) => (
            <Grid item xs={12} sm={6} md={4} key={worker._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" component="h3">
                          {worker.name}
                        </Typography>
                        <Chip 
                          label={worker.status?.replace('_', ' ').toUpperCase() || 'ACTIVE'} 
                          color={getStatusColor(worker.status)}
                          size="small"
                        />
                      </Box>
                    </Box>
                    <IconButton onClick={(e) => handleMenuClick(e, worker)}>
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <EmailIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {worker.email || 'No email'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PhoneIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {worker.phone || 'No phone'}
                      </Typography>
                    </Box>
                  </Box>

                  {worker.skills && worker.skills.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Skills:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {worker.skills.slice(0, 3).map((skill, index) => (
                          <Chip key={index} label={skill} size="small" variant="outlined" />
                        ))}
                        {worker.skills.length > 3 && (
                          <Chip label={`+${worker.skills.length - 3} more`} size="small" variant="outlined" color="primary" />
                        )}
                      </Box>
                    </Box>
                  )}

                  <Typography variant="body2" color="text.secondary">
                    Rate: ${worker.hourlyRate || 'N/A'}/hr
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleView(selectedWorker)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleEdit(selectedWorker)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Worker</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => handleDeleteClick(selectedWorker)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Worker</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Worker
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete "{selectedWorker?.name}"? This action cannot be undone.
            Any work orders assigned to this worker will need to be reassigned.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Workers;

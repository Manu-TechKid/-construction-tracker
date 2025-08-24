import React, { useState } from 'react';
import {
  Box,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useGetWorkersQuery, useCreateWorkerMutation, useDeleteWorkerMutation } from '../../features/workers/workersApiSlice';

const Workers = () => {
  const { data: workersData, isLoading, error } = useGetWorkersQuery();
  const [createWorker, { isLoading: isCreating }] = useCreateWorkerMutation();
  const [deleteWorker] = useDeleteWorkerMutation();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newWorker, setNewWorker] = useState({
    name: '',
    email: '',
    phone: '',
    skills: [],
    paymentType: 'hourly',
    hourlyRate: '',
    status: 'active'
  });

  const workers = workersData?.data?.workers || [];

  const handleMenuClick = (event, worker) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorker(worker);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorker(null);
  };

  const handleCreateWorker = async () => {
    try {
      await createWorker(newWorker).unwrap();
      setOpenDialog(false);
      setNewWorker({
        name: '',
        email: '',
        phone: '',
        skills: [],
        paymentType: 'hourly',
        hourlyRate: '',
        status: 'active'
      });
    } catch (error) {
      console.error('Failed to create worker:', error);
    }
  };

  const handleDeleteWorker = async () => {
    if (selectedWorker) {
      try {
        await deleteWorker(selectedWorker._id).unwrap();
        handleMenuClose();
      } catch (error) {
        console.error('Failed to delete worker:', error);
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error loading workers: {error?.data?.message || 'Something went wrong!'}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Workers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add Worker
        </Button>
      </Box>

      <Grid container spacing={3}>
        {workers.map((worker) => (
          <Grid item xs={12} sm={6} md={4} key={worker._id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{worker.name}</Typography>
                      <Chip 
                        label={worker.status} 
                        color={getStatusColor(worker.status)}
                        size="small"
                      />
                    </Box>
                  </Box>
                  <IconButton onClick={(e) => handleMenuClick(e, worker)}>
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                <Box mb={2}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <EmailIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {worker.email}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" mb={1}>
                    <PhoneIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {worker.phone}
                    </Typography>
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Skills:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {worker.skills?.map((skill, index) => (
                      <Chip key={index} label={skill} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Rate: ${worker.hourlyRate || worker.contractRate || 'N/A'}/{worker.paymentType === 'hourly' ? 'hr' : 'contract'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>Edit</MenuItem>
        <MenuItem onClick={handleDeleteWorker} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>

      {/* Add Worker Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Worker</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={newWorker.name}
                onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newWorker.email}
                onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                value={newWorker.phone}
                onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Type</InputLabel>
                <Select
                  value={newWorker.paymentType}
                  onChange={(e) => setNewWorker({ ...newWorker, paymentType: e.target.value })}
                  label="Payment Type"
                >
                  <MenuItem value="hourly">Hourly</MenuItem>
                  <MenuItem value="contract">Contract</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Rate"
                type="number"
                value={newWorker.hourlyRate}
                onChange={(e) => setNewWorker({ ...newWorker, hourlyRate: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateWorker} 
            variant="contained"
            disabled={isCreating}
          >
            {isCreating ? <CircularProgress size={20} /> : 'Add Worker'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Workers;

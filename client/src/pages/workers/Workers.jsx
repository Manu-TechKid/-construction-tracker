import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  Autocomplete
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
  Work as WorkIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  FilterList as FilterIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useGetUsersQuery, useDeleteUserMutation, useUpdateUserMutation, useCreateUserMutation } from '../../features/users/usersApiSlice';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';

const WORKER_SKILLS = [
  'painting', 'carpentry', 'plumbing', 'electrical', 'cleaning', 
  'general_labor', 'hvac', 'flooring', 'roofing'
];

const Workers = () => {
  const navigate = useNavigate();
  const { hasPermission, currentUser } = useAuth();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);

  // Menu handlers
  const handleMenuClick = (event, worker) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorker(worker);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Don't clear selectedWorker here - keep it for delete dialog
  };
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    approvalStatus: '',
    skills: []
  });

  // Worker form state
  const [workerForm, setWorkerForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    skills: [],
    hourlyRate: '',
    contractRate: '',
    notes: ''
  });

  // API calls with error boundaries
  const { 
    data: usersData, 
    isLoading, 
    error, 
    refetch 
  } = useGetUsersQuery({ 
    role: 'worker',
    isActive: true,
    approvalStatus: 'approved',
    ...filters 
  }, {
    refetchOnMountOrArgChange: true,
    onError: (error) => {
      toast.error(error?.data?.message || 'Failed to load workers');
    }
  });

  const workers = usersData?.data?.users || [];
  
  const [deleteWorker, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [updateWorker, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [createWorker, { isLoading: isCreating }] = useCreateUserMutation();

  // Filter workers based on tab
  const filteredWorkers = useMemo(() => {
    if (!workers) return [];
    
    // Since we're already filtering for approved workers in the query,
    // we can just return the workers directly
    return workers;
  }, [workers]);

  // Get counts for approved workers only
  const approvedCount = workers.length;

  // Handle worker edit button click
  const handleEditClick = (worker) => {
    if (!worker || !worker._id) {
      toast.error('Invalid worker data');
      return;
    }
    
    setWorkerForm({
      name: worker.name || '',
      email: worker.email || '',
      phone: worker.phone || '',
      password: '', // Don't pre-fill password for security
      skills: worker.workerProfile?.skills || [],
      paymentType: worker.workerProfile?.paymentType || 'hourly',
      hourlyRate: worker.workerProfile?.hourlyRate?.toString() || '',
      contractRate: worker.workerProfile?.contractRate?.toString() || '',
      notes: worker.workerProfile?.notes || ''
    });
    
    setSelectedWorker(worker);
    setEditMode(true);
    setWorkerDialogOpen(true);
  };

  // Handle worker form submission
  const handleWorkerSubmit = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      // Enhanced validation
      if (!workerForm.name?.trim()) {
        toast.error('Name is required');
        return;
      }
      
      if (!workerForm.email?.trim()) {
        toast.error('Email is required');
        return;
      }
      
      // Email format validation
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(workerForm.email.trim())) {
        toast.error('Please enter a valid email address');
        return;
      }
      
      // Password validation for new workers
      if (!editMode && !workerForm.password?.trim()) {
        toast.error('Password is required for new workers');
        return;
      }
      
      // Validate numeric fields
      if (workerForm.hourlyRate && (isNaN(workerForm.hourlyRate) || parseFloat(workerForm.hourlyRate) < 0)) {
        toast.error('Hourly rate must be a valid positive number');
        return;
      }
      
      if (workerForm.contractRate && (isNaN(workerForm.contractRate) || parseFloat(workerForm.contractRate) < 0)) {
        toast.error('Contract rate must be a valid positive number');
        return;
      }

      // Prepare worker data
      const workerData = {
        name: workerForm.name.trim(),
        email: workerForm.email.toLowerCase().trim(),
        phone: workerForm.phone?.trim() || '',
        role: 'worker',
        workerProfile: {
          skills: workerForm.skills || [],
          paymentType: workerForm.paymentType || 'hourly',
          hourlyRate: workerForm.hourlyRate ? parseFloat(workerForm.hourlyRate) : 0,
          contractRate: workerForm.contractRate ? parseFloat(workerForm.contractRate) : 0,
          notes: workerForm.notes?.trim() || ''
        }
      };

      // Handle password for edit vs create
      if (editMode && workerForm.password?.trim()) {
        workerData.password = workerForm.password.trim();
      } else if (!editMode) {
        workerData.password = workerForm.password.trim();
      }

      // Make API call with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );
      
      if (editMode && selectedWorker?._id) {
        await Promise.race([
          updateWorker({
            id: selectedWorker._id,
            ...workerData
          }).unwrap(),
          timeoutPromise
        ]);
        toast.success('Worker updated successfully');
      } else {
        await Promise.race([
          createWorker(workerData).unwrap(),
          timeoutPromise
        ]);
        toast.success('Worker created successfully');
      }

      // Reset form and close dialog
      setWorkerDialogOpen(false);
      resetWorkerForm();
      refetch();
    } catch (error) {
      console.error('Error saving worker:', error);
      
      // Handle specific error types
      if (error.message === 'Request timeout') {
        toast.error('Request timed out. Please check your connection and try again.');
      } else if (error?.data?.message) {
        toast.error(error.data.message);
      } else if (error?.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to save worker. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle worker deletion
  const handleDelete = async () => {
    if (!selectedWorker?._id) {
      toast.error('No worker selected for deletion');
      return;
    }

    try {
      await deleteWorker(selectedWorker._id).unwrap();
      toast.success('Worker deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedWorker(null);
      setAnchorEl(null);
      refetch();
    } catch (error) {
      console.error('Error deleting worker:', error);
      toast.error(error?.data?.message || 'Failed to delete worker');
    }
  };

  // Handle approval actions
  const handleApprovalAction = async (worker, action) => {
    try {
      await updateWorkerApproval({
        id: worker._id,
        approvalStatus: action,
        notes: `${action === 'approved' ? 'Approved' : 'Rejected'} by admin`
      }).unwrap();
      
      toast.success(`Worker ${action === 'approved' ? 'approved' : 'rejected'} successfully`);
      refetch();
    } catch (error) {
      console.error('Approval failed:', error);
      toast.error(error?.data?.message || 'Failed to update worker approval');
    }
  };

  // Reset worker form
  const resetWorkerForm = () => {
    setWorkerForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      skills: [],
      paymentType: 'hourly',
      hourlyRate: '',
      contractRate: '',
      notes: ''
    });
    setSelectedWorker(null);
    setEditMode(false);
    setAnchorEl(null);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setWorkerForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle skills change
  const handleSkillsChange = (event, value) => {
    setWorkerForm(prev => ({
      ...prev,
      skills: value
    }));
  };

  // ... (rest of the component code remains the same)

  // In the return statement, make sure to use the filteredWorkers
  // and add loading states to buttons
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Workers Management</Typography>
        {hasPermission(['create:workers']) && (
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => {
              resetWorkerForm();
              setWorkerDialogOpen(true);
            }}
          >
            Add Worker
          </Button>
        )}
      </Box>

      {/* Tabs and other UI elements */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={`All Workers (${allWorkers.length})`} />
          <Tab label={`Pending (${pendingCount})`} />
          <Tab label={`Approved (${approvedCount})`} />
          <Tab label={`Rejected (${rejectedCount})`} />
        </Tabs>
      </Box>

      {/* Worker List */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">
          Failed to load workers. {error?.data?.message || 'Please try again later.'}
        </Alert>
      ) : filteredWorkers.length === 0 ? (
        <Alert severity="info">No workers found. Create a new worker to get started.</Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredWorkers.map((worker) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={worker._id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box display="flex" alignItems="center" mb={1}>
                      <Avatar src={worker.photo} sx={{ mr: 2 }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{worker.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {worker.email}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      onClick={(e) => handleMenuClick(e, worker)}
                      disabled={isDeleting || isUpdatingApproval}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  <Box mt={2}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <PhoneIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Typography variant="body2">{worker.phone || 'N/A'}</Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" mb={1}>
                      <WorkIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Typography variant="body2">
                        {worker.workerProfile?.paymentType === 'hourly' 
                          ? `$${worker.workerProfile?.hourlyRate || '0'}/hr`
                          : `$${worker.workerProfile?.contractRate || '0'} (contract)`}
                      </Typography>
                    </Box>
                    
                    <Box mt={1}>
                      {worker.workerProfile?.skills?.slice(0, 3).map((skill) => (
                        <Chip 
                          key={skill} 
                          label={skill} 
                          size="small" 
                          sx={{ mr: 0.5, mb: 0.5 }} 
                        />
                      ))}
                      {worker.workerProfile?.skills?.length > 3 && (
                        <Chip 
                          label={`+${worker.workerProfile.skills.length - 3} more`} 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Worker Dialog */}
      <Dialog 
        open={workerDialogOpen} 
        onClose={() => !isSubmitting && setWorkerDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editMode ? 'Edit Worker' : 'Add New Worker'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={workerForm.name}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={workerForm.email}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={workerForm.phone}
                onChange={handleInputChange}
                disabled={isSubmitting}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="password"
                label={editMode ? 'New Password (leave blank to keep current)' : 'Password'}
                type="password"
                value={workerForm.password}
                onChange={handleInputChange}
                required={!editMode}
                disabled={isSubmitting}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={WORKER_SKILLS}
                value={workerForm.skills}
                onChange={handleSkillsChange}
                disabled={isSubmitting}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Skills"
                    placeholder="Select skills"
                    margin="normal"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Payment Type</InputLabel>
                <Select
                  name="paymentType"
                  value={workerForm.paymentType}
                  onChange={handleInputChange}
                  label="Payment Type"
                  disabled={isSubmitting}
                >
                  <MenuItem value="hourly">Hourly</MenuItem>
                  <MenuItem value="contract">Contract</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="hourlyRate"
                label={workerForm.paymentType === 'hourly' ? 'Hourly Rate ($)' : 'Contract Rate ($)'}
                type="number"
                value={workerForm.paymentType === 'hourly' ? workerForm.hourlyRate : workerForm.contractRate}
                onChange={(e) => {
                  if (workerForm.paymentType === 'hourly') {
                    setWorkerForm(prev => ({ ...prev, hourlyRate: e.target.value }));
                  } else {
                    setWorkerForm(prev => ({ ...prev, contractRate: e.target.value }));
                  }
                }}
                disabled={isSubmitting}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                name="notes"
                label="Notes"
                value={workerForm.notes}
                onChange={handleInputChange}
                disabled={isSubmitting}
                margin="normal"
                placeholder="Additional notes about this worker..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setWorkerDialogOpen(false)} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleWorkerSubmit} 
            variant="contained" 
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedWorker?.name}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            disabled={isDeleting}
          >
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

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem 
          onClick={() => {
            navigate(`/workers/${selectedWorker?._id}`);
            handleMenuClose();
          }}
        >
          <VisibilityIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        {hasPermission(['update:workers']) && (
          <MenuItem 
            onClick={() => {
              handleEditClick(selectedWorker);
              setAnchorEl(null);
            }}
            disabled={isUpdatingApproval}
          >
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {hasPermission(['delete:workers']) && (
          <MenuItem 
            onClick={() => {
              setAnchorEl(null);
              setDeleteDialogOpen(true);
            }}
            disabled={isDeleting || isUpdatingApproval}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
        {hasPermission(['approve:workers']) && selectedWorker?.workerProfile?.approvalStatus === 'pending' && (
          <>
            <MenuItem 
              onClick={() => {
                handleApprovalAction(selectedWorker, 'approved');
                handleMenuClose();
              }}
              disabled={isUpdatingApproval}
              sx={{ color: 'success.main' }}
            >
              <ApproveIcon sx={{ mr: 1 }} />
              Approve
            </MenuItem>
            <MenuItem 
              onClick={() => {
                handleApprovalAction(selectedWorker, 'rejected');
                handleMenuClose();
              }}
              disabled={isUpdatingApproval}
              sx={{ color: 'error.main' }}
            >
              <RejectIcon sx={{ mr: 1 }} />
              Reject
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default Workers;

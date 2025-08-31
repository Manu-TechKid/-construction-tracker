import React, { useState } from 'react';
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
import { useGetWorkersQuery, useDeleteWorkerMutation, useUpdateWorkerApprovalMutation, useCreateWorkerMutation, useUpdateWorkerMutation } from '../../features/workers/workersApiSlice';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
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
    paymentType: 'hourly',
    hourlyRate: '',
    contractRate: '',
    notes: ''
  });

  // API calls
  const { data: allWorkersData, isLoading, error, refetch } = useGetWorkersQuery(filters);
  const { data: pendingWorkersData } = useGetWorkersQuery({ approvalStatus: 'pending' });
  const { data: approvedWorkersData } = useGetWorkersQuery({ approvalStatus: 'approved' });
  const { data: rejectedWorkersData } = useGetWorkersQuery({ approvalStatus: 'rejected' });

  const [deleteWorker, { isLoading: isDeleting }] = useDeleteWorkerMutation();
  const [updateWorkerApproval] = useUpdateWorkerApprovalMutation();
  const [createWorker, { isLoading: isCreating }] = useCreateWorkerMutation();
  const [updateWorker, { isLoading: isUpdating }] = useUpdateWorkerMutation();

  const allWorkers = allWorkersData?.data?.workers || [];
  const pendingWorkers = pendingWorkersData?.data?.workers || [];
  const approvedWorkers = approvedWorkersData?.data?.workers || [];
  const rejectedWorkers = rejectedWorkersData?.data?.workers || [];

  const handleMenuClick = (event, worker) => {
    // Ensure worker has valid _id before setting
    if (worker && worker._id) {
      setAnchorEl(event.currentTarget);
      setSelectedWorker(worker);
    } else {
      toast.error('Invalid worker data - cannot perform action');
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorker(null);
  };

  const handleDelete = async () => {
    // Comprehensive validation
    if (!selectedWorker || !selectedWorker._id) {
      toast.error('Cannot delete worker - invalid worker data');
      setDeleteDialogOpen(false);
      handleMenuClose();
      return;
    }

    // Prevent deletion of admin users
    if (selectedWorker.role === 'admin') {
      toast.error('Cannot delete admin users - they control the system');
      setDeleteDialogOpen(false);
      handleMenuClose();
      return;
    }

    // Prevent admin from deleting themselves
    if (currentUser && selectedWorker._id === currentUser._id) {
      toast.error('Cannot delete your own account - use profile settings instead');
      setDeleteDialogOpen(false);
      handleMenuClose();
      return;
    }

    try {
      await deleteWorker(selectedWorker._id).unwrap();
      toast.success('Worker deleted successfully');
      setDeleteDialogOpen(false);
      handleMenuClose();
      refetch();
    } catch (error) {
      console.error('Error deleting worker:', error);
      toast.error(error?.data?.message || 'Failed to delete worker');
    }
  };

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

  const handleWorkerSubmit = async () => {
    try {
      const workerData = {
        ...workerForm,
        hourlyRate: workerForm.hourlyRate ? parseFloat(workerForm.hourlyRate) : undefined,
        contractRate: workerForm.contractRate ? parseFloat(workerForm.contractRate) : undefined
      };

      if (editMode) {
        await updateWorker({
          id: selectedWorker._id,
          ...workerData
        }).unwrap();
        toast.success('Worker updated successfully');
      } else {
        await createWorker(workerData).unwrap();
        toast.success('Worker created successfully');
      }

      setWorkerDialogOpen(false);
      resetWorkerForm();
      refetch();
    } catch (error) {
      console.error('Worker operation failed:', error);
      toast.error(error?.data?.message || `Failed to ${editMode ? 'update' : 'create'} worker`);
    }
  };

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
    setEditMode(false);
    setSelectedWorker(null);
  };

  const openEditDialog = (worker) => {
    setSelectedWorker(worker);
    setWorkerForm({
      name: worker.name,
      email: worker.email,
      phone: worker.phone || '',
      password: '', // Don't pre-fill password
      skills: worker.workerProfile?.skills || [],
      paymentType: worker.workerProfile?.paymentType || 'hourly',
      hourlyRate: worker.workerProfile?.hourlyRate?.toString() || '',
      contractRate: worker.workerProfile?.contractRate?.toString() || '',
      notes: worker.workerProfile?.notes || ''
    });
    setEditMode(true);
    setWorkerDialogOpen(true);
    handleMenuClose();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'on_leave': return 'info';
      default: return 'default';
    }
  };

  const getWorkersByTab = () => {
    switch (tabValue) {
      case 0: return allWorkers;
      case 1: return pendingWorkers;
      case 2: return approvedWorkers;
      case 3: return rejectedWorkers;
      default: return allWorkers;
    }
  };

  const renderWorkerTable = (workers) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Worker</TableCell>
            <TableCell>Contact</TableCell>
            <TableCell>Skills</TableCell>
            <TableCell>Payment</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Approval</TableCell>
            <TableCell>Registered</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {workers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center">
                <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                  No workers found
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            workers.map((worker) => (
              <TableRow key={worker._id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {worker.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {worker.workerProfile?.createdBy ? 'Employer-created' : 'Self-registered'}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{worker.email}</Typography>
                  {worker.phone && (
                    <Typography variant="caption" color="text.secondary">
                      {worker.phone}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {worker.workerProfile?.skills?.slice(0, 2).map((skill, index) => (
                      <Chip
                        key={index}
                        label={skill.replace('_', ' ')}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                    {worker.workerProfile?.skills?.length > 2 && (
                      <Chip
                        label={`+${worker.workerProfile.skills.length - 2}`}
                        size="small"
                        variant="outlined"
                        color="secondary"
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {worker.workerProfile?.paymentType === 'hourly' 
                      ? `$${worker.workerProfile?.hourlyRate || 0}/hr`
                      : `$${worker.workerProfile?.contractRate || 0}/contract`
                    }
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={worker.workerProfile?.status?.toUpperCase() || 'ACTIVE'}
                    color={getStatusColor(worker.workerProfile?.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={worker.workerProfile?.approvalStatus?.toUpperCase() || 'PENDING'}
                    color={getStatusColor(worker.workerProfile?.approvalStatus)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(worker.createdAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {worker.workerProfile?.approvalStatus === 'pending' && (
                      <>
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprovalAction(worker, 'approved')}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleApprovalAction(worker, 'rejected')}
                          >
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, worker)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">Error loading workers: {error?.data?.message || 'Unknown error'}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Workers Management
        </Typography>
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

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{allWorkers.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Workers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Badge badgeContent={pendingWorkers.length} color="warning">
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <PersonIcon />
                  </Avatar>
                </Badge>
                <Box>
                  <Typography variant="h6">{pendingWorkers.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Approval
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <ApproveIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{approvedWorkers.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Approved
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <WorkIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {allWorkers.filter(w => w.workerProfile?.status === 'active').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Workers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search workers..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="on_leave">On Leave</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Approval</InputLabel>
                <Select
                  value={filters.approvalStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, approvalStatus: e.target.value }))}
                  label="Approval"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={5}>
              <Autocomplete
                multiple
                options={WORKER_SKILLS}
                value={filters.skills}
                onChange={(e, newValue) => setFilters(prev => ({ ...prev, skills: newValue }))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Skills"
                    placeholder="Select skills..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option.replace('_', ' ')}
                      size="small"
                      {...getTagProps({ index })}
                    />
                  ))
                }
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Workers Table with Tabs */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`All Workers (${allWorkers.length})`} />
          <Tab 
            label={
              <Badge badgeContent={pendingWorkers.length} color="warning">
                Pending ({pendingWorkers.length})
              </Badge>
            } 
          />
          <Tab label={`Approved (${approvedWorkers.length})`} />
          <Tab label={`Rejected (${rejectedWorkers.length})`} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {renderWorkerTable(getWorkersByTab())}
        </Box>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => navigate(`/workers/${selectedWorker?._id}`)}>
          <VisibilityIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        {hasPermission(['update:workers']) && (
          <MenuItem onClick={() => openEditDialog(selectedWorker)}>
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {hasPermission(['delete:workers']) && 
         selectedWorker?.role !== 'admin' && 
         selectedWorker?._id && 
         selectedWorker._id !== currentUser?._id && (
          <MenuItem 
            onClick={() => {
              handleMenuClose();
              setDeleteDialogOpen(true);
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Worker Create/Edit Dialog */}
      <Dialog open={workerDialogOpen} onClose={() => setWorkerDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Worker' : 'Add New Worker'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={workerForm.name}
                onChange={(e) => setWorkerForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={workerForm.email}
                onChange={(e) => setWorkerForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={workerForm.phone}
                onChange={(e) => setWorkerForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={editMode ? "New Password (leave blank to keep current)" : "Password"}
                type="password"
                value={workerForm.password}
                onChange={(e) => setWorkerForm(prev => ({ ...prev, password: e.target.value }))}
                required={!editMode}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={WORKER_SKILLS}
                value={workerForm.skills}
                onChange={(e, newValue) => setWorkerForm(prev => ({ ...prev, skills: newValue }))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Skills"
                    placeholder="Select worker skills..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option.replace('_', ' ')}
                      {...getTagProps({ index })}
                    />
                  ))
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Payment Type</InputLabel>
                <Select
                  value={workerForm.paymentType}
                  onChange={(e) => setWorkerForm(prev => ({ ...prev, paymentType: e.target.value }))}
                  label="Payment Type"
                >
                  <MenuItem value="hourly">Hourly</MenuItem>
                  <MenuItem value="contract">Contract</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Hourly Rate ($)"
                type="number"
                value={workerForm.hourlyRate}
                onChange={(e) => setWorkerForm(prev => ({ ...prev, hourlyRate: e.target.value }))}
                disabled={workerForm.paymentType !== 'hourly'}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Contract Rate ($)"
                type="number"
                value={workerForm.contractRate}
                onChange={(e) => setWorkerForm(prev => ({ ...prev, contractRate: e.target.value }))}
                disabled={workerForm.paymentType !== 'contract'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={workerForm.notes}
                onChange={(e) => setWorkerForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this worker..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkerDialogOpen(false)} disabled={isCreating || isUpdating}>
            Cancel
          </Button>
          <Button
            onClick={handleWorkerSubmit}
            variant="contained"
            disabled={isCreating || isUpdating || !workerForm.name || !workerForm.email}
          >
            {isCreating || isUpdating ? 'Saving...' : (editMode ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Worker</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this worker? This action cannot be undone.
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
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Workers;

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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

import { useGetWorkersQuery, useUpdateWorkerMutation } from '../../features/workers/workersApiSlice';
import { useAuth } from '../../hooks/useAuth';

const WorkerApproval = () => {
  const { user, hasPermission } = useAuth();
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState({ open: false, action: '', worker: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState('pending');

  const { data: workersData, isLoading, error, refetch } = useGetWorkersQuery({
    approvalStatus: filter !== 'all' ? filter : undefined
  });
  
  const [updateWorker, { isLoading: isUpdating }] = useUpdateWorkerMutation();

  // Extract workers from API response
  const workers = workersData?.data?.workers || workersData?.data || [];
  
  // Filter workers based on approval status
  const filteredWorkers = workers.filter(worker => {
    if (filter === 'all') return true;
    return worker.workerProfile?.approvalStatus === filter;
  });

  const handleApproval = async (workerId, action, reason = '') => {
    try {
      const updateData = {
        'workerProfile.approvalStatus': action,
        'workerProfile.approvedBy': user.id,
        'workerProfile.approvedAt': new Date().toISOString()
      };

      if (action === 'rejected' && reason) {
        updateData['workerProfile.rejectionReason'] = reason;
      }

      await updateWorker({ id: workerId, ...updateData }).unwrap();
      
      toast.success(`Worker ${action} successfully`);
      setApprovalDialog({ open: false, action: '', worker: null });
      setRejectionReason('');
      refetch();
    } catch (error) {
      console.error('Failed to update worker approval:', error);
      toast.error(error?.data?.message || `Failed to ${action} worker`);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error'
    };
    return colors[status] || 'default';
  };

  const formatSkills = (skills) => {
    if (!Array.isArray(skills) || skills.length === 0) return 'No skills listed';
    return skills.map(skill => skill.replace('_', ' ')).join(', ');
  };

  const renderWorkerCard = (worker) => (
    <Card key={worker._id} sx={{ mb: 2, border: 1, borderColor: 'divider' }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" component="div">
                  {worker.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Registered: {format(new Date(worker.createdAt), 'MMM dd, yyyy')}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip
                icon={<EmailIcon />}
                label={worker.email}
                variant="outlined"
                size="small"
              />
              {worker.phone && (
                <Chip
                  icon={<PhoneIcon />}
                  label={worker.phone}
                  variant="outlined"
                  size="small"
                />
              )}
              <Chip
                label={worker.workerProfile?.approvalStatus?.toUpperCase() || 'PENDING'}
                color={getStatusColor(worker.workerProfile?.approvalStatus)}
                size="small"
              />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <WorkIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Skills: {formatSkills(worker.workerProfile?.skills)}
            </Typography>
            
            {worker.workerProfile?.hourlyRate && (
              <Typography variant="body2" color="text.secondary">
                <ScheduleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                Rate: ${worker.workerProfile.hourlyRate}/hour
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {worker.workerProfile?.approvalStatus === 'pending' && hasPermission(['approve:workers']) && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<ApproveIcon />}
                    onClick={() => setApprovalDialog({ 
                      open: true, 
                      action: 'approved', 
                      worker 
                    })}
                    disabled={isUpdating}
                    fullWidth
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<RejectIcon />}
                    onClick={() => setApprovalDialog({ 
                      open: true, 
                      action: 'rejected', 
                      worker 
                    })}
                    disabled={isUpdating}
                    fullWidth
                  >
                    Reject
                  </Button>
                </>
              )}
              
              <Button
                variant="outlined"
                startIcon={<ViewIcon />}
                onClick={() => setSelectedWorker(worker)}
                fullWidth
              >
                View Details
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderWorkerTable = (workers, showActions = true) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Worker</TableCell>
            <TableCell>Contact</TableCell>
            <TableCell>Skills</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Registered</TableCell>
            {showActions && <TableCell>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {workers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} align="center">
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
                    <Typography variant="body2" fontWeight="medium">
                      {worker.name}
                    </Typography>
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
                      />
                    ))}
                    {worker.workerProfile?.skills?.length > 2 && (
                      <Chip
                        label={`+${worker.workerProfile.skills.length - 2}`}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    )}
                  </Box>
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
                    {format(new Date(worker.createdAt), 'MMM dd, yyyy')}
                  </Typography>
                </TableCell>
                {showActions && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {worker.workerProfile?.approvalStatus === 'pending' && hasPermission(['approve:workers']) && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => setApprovalDialog({ 
                                open: true, 
                                action: 'approved', 
                                worker 
                              })}
                              disabled={isUpdating}
                            >
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setApprovalDialog({ 
                                open: true, 
                                action: 'rejected', 
                                worker 
                              })}
                              disabled={isUpdating}
                            >
                              <RejectIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => setSelectedWorker(worker)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (!hasPermission(['manage:workers'])) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Alert severity="error">
          You don't have permission to manage worker approvals.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Worker Management
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Review and approve worker registrations. Self-registered workers require approval before they can access the system.
      </Typography>

      {/* Filter and Refresh */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => setFilter('pending')}
          disabled={filter === 'pending'}
        >
          Pending
        </Button>
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => setFilter('approved')}
          disabled={filter === 'approved'}
        >
          Approved
        </Button>
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => setFilter('rejected')}
          disabled={filter === 'rejected'}
        >
          Rejected
        </Button>
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => setFilter('all')}
          disabled={filter === 'all'}
        >
          All
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refetch}
        >
          Refresh
        </Button>
      </Box>

      {/* Worker List */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        renderWorkerTable(filteredWorkers)
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onClose={() => setApprovalDialog({ open: false, action: '', worker: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalDialog.action === 'approved' ? 'Approve Worker' : 'Reject Worker'}
        </DialogTitle>
        <DialogContent>
          {approvalDialog.worker && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>{approvalDialog.worker.name}</strong> ({approvalDialog.worker.email})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Are you sure you want to {approvalDialog.action === 'approved' ? 'approve' : 'reject'} this worker?
              </Typography>
            </Box>
          )}
          {approvalDialog.action === 'rejected' && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Rejection Reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter a reason for rejecting this worker..."
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog({ open: false, action: '', worker: null })} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            onClick={() => handleApproval(approvalDialog.worker._id, approvalDialog.action, rejectionReason)}
            variant="contained"
            color={approvalDialog.action === 'approved' ? 'success' : 'error'}
            disabled={isUpdating}
          >
            {isUpdating ? 'Processing...' : (approvalDialog.action === 'approved' ? 'Approve' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Worker Details Dialog */}
      <Dialog 
        open={!!selectedWorker} 
        onClose={() => setSelectedWorker(null)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">{selectedWorker?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Worker Details
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedWorker && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Contact Information
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <EmailIcon />
                      </ListItemIcon>
                      <ListItemText primary={selectedWorker.email} secondary="Email" />
                    </ListItem>
                    {selectedWorker.phone && (
                      <ListItem>
                        <ListItemIcon>
                          <PhoneIcon />
                        </ListItemIcon>
                        <ListItemText primary={selectedWorker.phone} secondary="Phone" />
                      </ListItem>
                    )}
                  </List>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Worker Profile
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <WorkIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={formatSkills(selectedWorker.workerProfile?.skills)} 
                        secondary="Skills" 
                      />
                    </ListItem>
                    {selectedWorker.workerProfile?.hourlyRate && (
                      <ListItem>
                        <ListItemIcon>
                          <ScheduleIcon />
                        </ListItemIcon>
                        <ListItemText 
                          primary={`$${selectedWorker.workerProfile.hourlyRate}/hour`} 
                          secondary="Hourly Rate" 
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Status Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                    <Chip
                      label={selectedWorker.workerProfile?.approvalStatus?.toUpperCase() || 'PENDING'}
                      color={getStatusColor(selectedWorker.workerProfile?.approvalStatus)}
                    />
                    <Chip
                      label={`Registered: ${format(new Date(selectedWorker.createdAt), 'MMM dd, yyyy')}`}
                      variant="outlined"
                    />
                  </Box>
                  
                  {selectedWorker.workerProfile?.approvedAt && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Approved: {format(new Date(selectedWorker.workerProfile.approvedAt), 'MMM dd, yyyy')}
                    </Typography>
                  )}
                  
                  {selectedWorker.workerProfile?.rejectionReason && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Rejection Reason:</strong> {selectedWorker.workerProfile.rejectionReason}
                      </Typography>
                    </Alert>
                  )}
                  
                  {selectedWorker.workerProfile?.notes && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Notes:</strong> {selectedWorker.workerProfile.notes}
                      </Typography>
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedWorker(null)}>
            Close
          </Button>
          {selectedWorker?.workerProfile?.approvalStatus === 'pending' && hasPermission(['approve:workers']) && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => {
                  setApprovalDialog({ 
                    open: true, 
                    action: 'approved', 
                    worker: selectedWorker 
                  });
                  setSelectedWorker(null);
                }}
                disabled={isUpdating}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => {
                  setApprovalDialog({ 
                    open: true, 
                    action: 'rejected', 
                    worker: selectedWorker 
                  });
                  setSelectedWorker(null);
                }}
                disabled={isUpdating}
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkerApproval;

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
  IconButton,
  Tooltip,
  Badge,
  Tabs,
  Tab
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

import { useGetWorkersQuery, useUpdateWorkerApprovalMutation } from '../../features/workers/workersApiSlice';
import { useAuth } from '../../hooks/useAuth';

const WorkerApproval = () => {
  const { hasPermission } = useAuth();
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Get workers with different approval statuses
  const { data: pendingWorkersData, isLoading: loadingPending } = useGetWorkersQuery({ approvalStatus: 'pending' });
  const { data: approvedWorkersData, isLoading: loadingApproved } = useGetWorkersQuery({ approvalStatus: 'approved' });
  const { data: rejectedWorkersData, isLoading: loadingRejected } = useGetWorkersQuery({ approvalStatus: 'rejected' });

  const [updateWorkerApproval, { isLoading: updating }] = useUpdateWorkerApprovalMutation();

  const pendingWorkers = pendingWorkersData?.data?.workers || [];
  const approvedWorkers = approvedWorkersData?.data?.workers || [];
  const rejectedWorkers = rejectedWorkersData?.data?.workers || [];

  const handleApprovalAction = (worker, action) => {
    setSelectedWorker(worker);
    setApprovalAction(action);
    setApprovalNotes('');
    setApprovalDialog(true);
  };

  const handleApprovalSubmit = async () => {
    if (!selectedWorker || !approvalAction) return;

    try {
      await updateWorkerApproval({
        id: selectedWorker._id,
        approvalStatus: approvalAction,
        notes: approvalNotes
      }).unwrap();

      toast.success(`Worker ${approvalAction === 'approved' ? 'approved' : 'rejected'} successfully`);
      setApprovalDialog(false);
      setSelectedWorker(null);
      setApprovalAction('');
      setApprovalNotes('');
    } catch (error) {
      console.error('Approval failed:', error);
      toast.error(error?.data?.message || 'Failed to update worker approval');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const renderWorkerCard = (worker) => (
    <Card key={worker._id} sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <PersonIcon />
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h6" gutterBottom>
              {worker.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EmailIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {worker.email}
                </Typography>
              </Box>
              {worker.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {worker.phone}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                label={worker.workerProfile?.approvalStatus?.toUpperCase() || 'PENDING'}
                color={getStatusColor(worker.workerProfile?.approvalStatus)}
                size="small"
              />
              <Typography variant="caption" color="text.secondary">
                Registered: {format(new Date(worker.createdAt), 'MMM dd, yyyy')}
              </Typography>
            </Box>
            {worker.workerProfile?.skills?.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <WorkIcon fontSize="small" color="action" />
                {worker.workerProfile.skills.map((skill, index) => (
                  <Chip
                    key={index}
                    label={skill.replace('_', ' ').toUpperCase()}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Box>
            )}
            {worker.workerProfile?.notes && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                "{worker.workerProfile.notes}"
              </Typography>
            )}
          </Grid>
          <Grid item>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {worker.workerProfile?.approvalStatus === 'pending' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<ApproveIcon />}
                    onClick={() => handleApprovalAction(worker, 'approved')}
                    size="small"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<RejectIcon />}
                    onClick={() => handleApprovalAction(worker, 'rejected')}
                    size="small"
                  >
                    Reject
                  </Button>
                </>
              )}
              {worker.workerProfile?.approvalStatus === 'approved' && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={() => handleApprovalAction(worker, 'rejected')}
                  size="small"
                >
                  Revoke
                </Button>
              )}
              {worker.workerProfile?.approvalStatus === 'rejected' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ApproveIcon />}
                  onClick={() => handleApprovalAction(worker, 'approved')}
                  size="small"
                >
                  Approve
                </Button>
              )}
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
                      {worker.workerProfile?.approvalStatus === 'approved' && (
                        <Tooltip title="Revoke Approval">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleApprovalAction(worker, 'rejected')}
                          >
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {worker.workerProfile?.approvalStatus === 'rejected' && (
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprovalAction(worker, 'approved')}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                      )}
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

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Badge badgeContent={pendingWorkers.length} color="warning">
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <ScheduleIcon />
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
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <ApproveIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{approvedWorkers.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Approved Workers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <RejectIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{rejectedWorkers.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rejected Workers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different worker statuses */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
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
          {tabValue === 0 && (
            <Box>
              {loadingPending ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : pendingWorkers.length > 0 ? (
                <>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {pendingWorkers.length} worker{pendingWorkers.length !== 1 ? 's' : ''} waiting for approval
                  </Alert>
                  {renderWorkerTable(pendingWorkers)}
                </>
              ) : (
                <Alert severity="success">
                  No pending worker approvals! All workers have been reviewed.
                </Alert>
              )}
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              {loadingApproved ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                renderWorkerTable(approvedWorkers)
              )}
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              {loadingRejected ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                renderWorkerTable(rejectedWorkers)
              )}
            </Box>
          )}
        </Box>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalAction === 'approved' ? 'Approve Worker' : 'Reject Worker'}
        </DialogTitle>
        <DialogContent>
          {selectedWorker && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>{selectedWorker.name}</strong> ({selectedWorker.email})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Are you sure you want to {approvalAction === 'approved' ? 'approve' : 'reject'} this worker?
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (optional)"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            placeholder={`Add a note about this ${approvalAction === 'approved' ? 'approval' : 'rejection'}...`}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            onClick={handleApprovalSubmit}
            variant="contained"
            color={approvalAction === 'approved' ? 'success' : 'error'}
            disabled={updating}
          >
            {updating ? 'Processing...' : (approvalAction === 'approved' ? 'Approve' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkerApproval;

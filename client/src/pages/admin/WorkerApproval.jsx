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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  ManageAccounts as ManagerIcon,
  SupervisorAccount as SupervisorIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

import { useGetUsersQuery, useUpdateUserMutation } from '../../features/users/usersApiSlice';
import { useAuth } from '../../hooks/useAuth';

const UserApproval = () => {
  const { user, hasPermission } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState({ 
    open: false, 
    action: '', 
    user: null, 
    assignedRole: 'worker' 
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [detailsDialog, setDetailsDialog] = useState(false);

  const { data: usersData, isLoading, error, refetch } = useGetUsersQuery();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  // Extract pending users from the response
  const pendingUsers = usersData?.data?.users?.filter(u => 
    u.role === 'pending' || u.approvalStatus === 'pending'
  ) || [];

  const handleApprovalAction = (targetUser, action, assignedRole = 'worker') => {
    setApprovalDialog({ 
      open: true, 
      action, 
      user: targetUser, 
      assignedRole 
    });
  };

  const handleApprovalSubmit = async () => {
    const { action, user: targetUser, assignedRole } = approvalDialog;
    
    try {
      const updateData = {
        approvalStatus: action === 'approve' ? 'approved' : 'rejected',
        isActive: action === 'approve',
      };

      if (action === 'approve') {
        updateData.role = assignedRole;
        // Initialize worker profile if assigning worker role
        if (assignedRole === 'worker') {
          updateData.workerProfile = {
            ...targetUser.workerProfile,
            status: 'active',
            approvalStatus: 'approved',
            notes: `Approved as ${assignedRole} by ${user.name} on ${format(new Date(), 'PPP')}`
          };
        }
      } else {
        updateData.rejectionReason = rejectionReason;
        if (targetUser.workerProfile) {
          updateData.workerProfile = {
            ...targetUser.workerProfile,
            status: 'inactive',
            approvalStatus: 'rejected',
            notes: `Rejected by ${user.name}: ${rejectionReason}`
          };
        }
      }

      await updateUser({ 
        id: targetUser._id, 
        ...updateData 
      }).unwrap();

      toast.success(`User ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      setApprovalDialog({ open: false, action: '', user: null, assignedRole: 'worker' });
      setRejectionReason('');
      refetch();
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(`Failed to ${action} user: ${error?.data?.message || error.message}`);
    }
  };

  const handleViewDetails = (targetUser) => {
    setSelectedUser(targetUser);
    setDetailsDialog(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error'
    };
    return colors[status] || 'default';
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <AdminIcon />;
      case 'manager': return <ManagerIcon />;
      case 'supervisor': return <SupervisorIcon />;
      case 'worker': return <WorkIcon />;
      default: return <PersonIcon />;
    }
  };

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
          Failed to load pending users: {error?.data?.message || error.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          🔐 User Registration Approvals
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Badge badgeContent={pendingUsers.length} color="warning">
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={refetch}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </Badge>
        </Box>
      </Box>

      {/* Security Notice */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>🚨 Security Notice</Typography>
        <Typography variant="body2">
          All new registrations require your approval. You control who gets access and what role they receive. 
          Review each request carefully before approving.
        </Typography>
      </Alert>

      {/* Pending Approvals */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pending User Registrations ({pendingUsers.length})
          </Typography>
          
          {pendingUsers.length === 0 ? (
            <Alert severity="success">
              <Typography>🎉 No pending registrations! All users have been processed.</Typography>
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Registration Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingUsers.map((pendingUser) => (
                    <TableRow key={pendingUser._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">{pendingUser.name}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              ID: {pendingUser._id.slice(-6)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <EmailIcon fontSize="small" />
                            <Typography variant="body2">{pendingUser.email}</Typography>
                          </Box>
                          {pendingUser.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PhoneIcon fontSize="small" />
                              <Typography variant="body2">{pendingUser.phone}</Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(pendingUser.createdAt), 'PPP')}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {format(new Date(pendingUser.createdAt), 'p')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="Pending Approval"
                          color="warning"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(pendingUser)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Approve as Worker">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApprovalAction(pendingUser, 'approve', 'worker')}
                            >
                              <WorkIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Approve as Supervisor">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleApprovalAction(pendingUser, 'approve', 'supervisor')}
                            >
                              <SupervisorIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Approve as Manager">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleApprovalAction(pendingUser, 'approve', 'manager')}
                            >
                              <ManagerIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleApprovalAction(pendingUser, 'reject')}
                            >
                              <RejectIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onClose={() => setApprovalDialog({ open: false, action: '', user: null, assignedRole: 'worker' })}>
        <DialogTitle>
          {approvalDialog.action === 'approve' ? '✅ Approve User' : '❌ Reject User'}
        </DialogTitle>
        <DialogContent>
          {approvalDialog.user && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">{approvalDialog.user.name}</Typography>
              <Typography variant="body2" color="textSecondary">
                {approvalDialog.user.email}
              </Typography>
            </Box>
          )}

          {approvalDialog.action === 'approve' ? (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Assign Role</InputLabel>
              <Select
                value={approvalDialog.assignedRole}
                label="Assign Role"
                onChange={(e) => setApprovalDialog(prev => ({ ...prev, assignedRole: e.target.value }))}
              >
                <MenuItem value="worker">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkIcon /> Worker
                  </Box>
                </MenuItem>
                <MenuItem value="supervisor">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SupervisorIcon /> Supervisor
                  </Box>
                </MenuItem>
                <MenuItem value="manager">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ManagerIcon /> Manager
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          ) : (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Rejection Reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              required
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog({ open: false, action: '', user: null, assignedRole: 'worker' })}>
            Cancel
          </Button>
          <Button
            onClick={handleApprovalSubmit}
            variant="contained"
            color={approvalDialog.action === 'approve' ? 'success' : 'error'}
            disabled={isUpdating || (approvalDialog.action === 'reject' && !rejectionReason.trim())}
          >
            {isUpdating ? <CircularProgress size={20} /> : 
             approvalDialog.action === 'approve' ? 'Approve User' : 'Reject User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>User Registration Details</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Full Name</Typography>
                <Typography>{selectedUser.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Email</Typography>
                <Typography>{selectedUser.email}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Phone</Typography>
                <Typography>{selectedUser.phone || 'Not provided'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Registration Date</Typography>
                <Typography>{format(new Date(selectedUser.createdAt), 'PPP p')}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Current Status</Typography>
                <Chip
                  label={selectedUser.approvalStatus || selectedUser.role}
                  color={getStatusColor(selectedUser.approvalStatus || selectedUser.role)}
                  size="small"
                />
              </Grid>
              {selectedUser.workerProfile?.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Notes</Typography>
                  <Typography>{selectedUser.workerProfile.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserApproval;

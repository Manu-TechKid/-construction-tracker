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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  Tab,
  Tabs,
  Fab
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  ManageAccounts as ManagerIcon,
  SupervisorAccount as SupervisorIcon,
  Add as AddIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { useGetUsersQuery, useUpdateUserMutation, useDeleteUserMutation, useCreateUserMutation } from '../../features/users/usersApiSlice';

const UserManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'worker',
    password: 'TempPass123!'
  });

  // API hooks
  const { data: usersData, isLoading, error, refetch } = useGetUsersQuery({});
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();

  const users = usersData?.data?.users || [];

  // Filter users by status
  const pendingUsers = users.filter(user => user.role === 'pending' || user.approvalStatus === 'pending');
  const approvedUsers = users.filter(user => user.role !== 'pending' && user.approvalStatus !== 'pending');
  const allUsers = users;

  const getUsersByTab = () => {
    switch (tabValue) {
      case 0: return pendingUsers;
      case 1: return approvedUsers;
      case 2: return allUsers;
      default: return [];
    }
  };

  const handleApprove = (user) => {
    setSelectedUser(user);
    setActionType('approve');
    setSelectedRole('worker'); // Default role
    setActionDialogOpen(true);
  };

  const handleReject = (user) => {
    setSelectedUser(user);
    setActionType('reject');
    setRejectionReason('');
    setActionDialogOpen(true);
  };

  const handleDelete = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setActionType('edit');
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedUser) return;

    try {
      if (actionType === 'approve') {
        await updateUser({
          id: selectedUser._id,
          userData: {
            role: selectedRole,
            isActive: true,
            approvalStatus: 'approved'
          }
        }).unwrap();
        toast.success(`User approved as ${selectedRole}`);
      } else if (actionType === 'reject') {
        await updateUser({
          id: selectedUser._id,
          userData: {
            approvalStatus: 'rejected',
            isActive: false,
            rejectionReason
          }
        }).unwrap();
        toast.success('User rejected');
      } else if (actionType === 'edit') {
        await updateUser({
          id: selectedUser._id,
          userData: {
            role: selectedRole,
            isActive: selectedRole !== 'pending'
          }
        }).unwrap();
        toast.success('User updated successfully');
      }

      setActionDialogOpen(false);
      setSelectedUser(null);
      refetch();
    } catch (error) {
      console.error('Action error:', error);
      toast.error(error?.data?.message || 'Action failed');
    }
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;

    try {
      await deleteUser(selectedUser._id).unwrap();
      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error?.data?.message || 'Delete failed');
    }
  };

  const handleCreateUser = async () => {
    try {
      await createUser({
        ...newUser,
        approvalStatus: 'approved',
        isActive: true
      }).unwrap();
      toast.success('User created successfully');
      setCreateDialogOpen(false);
      setNewUser({
        name: '',
        email: '',
        phone: '',
        role: 'worker',
        password: 'TempPass123!'
      });
      refetch();
    } catch (error) {
      console.error('Create error:', error);
      toast.error(error?.data?.message || 'Create failed');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <AdminIcon color="error" />;
      case 'manager': return <ManagerIcon color="warning" />;
      case 'supervisor': return <SupervisorIcon color="info" />;
      case 'worker': return <WorkIcon color="success" />;
      case 'pending': return <PersonIcon color="disabled" />;
      default: return <PersonIcon />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'supervisor': return 'info';
      case 'worker': return 'success';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (user) => {
    if (user.role === 'pending' || user.approvalStatus === 'pending') return 'warning';
    if (user.approvalStatus === 'rejected') return 'error';
    if (user.isActive) return 'success';
    return 'default';
  };

  const getStatusText = (user) => {
    if (user.role === 'pending' || user.approvalStatus === 'pending') return 'Pending';
    if (user.approvalStatus === 'rejected') return 'Rejected';
    if (user.isActive) return 'Active';
    return 'Inactive';
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
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={refetch}>
            <RefreshIcon /> Retry
          </Button>
        }>
          Error loading users: {error?.data?.message || 'Unknown error'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          👥 User Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            color="primary"
          >
            Create User
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refetch}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {pendingUsers.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Approval
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <PersonIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="success.main">
                    {approvedUsers.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Users
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <ApproveIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="primary.main">
                    {allUsers.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="info.main">
                    {users.filter(u => u.role === 'worker' && u.isActive).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Workers
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <WorkIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="fullWidth"
        >
          <Tab 
            label={
              <Badge badgeContent={pendingUsers.length} color="warning">
                Pending Approval
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={approvedUsers.length} color="success">
                Active Users
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={allUsers.length} color="primary">
                All Users
              </Badge>
            } 
          />
        </Tabs>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Registration Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getUsersByTab().map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: getRoleColor(user.role) + '.main' }}>
                          {getRoleIcon(user.role)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">{user.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {user._id.slice(-8)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2">{user.email}</Typography>
                        </Box>
                        {user.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PhoneIcon fontSize="small" color="action" />
                            <Typography variant="body2">{user.phone}</Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        color={getRoleColor(user.role)}
                        size="small"
                        icon={getRoleIcon(user.role)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(user)}
                        color={getStatusColor(user)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(user.createdAt), 'HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        {(user.role === 'pending' || user.approvalStatus === 'pending') && (
                          <>
                            <Tooltip title="Approve User">
                              <IconButton
                                color="success"
                                size="small"
                                onClick={() => handleApprove(user)}
                                disabled={isUpdating}
                              >
                                <ApproveIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject User">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleReject(user)}
                                disabled={isUpdating}
                              >
                                <RejectIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="Edit User">
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleEdit(user)}
                            disabled={isUpdating}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDelete(user)}
                            disabled={isDeleting || user.role === 'admin'}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {getUsersByTab().length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        No users found in this category
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Floating Action Button for Create User */}
      <Fab
        color="primary"
        aria-label="add user"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Action Dialog (Approve/Reject/Edit) */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'approve' && '✅ Approve User'}
          {actionType === 'reject' && '❌ Reject User'}
          {actionType === 'edit' && '✏️ Edit User'}
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                User: {selectedUser.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Email: {selectedUser.email}
              </Typography>
            </Box>
          )}

          {(actionType === 'approve' || actionType === 'edit') && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                label="Role"
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
                <MenuItem value="admin">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AdminIcon /> Admin
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          )}

          {actionType === 'reject' && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Rejection Reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              sx={{ mb: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmAction}
            variant="contained"
            disabled={isUpdating || (actionType === 'approve' && !selectedRole)}
            color={actionType === 'reject' ? 'error' : 'primary'}
          >
            {isUpdating ? <CircularProgress size={20} /> : 
             actionType === 'approve' ? 'Approve' : 
             actionType === 'reject' ? 'Reject' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>🗑️ Delete User</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. The user will be permanently deleted.
          </Alert>
          {selectedUser && (
            <Typography>
              Are you sure you want to delete <strong>{selectedUser.name}</strong>?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>➕ Create New User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Full Name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
            />
            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="worker">Worker</MenuItem>
                <MenuItem value="supervisor">Supervisor</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Temporary Password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              helperText="User should change this password on first login"
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={isCreating || !newUser.name || !newUser.email || !newUser.role}
          >
            {isCreating ? <CircularProgress size={20} /> : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagement;

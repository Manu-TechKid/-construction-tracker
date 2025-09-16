import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  TextField,
  MenuItem,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Menu,
  ListItemIcon,
  ListItemText,
  Paper,
  FormControl,
  InputLabel,
  Select,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon,
  Schedule as PendingIcon,
  PlayArrow as InProgressIcon,
  CheckCircle as CompletedIcon,
  Warning as OverdueIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useGetRemindersQuery, useDeleteReminderMutation, useUpdateReminderMutation } from '../../features/reminders/remindersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { toast } from 'react-toastify';
import { format, isAfter, isBefore, isToday } from 'date-fns';

const statusColors = {
  pending: 'warning',
  'in-progress': 'info',
  completed: 'success',
  overdue: 'error'
};

const priorityColors = {
  low: 'info',
  medium: 'warning',
  high: 'error'
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'pending': return <PendingIcon />;
    case 'in-progress': return <InProgressIcon />;
    case 'completed': return <CompletedIcon />;
    case 'overdue': return <OverdueIcon />;
    default: return <PendingIcon />;
  }
};

const Reminders = () => {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  
  // State management
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedReminder, setSelectedReminder] = useState(null);

  // API queries
  const { data: remindersData, isLoading, error, refetch } = useGetRemindersQuery({
    page: page + 1,
    limit: rowsPerPage,
    search: searchTerm,
    status: statusFilter,
    priority: priorityFilter,
    building: buildingFilter
  });
  
  const { data: buildingsData } = useGetBuildingsQuery();
  const [deleteReminder, { isLoading: isDeleting }] = useDeleteReminderMutation();
  const [updateReminder] = useUpdateReminderMutation();

  const reminders = remindersData?.data?.reminders || [];
  const totalCount = remindersData?.data?.totalCount || 0;
  const buildings = buildingsData?.data?.buildings || [];

  // Enhanced filtering and sorting
  const filteredReminders = useMemo(() => {
    let filtered = reminders;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(reminder => 
        reminder.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reminder.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reminder.building?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(reminder => {
        if (statusFilter === 'overdue') {
          return isAfter(new Date(), new Date(reminder.dueDate)) && reminder.status !== 'completed';
        }
        return reminder.status === statusFilter;
      });
    }

    // Apply priority filter
    if (priorityFilter) {
      filtered = filtered.filter(reminder => reminder.priority === priorityFilter);
    }

    // Apply building filter
    if (buildingFilter) {
      filtered = filtered.filter(reminder => reminder.building?._id === buildingFilter);
    }

    return filtered;
  }, [reminders, searchTerm, statusFilter, priorityFilter, buildingFilter]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event, reminder) => {
    setAnchorEl(event.currentTarget);
    setSelectedReminder(reminder);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedReminder(null);
  };

  const handleEdit = () => {
    if (selectedReminder) {
      navigate(`/reminders/${selectedReminder._id}/edit`);
    }
    handleMenuClose();
  };

  const handleView = () => {
    if (selectedReminder) {
      navigate(`/reminders/${selectedReminder._id}`);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setReminderToDelete(selectedReminder);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (reminderToDelete) {
      try {
        await deleteReminder(reminderToDelete._id).unwrap();
        toast.success('Reminder deleted successfully!');
        refetch();
      } catch (error) {
        console.error('Error deleting reminder:', error);
        toast.error('Failed to delete reminder');
      }
    }
    setDeleteDialogOpen(false);
    setReminderToDelete(null);
  };

  const handleStatusChange = async (reminderId, newStatus) => {
    try {
      await updateReminder({ id: reminderId, status: newStatus }).unwrap();
      toast.success('Reminder status updated!');
      refetch();
    } catch (error) {
      console.error('Error updating reminder status:', error);
      toast.error('Failed to update reminder status');
    }
  };

  const getReminderStatus = (reminder) => {
    if (reminder.status === 'completed') return 'completed';
    if (isAfter(new Date(), new Date(reminder.dueDate))) return 'overdue';
    return reminder.status;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setBuildingFilter('');
    setPage(0);
  };

  if (isLoading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          Error loading reminders: {error.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Reminders
            <Badge badgeContent={totalCount} color="primary" sx={{ ml: 2 }} />
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/reminders/create')}
          >
            Create Reminder
          </Button>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in-progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={priorityFilter}
                    label="Priority"
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Building</InputLabel>
                  <Select
                    value={buildingFilter}
                    label="Building"
                    onChange={(e) => setBuildingFilter(e.target.value)}
                  >
                    <MenuItem value="">All Buildings</MenuItem>
                    {buildings.map((building) => (
                      <MenuItem key={building._id} value={building._id}>
                        {building.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  startIcon={<FilterListIcon />}
                  fullWidth
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Reminders Table */}
        <Card>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Building</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReminders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No reminders found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReminders.map((reminder) => {
                    const status = getReminderStatus(reminder);
                    const isOverdue = status === 'overdue';
                    const isDueToday = isToday(new Date(reminder.dueDate));
                    
                    return (
                      <TableRow key={reminder._id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2">
                              {reminder.title}
                            </Typography>
                            {reminder.description && (
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {reminder.description.substring(0, 50)}...
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {reminder.building?.name || 'N/A'}
                          </Typography>
                          {reminder.apartment && (
                            <Typography variant="caption" color="text.secondary">
                              Apt: {reminder.apartment}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            color={isOverdue ? 'error' : isDueToday ? 'warning.main' : 'text.primary'}
                          >
                            {format(new Date(reminder.dueDate), 'MMM dd, yyyy')}
                          </Typography>
                          {isDueToday && (
                            <Typography variant="caption" color="warning.main">
                              Due Today
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(status)}
                            label={status.replace('-', ' ').toUpperCase()}
                            color={statusColors[status]}
                            size="small"
                            onClick={() => {
                              const nextStatus = status === 'pending' ? 'in-progress' : 
                                               status === 'in-progress' ? 'completed' : 'pending';
                              handleStatusChange(reminder._id, nextStatus);
                            }}
                            sx={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={reminder.priority.toUpperCase()}
                            color={priorityColors[reminder.priority]}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {reminder.category || 'Other'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, reminder)}
                            size="small"
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Reminder</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the reminder "{reminderToDelete?.title}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Reminders;

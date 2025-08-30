import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { useGetRemindersQuery, useDeleteReminderMutation } from '../../features/reminders/remindersApiSlice';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { toast } from 'react-toastify';

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

const Reminders = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  
  // State for filters and pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    building: '',
    search: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState(null);

  // Fetch reminders with filters
  const { 
    data: remindersData, 
    isLoading, 
    isError, 
    error 
  } = useGetRemindersQuery({
    page: page + 1,
    limit: rowsPerPage,
    ...filters
  });

  const [deleteReminder, { isLoading: isDeleting }] = useDeleteReminderMutation();

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(0);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const searchValue = e.target.search.value;
    setFilters(prev => ({
      ...prev,
      search: searchValue
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      building: '',
      search: ''
    });
    setPage(0);
  };

  const handleDeleteClick = (reminder) => {
    setReminderToDelete(reminder);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reminderToDelete) return;
    
    try {
      await deleteReminder(reminderToDelete._id).unwrap();
      toast.success('Reminder deleted successfully');
      setDeleteDialogOpen(false);
      setReminderToDelete(null);
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      const errorMessage = error?.data?.message || error?.message || 'Failed to delete reminder';
      toast.error(errorMessage);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setReminderToDelete(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.message || 'Failed to load reminders'}
        </Alert>
      </Container>
    );
  }

  const { reminders, total } = remindersData?.data || { reminders: [], total: 0 };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Reminders
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/reminders/new')}
          >
            New Reminder
          </Button>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <form onSubmit={handleSearch}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    name="search"
                    label="Search reminders..."
                    variant="outlined"
                    size="small"
                    InputProps={{
                      endAdornment: <SearchIcon color="action" />,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    select
                    fullWidth
                    name="status"
                    label="Status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    size="small"
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in-progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    select
                    fullWidth
                    name="priority"
                    label="Priority"
                    value={filters.priority}
                    onChange={handleFilterChange}
                    size="small"
                  >
                    <MenuItem value="">All Priorities</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<FilterListIcon />}
                    onClick={handleClearFilters}
                    size="small"
                  >
                    Clear Filters
                  </Button>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>

        {/* Reminders Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Building</TableCell>
                  <TableCell>Apartment</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reminders.length > 0 ? (
                  reminders.map((reminder) => (
                    <TableRow 
                      key={reminder._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/reminders/${reminder._id}`)}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Badge
                            color="primary"
                            variant="dot"
                            invisible={!reminder.isDueSoon}
                            sx={{ mr: 1 }}
                          >
                            <NotificationsIcon color="action" />
                          </Badge>
                          <Typography variant="body2">
                            {reminder.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {typeof reminder.building === 'object' 
                          ? reminder.building.name 
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{reminder.apartment || 'N/A'}</TableCell>
                      <TableCell>
                        {new Date(reminder.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={reminder.status} 
                          color={statusColors[reminder.status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={reminder.priority} 
                          color={priorityColors[reminder.priority] || 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/reminders/${reminder._id}/edit`);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(reminder);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box py={4}>
                        <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                          No reminders found
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => navigate('/reminders/new')}
                          sx={{ mt: 2 }}
                        >
                          Create Your First Reminder
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Reminder</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the reminder "{reminderToDelete?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Reminders;

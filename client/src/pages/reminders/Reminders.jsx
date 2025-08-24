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
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { useGetRemindersQuery } from '../../features/reminders/remindersApiSlice';
import { selectCurrentUser } from '../../features/auth/authSlice';

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

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">
          Error loading reminders: {error?.data?.message || 'Unknown error'}
        </Typography>
      </Box>
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
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No reminders found
                      </Typography>
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
    </Container>
  );
};

export default Reminders;

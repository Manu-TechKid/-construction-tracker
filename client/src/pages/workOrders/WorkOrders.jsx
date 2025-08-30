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
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Assignment as WorkOrderIcon,
  FilterList as FilterListIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  AssignmentLate as AssignmentLateIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  AssignmentReturned as AssignmentReturnedIcon,
} from '@mui/icons-material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, timeAgo } from '../../utils/dateUtils';
import { useBuildingContext } from '../../contexts/BuildingContext';

const WorkOrders = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { selectedBuilding, getBuildingFilterParams } = useBuildingContext();
  
  // State for search, filters, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignedTo: '',
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Fetch work orders data using same logic as dashboard
  const { 
    data: workOrdersData, 
    isLoading, 
    isError,
    error,
    refetch 
  } = useGetWorkOrdersQuery({
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
    search: searchTerm,
    ...filters,
    // Only apply building filter if a building is selected
    ...(selectedBuilding ? getBuildingFilterParams() : {}),
  });

  // Extract work orders array using dashboard logic
  const workOrders = workOrdersData?.data?.workOrders || workOrdersData?.data || [];
  const totalCount = workOrdersData?.pagination?.total || workOrdersData?.total || 0;

  // Debug log to see what data we're getting
  console.log('WorkOrders Debug:', {
    workOrdersData,
    workOrders,
    totalCount,
    selectedBuilding,
    filters,
    isLoading,
    isError,
    error
  });

  // Handle menu open
  const handleMenuOpen = (event, workOrder) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorkOrder(workOrder);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkOrder(null);
  };

  // Handle view work order
  const handleViewWorkOrder = (id) => {
    navigate(`/work-orders/${id}`);
    handleMenuClose();
  };

  // Handle edit work order
  const handleEditWorkOrder = (id) => {
    navigate(`/work-orders/${id}/edit`);
    handleMenuClose();
  };

  // Handle delete work order
  const handleDeleteWorkOrder = () => {
    // TODO: Implement delete functionality
    console.log('Delete work order:', selectedWorkOrder?._id);
    handleMenuClose();
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    // Reset to first page when searching
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  // Handle filter change
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value,
    }));
    // Reset to first page when filtering
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Pending', icon: <PendingIcon />, color: 'warning' },
    { value: 'in_progress', label: 'In Progress', icon: <AssignmentLateIcon />, color: 'info' },
    { value: 'on_hold', label: 'On Hold', icon: <AssignmentReturnedIcon />, color: 'default' },
    { value: 'completed', label: 'Completed', icon: <AssignmentTurnedInIcon />, color: 'success' },
  ];

  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'success' },
    { value: 'medium', label: 'Medium', color: 'warning' },
    { value: 'high', label: 'High', color: 'error' },
  ];

  // Columns for the DataGrid
  const columns = [
    {
      field: 'title',
      headerName: 'Work Order',
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <WorkOrderIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Box>
            <Typography variant="body2">{params.value}</Typography>
            <Typography variant="caption" color="text.secondary">
              #{params.row.workOrderNumber || params.row._id?.slice(-6)}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'building',
      headerName: 'Building',
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value?.name || 'N/A'}
        </Typography>
      ),
    },
    {
      field: 'assignedTo',
      headerName: 'Assigned To',
      flex: 1,
      renderCell: (params) => {
        const assignedTo = params.value || [];
        if (assignedTo.length === 0) return 'Unassigned';
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {assignedTo[0]?.avatar ? (
              <Avatar 
                src={assignedTo[0].avatar} 
                alt={assignedTo[0].name}
                sx={{ width: 24, height: 24, mr: 1 }}
              />
            ) : (
              <Avatar 
                sx={{ 
                  width: 24, 
                  height: 24, 
                  mr: 1,
                  bgcolor: 'primary.main',
                  fontSize: '0.75rem',
                }}
              >
                {assignedTo[0]?.name?.charAt(0) || '?'}
              </Avatar>
            )}
            <Typography variant="body2">
              {assignedTo[0]?.name || 'Unknown'}
              {assignedTo.length > 1 && ` +${assignedTo.length - 1}`}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'dueDate',
      headerName: 'Due Date',
      width: 150,
      renderCell: (params) => {
        const dueDate = new Date(params.value);
        const now = new Date();
        const isOverdue = dueDate < now && params.row.status !== 'completed';
        
        return (
          <Box>
            <Typography 
              variant="body2" 
              color={isOverdue ? 'error' : 'text.primary'}
              sx={{ fontWeight: isOverdue ? 500 : 'normal' }}
            >
              {formatDate(dueDate, 'short')}
            </Typography>
            {isOverdue && (
              <Typography variant="caption" color="error">
                Overdue
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => {
        const status = statusOptions.find(s => s.value === params.value) || 
                      { label: params.value, color: 'default' };
        
        return (
          <Chip
            icon={status.icon}
            label={status.label}
            color={status.color}
            size="small"
            variant="outlined"
            sx={{ textTransform: 'capitalize' }}
          />
        );
      },
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 120,
      renderCell: (params) => {
        const priority = priorityOptions.find(p => p.value === params.value) || 
                        { label: params.value, color: 'default' };
        
        return (
          <Chip
            label={priority.label}
            color={priority.color}
            size="small"
            variant="outlined"
            sx={{ textTransform: 'capitalize' }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={(e) => handleMenuOpen(e, params.row)}
            aria-label="actions"
          >
            <MoreVertIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  // Action menu
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <MenuItem onClick={() => handleViewWorkOrder(selectedWorkOrder?._id)}>
        <ListItemIcon>
          <VisibilityIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>View Details</ListItemText>
      </MenuItem>
      
      {hasPermission('update:work-orders') && (
        <MenuItem onClick={() => handleEditWorkOrder(selectedWorkOrder?._id)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
      )}
      
      {hasPermission('delete:work-orders') && (
        <>
          <Divider />
          <MenuItem onClick={handleDeleteWorkOrder}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ color: 'error' }}>
              Delete
            </ListItemText>
          </MenuItem>
        </>
      )}
    </Menu>
  );

  // Error state
  if (isError) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" gutterBottom>
            Error loading work orders: {error?.data?.message || 'Unknown error'}
          </Typography>
          <Button variant="contained" color="primary" onClick={refetch}>
            Retry
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title={
                <Box display="flex" alignItems="center">
                  <WorkOrderIcon sx={{ mr: 1 }} />
                  <Typography variant="h5" component="h1">
                    Work Orders
                  </Typography>
                </Box>
              }
              action={
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/work-orders/create')}
                >
                  New Work Order
                </Button>
              }
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <TextField
                  sx={{ flex: 1, minWidth: 250 }}
                  variant="outlined"
                  placeholder="Search work orders..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                
                <FormControl sx={{ minWidth: 180 }} size="small">
                  <InputLabel id="status-filter-label">Status</InputLabel>
                  <Select
                    labelId="status-filter-label"
                    id="status-filter"
                    value={filters.status}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    {statusOptions.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        <Box display="flex" alignItems="center">
                          <Box 
                            component="span" 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              bgcolor: theme.palette[status.color]?.main || theme.palette.grey[500],
                              borderRadius: '50%',
                              mr: 1,
                            }} 
                          />
                          {status.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl sx={{ minWidth: 150 }} size="small">
                  <InputLabel id="priority-filter-label">Priority</InputLabel>
                  <Select
                    labelId="priority-filter-label"
                    id="priority-filter"
                    value={filters.priority}
                    label="Priority"
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                  >
                    <MenuItem value="">All Priorities</MenuItem>
                    {priorityOptions.map((priority) => (
                      <MenuItem key={priority.value} value={priority.value}>
                        <Chip 
                          label={priority.label} 
                          size="small" 
                          color={priority.color}
                          variant="outlined"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={() => {}}
                  sx={{ ml: 'auto' }}
                >
                  More Filters
                </Button>
              </Box>

              <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                  rows={workOrders}
                  columns={columns}
                  loading={isLoading}
                  pageSizeOptions={[10, 25, 50]}
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  paginationMode="server"
                  rowCount={totalCount}
                  disableRowSelectionOnClick
                  disableColumnMenu
                  disableDensitySelector
                  slots={{
                    toolbar: GridToolbar,
                    noRowsOverlay: () => (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          p: 4,
                        }}
                      >
                        <WorkOrderIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                          No work orders found
                        </Typography>
                        {hasPermission('create:work-orders') && (
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/work-orders/create')}
                            sx={{ mt: 2 }}
                          >
                            Create Your First Work Order
                          </Button>
                        )}
                      </Box>
                    ),
                    loadingOverlay: LinearProgress,
                  }}
                  slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                      quickFilterProps: { debounceMs: 500 },
                    },
                  }}
                  sx={{
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: theme.palette.background.default,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    },
                    '& .MuiDataGrid-cell': {
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    },
                    '& .MuiDataGrid-row:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                    '& .MuiDataGrid-toolbarContainer': {
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      padding: theme.spacing(1, 2),
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {renderMenu}
    </Container>
  );
};

export default WorkOrders;

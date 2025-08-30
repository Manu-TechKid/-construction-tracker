import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
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
  useTheme,
  FormControl,
  InputLabel,
  Select,
  Avatar,
  Paper,
  LinearProgress,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as WorkOrderIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Work as WorkIcon,
  Pause as PauseIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useGetWorkOrdersQuery, useDeleteWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, timeAgo } from '../../utils/dateUtils';
import { toast } from 'react-toastify';

// Status options
const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'warning', icon: <PendingIcon /> },
  { value: 'in_progress', label: 'In Progress', color: 'info', icon: <WorkIcon /> },
  { value: 'on_hold', label: 'On Hold', color: 'default', icon: <PauseIcon /> },
  { value: 'completed', label: 'Completed', color: 'success', icon: <CheckCircleIcon /> },
  { value: 'cancelled', label: 'Cancelled', color: 'error', icon: <CancelIcon /> },
];

// Priority options
const priorityOptions = [
  { value: 'low', label: 'Low', color: 'success' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'high', label: 'High', color: 'error' },
  { value: 'urgent', label: 'Urgent', color: 'error' },
];

const WorkOrders = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // State for search, filters, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    building: '',
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
  });

  // Get work orders data with proper error handling
  const {
    data: workOrdersData,
    isLoading,
    isError,
    error,
    refetch
  } = useGetWorkOrdersQuery({
    page: pagination.page + 1,
    limit: pagination.pageSize,
    status: filters.status,
    priority: filters.priority,
    building: filters.building,
    search: searchTerm
  });

  console.log('WorkOrders Debug: Raw API response:', workOrdersData);

  // Extract work orders from response with multiple fallback patterns
  const workOrders = useMemo(() => {
    if (!workOrdersData) {
      console.log('WorkOrders Debug: No data received');
      return [];
    }

    // Handle different response structures
    let extractedData = [];
    if (Array.isArray(workOrdersData)) {
      extractedData = workOrdersData;
    } else if (workOrdersData.data?.workOrders) {
      extractedData = workOrdersData.data.workOrders;
    } else if (workOrdersData.workOrders) {
      extractedData = workOrdersData.workOrders;
    } else if (workOrdersData.data && Array.isArray(workOrdersData.data)) {
      extractedData = workOrdersData.data;
    }

    console.log('WorkOrders Debug: Extracted data:', extractedData);
    console.log('WorkOrders Debug: Data length:', extractedData.length);

    // Validate and clean the data
    const validWorkOrders = extractedData.filter(wo => wo && wo._id).map(wo => ({
      ...wo,
      // Ensure dates are properly formatted or null
      dueDate: wo.dueDate && !isNaN(new Date(wo.dueDate).getTime()) ? wo.dueDate : null,
      scheduledDate: wo.scheduledDate && !isNaN(new Date(wo.scheduledDate).getTime()) ? wo.scheduledDate : null,
      createdAt: wo.createdAt && !isNaN(new Date(wo.createdAt).getTime()) ? wo.createdAt : new Date().toISOString(),
      // Ensure assignedTo is always an array
      assignedTo: Array.isArray(wo.assignedTo) ? wo.assignedTo : []
    }));

    console.log('WorkOrders Debug: Valid work orders:', validWorkOrders);
    return validWorkOrders;
  }, [workOrdersData]);

  const totalCount = workOrdersData?.pagination?.total || workOrdersData?.total || 0;

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
  const [deleteWorkOrder, { isLoading: isDeleting }] = useDeleteWorkOrderMutation();
  const handleDeleteWorkOrder = async () => {
    try {
      await deleteWorkOrder(selectedWorkOrder?._id).unwrap();
      toast.success('Work order deleted successfully');
      refetch();
    } catch (error) {
      toast.error('Error deleting work order');
    }
    handleMenuClose();
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    // Reset to first page when searching
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  // Handle filter change
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value,
    }));
    // Reset to first page when filtering
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  // Columns for the DataGrid
  const columns = [
    {
      field: 'workOrder',
      headerName: 'Work Order',
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <WorkOrderIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="body2" fontWeight="medium">
              {params.row.workType} - {params.row.workSubType}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Apt {params.row.apartmentNumber}, Block {params.row.block}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            #{params.row._id?.slice(-6)}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'photos',
      headerName: 'Photos',
      width: 80,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {params.row.photos && params.row.photos.length > 0 ? (
            <Chip
              label={params.row.photos.length}
              size="small"
              color="primary"
              variant="outlined"
            />
          ) : (
            <Typography variant="caption" color="text.secondary">
              No photos
            </Typography>
          )}
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
        if (!params.value) {
          return <Typography variant="body2" color="text.secondary">No date</Typography>;
        }
        
        try {
          const dueDate = new Date(params.value);
          // Check if date is valid
          if (isNaN(dueDate.getTime())) {
            return <Typography variant="body2" color="text.secondary">Invalid date</Typography>;
          }
          
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
        } catch (error) {
          console.error('Date parsing error:', error, 'Value:', params.value);
          return <Typography variant="body2" color="text.secondary">Invalid date</Typography>;
        }
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

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography color="error" gutterBottom>
            Error loading work orders: {error?.data?.message || 'Unknown error'}
          </Typography>
          <Button variant="contained" color="primary" onClick={() => refetch()}>
            Retry
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center' }}>
          <WorkOrderIcon sx={{ mr: 2 }} />
          Work Orders
        </Typography>
        {hasPermission('create:work-orders') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/work-orders/create')}
          >
            New Work Order
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search work orders..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                label="Priority"
              >
                <MenuItem value="">All Priorities</MenuItem>
                {priorityOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              fullWidth
            >
              More Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={workOrders}
          columns={columns}
          getRowId={(row) => row._id}
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[5, 10, 25, 50]}
          checkboxSelection
          disableRowSelectionOnClick
          loading={isLoading}
          rowCount={totalCount}
          paginationMode="server"
          sortingMode="server"
          filterMode="server"
          sx={{
            height: 600,
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      </Paper>

      {renderMenu}
    </Container>
  );
};

export default WorkOrders;
    </Container>
  );
};

export default WorkOrders;
    </Container>
  );
};

export default WorkOrders;

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Alert,
  CircularProgress,
  ListItemIcon,
  ListItemText,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Work as WorkOrderIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

import {
  useGetWorkOrdersQuery,
  useDeleteWorkOrderMutation
} from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useAuth } from '../../hooks/useAuth';

// Status options
const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'warning', icon: <MoreVertIcon /> },
  { value: 'in_progress', label: 'In Progress', color: 'info', icon: <MoreVertIcon /> },
  { value: 'on_hold', label: 'On Hold', color: 'default', icon: <MoreVertIcon /> },
  { value: 'completed', label: 'Completed', color: 'success', icon: <MoreVertIcon /> },
  { value: 'cancelled', label: 'Cancelled', color: 'error', icon: <MoreVertIcon /> },
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
    search: searchTerm,
  });

  const { data: buildings = [] } = useGetBuildingsQuery();
  const [deleteWorkOrder, { isLoading: isDeleting }] = useDeleteWorkOrderMutation();

  console.log('WorkOrders Debug: Raw API response:', workOrdersData);

  // Extract work orders from API response with proper error handling
  const workOrders = useMemo(() => {
    if (!workOrdersData) return [];
    
    // Handle different response structures
    let orders = [];
    if (workOrdersData.data?.workOrders) {
      orders = workOrdersData.data.workOrders;
    } else if (Array.isArray(workOrdersData.data)) {
      orders = workOrdersData.data;
    } else if (Array.isArray(workOrdersData)) {
      orders = workOrdersData;
    }
    
    // Ensure each order has required fields with fallbacks
    return orders.map(order => ({
      ...order,
      id: order._id || order.id,
      workType: order.workType || 'N/A',
      workSubType: order.workSubType || 'N/A',
      apartmentNumber: order.apartmentNumber || 'N/A',
      block: order.block || 'N/A',
      apartmentStatus: order.apartmentStatus || 'vacant',
      priority: order.priority || 'medium',
      description: order.description || '',
      estimatedCost: order.estimatedCost || 0,
      photos: order.photos || [],
      createdAt: order.createdAt || new Date().toISOString(),
      building: order.building || {}
    }));
  }, [workOrdersData]);

  const totalCount = workOrdersData?.pagination?.total || workOrdersData?.total || 0;

  // Menu handlers
  const handleMenuOpen = (event, workOrder) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorkOrder(workOrder);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkOrder(null);
  };

  // Action handlers
  const handleView = useCallback((workOrder) => {
    navigate(`/work-orders/${workOrder._id}`);
  }, [navigate]);

  const handleEdit = useCallback((workOrder) => {
    navigate(`/work-orders/${workOrder._id}/edit`);
  }, [navigate]);

  const handleDelete = useCallback(async (workOrder) => {
    if (window.confirm(`Are you sure you want to delete this work order?`)) {
      try {
        await deleteWorkOrder(workOrder._id).unwrap();
        toast.success('Work order deleted successfully');
      } catch (error) {
        console.error('Failed to delete work order:', error);
        toast.error(error?.data?.message || 'Failed to delete work order');
      }
    }
  }, [deleteWorkOrder]);

  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Handle pagination changes
  const handlePaginationChange = (newPagination) => {
    setPagination(newPagination);
  };

  // Columns for the DataGrid
  const columns = [
    {
      field: 'workType',
      headerName: 'Work Type',
      width: 120,
      renderCell: (params) => {
        const workType = params.row?.workType || 'N/A';
        return (
          <Chip
            label={workType.charAt(0).toUpperCase() + workType.slice(1)}
            size="small"
            color="primary"
            variant="outlined"
          />
        );
      }
    },
    {
      field: 'workSubType',
      headerName: 'Service',
      width: 150,
      valueGetter: (params) => params.row?.workSubType || 'N/A'
    },
    {
      field: 'building',
      headerName: 'Building',
      width: 200,
      valueGetter: (params) => {
        const building = params.row?.building;
        if (typeof building === 'object' && building?.name) {
          return building.name;
        }
        return building || 'N/A';
      }
    },
    {
      field: 'apartmentDetails',
      headerName: 'Apartment',
      width: 120,
      valueGetter: (params) => {
        const apt = params.row?.apartmentNumber || 'N/A';
        const block = params.row?.block || 'N/A';
        return `${apt} - ${block}`;
      }
    },
    {
      field: 'apartmentStatus',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const status = params.row?.apartmentStatus || 'vacant';
        const statusColors = {
          vacant: 'default',
          occupied: 'success',
          under_renovation: 'warning',
          reserved: 'info'
        };
        return (
          <Chip
            label={status.replace('_', ' ').toUpperCase()}
            size="small"
            color={statusColors[status] || 'default'}
            variant="filled"
          />
        );
      }
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 100,
      renderCell: (params) => {
        const priority = params.row?.priority || 'medium';
        const priorityColors = {
          low: 'success',
          medium: 'warning',
          high: 'error',
          urgent: 'error'
        };
        return (
          <Chip
            label={priority.toUpperCase()}
            size="small"
            color={priorityColors[priority] || 'default'}
            variant={priority === 'urgent' ? 'filled' : 'outlined'}
          />
        );
      }
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 200,
      valueGetter: (params) => {
        const desc = params.row?.description || '';
        return desc.length > 50 ? desc.substring(0, 50) + '...' : desc;
      }
    },
    {
      field: 'estimatedCost',
      headerName: 'Est. Cost',
      width: 100,
      valueGetter: (params) => {
        const cost = params.row?.estimatedCost;
        return cost ? `$${cost.toFixed(2)}` : 'N/A';
      }
    },
    {
      field: 'photos',
      headerName: 'Photos',
      width: 80,
      renderCell: (params) => {
        const photoCount = params.row?.photos?.length || 0;
        return (
          <Chip
            label={photoCount}
            size="small"
            color={photoCount > 0 ? 'primary' : 'default'}
            variant="outlined"
          />
        );
      }
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 120,
      valueGetter: (params) => {
        try {
          const date = params.row?.createdAt;
          if (!date) return 'N/A';
          return format(new Date(date), 'MMM dd, yyyy');
        } catch (error) {
          console.error('Date formatting error:', error);
          return 'Invalid Date';
        }
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => handleView(params.row)}
            title="View Details"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleEdit(params.row)}
            title="Edit"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row)}
            title="Delete"
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )
    }
  ];

  // Action menu
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <MenuItem onClick={() => handleView(selectedWorkOrder)}>
        <ListItemIcon>
          <VisibilityIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>View Details</ListItemText>
      </MenuItem>
      
      {hasPermission('update:work-orders') && (
        <MenuItem onClick={() => handleEdit(selectedWorkOrder)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
      )}
      
      {hasPermission('delete:work-orders') && (
        <>
          <Divider />
          <MenuItem onClick={() => handleDelete(selectedWorkOrder)}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
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
        <Alert severity="error">
          Error loading work orders: {error?.data?.message || error?.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
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

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search work orders..."
            value={searchTerm}
            onChange={handleSearchChange}
            size="small"
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={filters.priority}
              label="Priority"
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {priorityOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Building</InputLabel>
            <Select
              value={filters.building}
              label="Building"
              onChange={(e) => handleFilterChange('building', e.target.value)}
            >
              <MenuItem value="">All Buildings</MenuItem>
              {buildings.map((building) => (
                <MenuItem key={building._id} value={building._id}>
                  {building.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={workOrders}
          columns={columns}
          getRowId={(row) => row._id || row.id}
          paginationMode="server"
          rowCount={totalCount}
          paginationModel={pagination}
          onPaginationModelChange={handlePaginationChange}
          pageSizeOptions={[5, 10, 25, 50]}
          loading={isLoading}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
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

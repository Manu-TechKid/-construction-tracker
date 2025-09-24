import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Visibility as ViewIcon,
  Schedule as PendingIcon,
  PlayArrow as InProgressIcon,
  CheckCircle as CompletedIcon,
  Pause as OnHoldIcon,
  Cancel as CancelledIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

const getStatusChipColor = (status) => {
  switch (status) {
    case 'completed': return 'success';
    case 'in_progress': return 'info';
    case 'on_hold': return 'warning';
    case 'cancelled': return 'error';
    case 'pending':
    default: return 'default';
  }
};

const getPriorityChipColor = (priority) => {
  switch (priority) {
    case 'high':
    case 'urgent': return 'error';
    case 'medium': return 'warning';
    case 'low':
    default: return 'success';
  }
};

const WorkOrders = () => {
  const navigate = useNavigate();
  const { data: workOrdersData, isLoading, error } = useGetWorkOrdersQuery();
  const { data: buildingsData } = useGetBuildingsQuery();
  const [updateWorkOrder] = useUpdateWorkOrderMutation();
  const { canViewCosts } = useAuth();

  const [filters, setFilters] = useState({ building: '', status: '' });
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);

  const handleFilterChange = useCallback((e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }, [filters]);

  const handleStatusClick = useCallback((event, workOrder) => {
    event.stopPropagation();
    setStatusMenuAnchor(event.currentTarget);
    setSelectedWorkOrder(workOrder);
  }, []);

  const handleStatusClose = useCallback(() => {
    setStatusMenuAnchor(null);
    setSelectedWorkOrder(null);
  }, []);

  const handleStatusUpdate = useCallback(async (newStatus) => {
    if (!selectedWorkOrder) return;
    
    try {
      await updateWorkOrder({
        id: selectedWorkOrder._id,
        status: newStatus
      }).unwrap();
      
      toast.success(`Work order status updated to ${newStatus}`, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
      });
      handleStatusClose();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update work order status', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [selectedWorkOrder, updateWorkOrder, handleStatusClose]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <PendingIcon />;
      case 'in_progress': return <InProgressIcon />;
      case 'completed': return <CompletedIcon />;
      case 'on_hold': return <OnHoldIcon />;
      case 'cancelled': return <CancelledIcon />;
      default: return <PendingIcon />;
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending', icon: <PendingIcon /> },
    { value: 'in_progress', label: 'In Progress', icon: <InProgressIcon /> },
    { value: 'completed', label: 'Completed', icon: <CompletedIcon /> },
    { value: 'on_hold', label: 'On Hold', icon: <OnHoldIcon /> },
    { value: 'cancelled', label: 'Cancelled', icon: <CancelledIcon /> },
  ];

  const workOrders = workOrdersData?.data || [];

  const filteredWorkOrders = useMemo(() => {
    return workOrders
      .filter(wo => {
        // Filter out invalid work orders
        if (!wo || typeof wo !== 'object' || !wo._id) {
          console.warn('Invalid work order found:', wo);
          return false;
        }

        try {
          // Validate essential fields
          if (wo.workType && typeof wo.workType === 'object' && !wo.workType.name && !wo.workType.code) {
            console.warn('Work order has invalid workType:', wo.workType);
          }
          if (wo.workSubType && typeof wo.workSubType === 'object' && !wo.workSubType.name && !wo.workSubType.code) {
            console.warn('Work order has invalid workSubType:', wo.workSubType);
          }
          if (wo.building && typeof wo.building === 'object' && !wo.building.name && !wo.building.code) {
            console.warn('Work order has invalid building:', wo.building);
          }
        } catch (error) {
          console.warn('Error validating work order:', wo._id, error);
          return false;
        }

        const buildingMatch = filters.building ? wo.building?._id === filters.building : true;
        const statusMatch = filters.status ? wo.status === filters.status : true;
        return buildingMatch && statusMatch;
      })
      .map(wo => ({
        ...wo,
        // Ensure photos is always an array
        photos: Array.isArray(wo.photos) ? wo.photos : [],
        // Ensure assignedTo is always an array
        assignedTo: Array.isArray(wo.assignedTo) ? wo.assignedTo : [],
        // Ensure other fields have safe defaults
        title: wo.title || 'Untitled Work Order',
        status: wo.status || 'pending',
        priority: wo.priority || 'normal',
        description: wo.description || '',
        scheduledDate: wo.scheduledDate || null,
        estimatedCost: wo.estimatedCost || 0,
        actualCost: wo.actualCost || 0,
        price: wo.estimatedCost || 0, // What we charge the customer
        cost: wo.actualCost || 0,     // What it costs us to provide the service
      }));
  }, [workOrders, filters]);

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error loading work orders.</Alert>;
  }


  const columns = [
    { field: 'title', headerName: 'Title', flex: 1 },
    { 
      field: 'description',
      headerName: 'Description',
      flex: 1.5,
      valueGetter: (params) => {
        try {
          return params.row.description || 'No description available';
        } catch (error) {
          console.warn('Error getting description:', error);
          return 'No description available';
        }
      },
    },
    { 
      field: 'building',
      headerName: 'Building',
      flex: 1,
      valueGetter: (params) => {
        try {
          // Handle different building data structures
          if (params.row.building?.name) {
            return params.row.building.name;
          } else if (params.row.building?.code) {
            return params.row.building.code;
          } else if (typeof params.row.building === 'string') {
            return params.row.building;
          } else {
            return 'N/A';
          }
        } catch (error) {
          console.warn('Error getting building value:', error);
          return 'N/A';
        }
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={params.value}
          color={getStatusChipColor(params.value)}
          size="small"
          onClick={(event) => handleStatusClick(event, params.row)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleStatusClick(event, params.row);
            }
          }}
          sx={{ 
            cursor: 'pointer',
            '&:hover': {
              opacity: 0.8,
              transform: 'scale(1.05)'
            },
            '&:focus': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: '2px'
            }
          }}
        />
      ),
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value}
          color={getPriorityChipColor(params.value)}
          size="small" 
        />
      ),
    },
    {
      field: 'photos',
      headerName: 'Photos',
      width: 100,
      renderCell: (params) => {
        const photos = params.row.photos || [];

        if (photos.length === 0) {
          return <Typography variant="body2" color="textSecondary">No photos</Typography>;
        }

        try {
          const firstPhoto = photos[0];
          let photoUrl = '';

          // Handle different photo data structures
          if (typeof firstPhoto === 'string') {
            photoUrl = firstPhoto;
          } else if (firstPhoto?.url) {
            photoUrl = firstPhoto.url;
          } else if (firstPhoto?.path) {
            photoUrl = firstPhoto.path;
          } else if (firstPhoto?.filename) {
            photoUrl = firstPhoto.filename;
          } else if (firstPhoto?.src) {
            photoUrl = firstPhoto.src;
          }

          // Clean the photo URL - remove any leading slashes or path prefixes
          photoUrl = photoUrl.replace(/^.*[\\\/]/, '').replace(/^uploads[\\\/]photos[\\\/]/, '');

          const baseUrl = process.env.REACT_APP_API_URL || window.location.origin;
          const fullPhotoUrl = `${baseUrl}/uploads/photos/${photoUrl}`;

          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                component="img"
                src={fullPhotoUrl}
                alt="Work order photo"
                sx={{
                  width: 40,
                  height: 40,
                  objectFit: 'cover',
                  borderRadius: 1,
                  border: '1px solid #ddd'
                }}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjVmNWY1Ii8+CjxwYXRoIGQ9Ik0yMCAyNUMyMi43NjE0IDI1IDI1IDIyLjc2MTQgMjUgMjBDMjUgMTcuMjM4NiAyMi43NjE0IDE1IDIwIDE1QzE3LjIzODYgMTUgMTUgMTcuMjM4NiAxNSAyMEMxNSAyMi43NjE0IDE3LjIzODYgMjUgMjAgMjVaIiBmaWxsPSIjY2NjIi8+Cjwvc3ZnPgo=';
                  e.target.style.border = '1px solid #ddd';
                }}
              />
              {photos.length > 1 && (
                <Typography variant="caption" color="textSecondary">
                  +{photos.length - 1}
                </Typography>
              )}
            </Box>
          );
        } catch (error) {
          console.warn('Error rendering photo in DataGrid:', error);
          return <Typography variant="body2" color="textSecondary">Error</Typography>;
        }
      },
    },
    {
      field: 'scheduledDate',
      headerName: 'Scheduled Date',
      width: 150,
      valueFormatter: (params) => {
        try {
          if (!params.value) return 'Not scheduled';
          const date = new Date(params.value);
          if (isNaN(date.getTime())) return 'Invalid date';
          return format(date, 'MM/dd/yyyy');
        } catch (error) {
          console.warn('Error formatting scheduled date:', error);
          return 'Error';
        }
      },
    },
    {
      field: 'assignedTo',
      headerName: 'Assigned To',
      flex: 1.5,
      valueGetter: (params) => {
        try {
          if (!params.row.assignedTo || !Array.isArray(params.row.assignedTo)) {
            return 'N/A';
          }

          return params.row.assignedTo
            .map(assignment => {
              if (assignment?.worker?.name) {
                return assignment.worker.name;
              } else if (assignment?.worker?.code) {
                return assignment.worker.code;
              } else if (typeof assignment?.worker === 'string') {
                return assignment.worker;
              } else {
                return 'Unknown Worker';
              }
            })
            .filter(name => name && name !== 'Unknown Worker')
            .join(', ') || 'N/A';
        } catch (error) {
          console.warn('Error getting assigned to value:', error);
          return 'N/A';
        }
      },
    },
    {
      field: 'apartmentNumber',
      headerName: 'Apartment',
      width: 120,
      valueGetter: (params) => params.row.apartmentNumber || 'N/A',
    },
    ...(canViewCosts() ? [
      {
        field: 'price',
        headerName: 'Price',
        width: 120,
        valueFormatter: (params) => {
          try {
            return `$${params.value?.toFixed(2) || '0.00'}`;
          } catch (error) {
            console.warn('Error formatting price:', error);
            return '$0.00';
          }
        },
      },
      {
        field: 'cost',
        headerName: 'Cost',
        width: 120,
        valueFormatter: (params) => {
          try {
            return `$${params.value?.toFixed(2) || '0.00'}`;
          } catch (error) {
            console.warn('Error formatting cost:', error);
            return '$0.00';
          }
        },
      },
    ] : []),
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Button
            startIcon={<ViewIcon />}
            onClick={() => navigate(`/work-orders/${params.row._id}`)}
          >
            View
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Work Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/work-orders/new')}
        >
          Create Work Order
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Filter by Building"
                name="building"
                value={filters.building}
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Buildings</MenuItem>
                {buildingsData?.data?.buildings.map(b => (
                  <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Filter by Status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <DataGrid
        rows={filteredWorkOrders}
        columns={columns}
        getRowId={(row) => row._id}
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
        disableSelectionOnClick
        loading={isLoading}
        autoHeight
        getRowHeight={() => 'auto'}
        sx={{
          '& .MuiDataGrid-cell': {
            padding: '8px',
          },
          '& .MuiDataGrid-row': {
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          },
        }}
        components={{
          NoRowsOverlay: () => (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              minHeight="200px"
            >
              <Typography variant="h6" color="textSecondary">
                No work orders found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {filters.building || filters.status
                  ? 'Try adjusting your filters'
                  : 'Create your first work order to get started'}
              </Typography>
            </Box>
          ),
          ErrorOverlay: () => (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              minHeight="200px"
            >
              <Typography variant="h6" color="error">
                Error displaying work orders
              </Typography>
              <Typography variant="body2" color="textSecondary">
                There was an error rendering the work orders. Please refresh the page.
              </Typography>
            </Box>
          ),
        }}
        onError={(error) => {
          console.error('DataGrid error:', error);
        }}
      />

      {/* Status Update Menu */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={handleStatusClose}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        {statusOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleStatusUpdate(option.value)}
            disabled={selectedWorkOrder?.status === option.value}
          >
            <ListItemIcon>
              {option.icon}
            </ListItemIcon>
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default WorkOrders;

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPhotoUrl } from '../../utils/photoUtils';
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
import { DataGrid } from '@mui/x-data-grid';
import { useGetWorkOrdersQuery, useUpdateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

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
    return workOrders.filter(wo => {
      const buildingMatch = filters.building ? wo.building?._id === filters.building : true;
      const statusMatch = filters.status ? wo.status === filters.status : true;
      return buildingMatch && statusMatch;
    });
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
      field: 'building',
      headerName: 'Building',
      flex: 1,
      valueGetter: (params) => params.row.building?.name || 'N/A',
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
          sx={{ 
            cursor: 'pointer',
            '&:hover': {
              opacity: 0.8,
              transform: 'scale(1.05)'
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
      field: 'scheduledDate',
      headerName: 'Scheduled Date',
      width: 150,
      valueFormatter: (params) => format(new Date(params.value), 'MM/dd/yyyy'),
    },
    {
      field: 'assignedTo',
      headerName: 'Assigned To',
      flex: 1.5,
      valueGetter: (params) => 
        params.row.assignedTo?.map(a => a.worker?.name || 'Unknown Worker').join(', ') || 'N/A',
    },
    {
      field: 'photos',
      headerName: 'Photos',
      flex: 0.6,
      minWidth: 80,
      sortable: false,
      renderCell: (params) => {
        const photos = Array.isArray(params.row.photos) ? params.row.photos : [];
        const photoCount = photos.length;
        
        if (photoCount === 0) {
          return (
            <Box 
              sx={{ 
                width: 50, 
                height: 50, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                bgcolor: 'grey.100', 
                borderRadius: '4px',
                border: '1px dashed #ddd'
              }}
            >
              <Typography variant="caption" color="textSecondary">No Photo</Typography>
            </Box>
          );
        }
        
        const firstPhoto = photos[0];
        const fullUrl = getPhotoUrl(firstPhoto);
        
        return (
          <Box 
            sx={{ 
              position: 'relative',
              width: 60, 
              height: 60, 
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                zIndex: 1
              }
            }}
            title={`${photoCount} photo${photoCount !== 1 ? 's' : ''} - Click to view`}
          >
            {/* Main Photo */}
            <Box
              component="img"
              src={fullUrl || '/img/placeholder.jpg'}
              alt="Work Order"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                '&:hover': {
                  cursor: 'pointer',
                  opacity: 0.9
                }
              }}
              onError={(e) => {
                console.log('Image load error for:', fullUrl);
                e.target.src = '/img/placeholder.jpg';
              }}
              onClick={() => {
                // TODO: Open photo gallery/modal
                console.log('View photos for work order:', params.row._id);
              }}
            />
            
            {/* Photo count badge */}
            {photoCount > 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  pointerEvents: 'none'
                }}
              >
                +{photoCount - 1}
              </Box>
            )}
          </Box>
        );
      },
    },
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

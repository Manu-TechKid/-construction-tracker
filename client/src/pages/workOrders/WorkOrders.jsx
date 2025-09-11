import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { format } from 'date-fns';

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

  const [filters, setFilters] = useState({ building: '', status: '' });

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

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
        params.row.assignedTo?.map(a => `${a.worker?.firstName} ${a.worker?.lastName}`).join(', ') || 'N/A',
    },
    {
      field: 'photos',
      headerName: 'Photo',
      flex: 0.5,
      sortable: false,
      renderCell: (params) => {
        const firstPhoto = params.row.photos?.[0];
        return firstPhoto ? (
          <img 
            src={firstPhoto.url} 
            alt="Work Order" 
            style={{ 
              width: 40, 
              height: 40, 
              objectFit: 'cover', 
              borderRadius: '4px',
              border: '1px solid #ddd'
            }} 
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <Box sx={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100', borderRadius: '4px' }}>
            <Typography variant="caption" color="textSecondary">No Photo</Typography>
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
    </Box>
  );
};

export default WorkOrders;

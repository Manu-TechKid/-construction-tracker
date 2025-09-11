import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';
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

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error loading work orders.</Alert>;
  }

  const workOrders = workOrdersData?.data || [];

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
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Button size="small" startIcon={<ViewIcon />} onClick={() => navigate(`/work-orders/${params.id}`)}>View</Button>
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

      <DataGrid
        rows={workOrders}
        columns={columns}
        getRowId={(row) => row._id}
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
        disableSelectionOnClick
        loading={isLoading}
      />
    </Box>
  );
};

export default WorkOrders;

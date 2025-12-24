import { Box, Typography, LinearProgress, useTheme } from '@mui/material';
import { CheckCircle, Warning, Error, Info } from '@mui/icons-material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';

const statusIcons = {
  operational: {
    icon: <CheckCircle color="success" />,
    color: 'success.main',
    label: 'Operational'
  },
  maintenance: {
    icon: <Warning color="warning" />,
    color: 'warning.main',
    label: 'Maintenance'
  },
  issue: {
    icon: <Error color="error" />,
    color: 'error.main',
    label: 'Issue'
  },
  planned: {
    icon: <Info color="info" />,
    color: 'info.main',
    label: 'Planned'
  }
};

const BuildingStatus = ({ buildings = [] }) => {
  const theme = useTheme();

  const columns = [
    {
      field: 'name',
      headerName: 'Building',
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Box sx={{ color: statusIcons[params.row.status]?.color || 'text.secondary', mr: 1 }}>
            {statusIcons[params.row.status]?.icon || <Info />}
          </Box>
          <Typography variant="body2" noWrap>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{
            color: statusIcons[params.value]?.color || 'text.secondary',
            textTransform: 'capitalize',
            fontWeight: 500,
          }}
        >
          {statusIcons[params.value]?.label || params.value}
        </Typography>
      ),
    },
    {
      field: 'workOrders',
      headerName: 'Work Orders',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {params.value} total
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={Math.min(100, (params.value / 10) * 100)} 
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                backgroundColor: params.value > 5 ? theme.palette.error.main : 
                                  params.value > 2 ? theme.palette.warning.main : 
                                  theme.palette.success.main,
              },
            }}
          />
        </Box>
      ),
    },
  ];

  if (buildings.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No building data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <DataGrid
        rows={buildings}
        columns={columns}
        pageSize={5}
        rowsPerPageOptions={[5]}
        disableSelectionOnClick
        disableColumnMenu
        hideFooterSelectedRowCount
        components={{
          Toolbar: GridToolbar,
        }}
        componentsProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
          },
        }}
        sx={{
          border: 'none',
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
  );
};

export default BuildingStatus;

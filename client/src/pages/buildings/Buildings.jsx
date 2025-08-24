import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  LinearProgress,
  Tooltip,
  Typography,
  useTheme,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Apartment as BuildingIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/dateUtils';

const Buildings = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // State for search, filters, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Fetch buildings data
  const {
    data: buildingsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetBuildingsQuery({
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
    search: searchTerm,
  });

  // Handle menu open
  const handleMenuOpen = (event, building) => {
    setAnchorEl(event.currentTarget);
    setSelectedBuilding(building);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBuilding(null);
  };

  // Handle view building
  const handleViewBuilding = (id) => {
    navigate(`/buildings/${id}`);
    handleMenuClose();
  };

  // Handle edit building
  const handleEditBuilding = (id) => {
    navigate(`/buildings/${id}/edit`);
    handleMenuClose();
  };

  // Handle delete building
  const handleDeleteBuilding = () => {
    // TODO: Implement delete functionality
    console.log('Delete building:', selectedBuilding?._id);
    handleMenuClose();
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    // Reset to first page when searching
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  // Columns for the DataGrid
  const columns = [
    {
      field: 'name',
      headerName: 'Building Name',
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BuildingIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'address',
      headerName: 'Address',
      flex: 1.5,
      renderCell: (params) => (
        <Typography variant="body2" noWrap>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'apartments',
      headerName: 'Apartments',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row.apartments?.length || 0}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        const status = params.value || 'active';
        const statusMap = {
          active: { label: 'Active', color: 'success' },
          maintenance: { label: 'Maintenance', color: 'warning' },
          inactive: { label: 'Inactive', color: 'error' },
        };
        
        const statusConfig = statusMap[status] || { label: status, color: 'default' };
        
        return (
          <Chip
            label={statusConfig.label}
            color={statusConfig.color}
            size="small"
            variant="outlined"
            sx={{ textTransform: 'capitalize' }}
          />
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(params.value, 'short')}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
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
      <MenuItem onClick={() => handleViewBuilding(selectedBuilding?._id)}>
        <ListItemIcon>
          <VisibilityIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>View Details</ListItemText>
      </MenuItem>
      
      {hasPermission('update:buildings') && (
        <MenuItem onClick={() => handleEditBuilding(selectedBuilding?._id)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
      )}
      
      {hasPermission('delete:buildings') && (
        <>
          <Divider />
          <MenuItem onClick={handleDeleteBuilding}>
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
            Error loading buildings: {error?.data?.message || 'Unknown error'}
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
                  <BuildingIcon sx={{ mr: 1 }} />
                  <Typography variant="h5" component="h1">
                    Buildings
                  </Typography>
                </Box>
              }
              action={
                hasPermission('create:buildings') && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/buildings/new')}
                  >
                    Add Building
                  </Button>
                )
              }
            />
            <CardContent>
              <Box sx={{ display: 'flex', mb: 3, gap: 2 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search buildings..."
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
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={() => {}}
                >
                  Filters
                </Button>
              </Box>

              <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                  rows={buildingsData?.data || []}
                  columns={columns}
                  loading={isLoading}
                  pageSizeOptions={[10, 25, 50]}
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  paginationMode="server"
                  rowCount={buildingsData?.pagination?.total || 0}
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
                        <BuildingIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                          No buildings found
                        </Typography>
                        {hasPermission('create:buildings') && (
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/buildings/new')}
                            sx={{ mt: 2 }}
                          >
                            Add Your First Building
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

export default Buildings;

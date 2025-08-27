import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import { useGetBuildingsQuery, useDeleteBuildingMutation } from '../../features/buildings/buildingsApiSlice';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/dateUtils';
import { toast } from 'react-toastify';

const Buildings = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // State for search, filters, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [apartmentFilter, setApartmentFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [buildingToDelete, setBuildingToDelete] = useState(null);
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

  const [deleteBuilding, { isLoading: isDeleting }] = useDeleteBuildingMutation();

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
    setBuildingToDelete(selectedBuilding);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  // Confirm delete building
  const handleConfirmDelete = async () => {
    if (!buildingToDelete) return;
    
    try {
      await deleteBuilding(buildingToDelete._id).unwrap();
      toast.success('Building deleted successfully');
      setDeleteDialogOpen(false);
      setBuildingToDelete(null);
    } catch (error) {
      console.error('Failed to delete building:', error);
      const errorMessage = error?.data?.message || error?.message || 'Failed to delete building';
      toast.error(errorMessage);
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setBuildingToDelete(null);
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
      headerName: t('buildings.columns.name'),
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
      headerName: t('buildings.columns.address'),
      flex: 1.5,
      renderCell: (params) => (
        <Typography variant="body2" noWrap>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'apartments',
      headerName: t('buildings.columns.apartments'),
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
      headerName: t('buildings.columns.status'),
      width: 130,
      renderCell: (params) => {
        const status = params.value || 'active';
        const statusMap = {
          active: { label: t('buildings.status.active'), color: 'success' },
          maintenance: { label: t('buildings.status.maintenance'), color: 'warning' },
          inactive: { label: t('buildings.status.inactive'), color: 'error' },
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
      headerName: t('buildings.columns.created'),
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(params.value, 'short')}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: t('buildings.columns.actions'),
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
        <ListItemText>{t('common.viewDetails')}</ListItemText>
      </MenuItem>
      
      {hasPermission('update:buildings') && (
        <MenuItem onClick={() => handleEditBuilding(selectedBuilding?._id)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('common.edit')}</ListItemText>
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
              {t('common.delete')}
            </ListItemText>
          </MenuItem>
        </>
      )}
    </Menu>
  );

  // Delete confirmation dialog
  const renderDeleteDialog = (
    <Dialog
      open={deleteDialogOpen}
      onClose={handleCancelDelete}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Delete Building</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete "{buildingToDelete?.name}"? This action cannot be undone and will also delete all associated apartments and work orders.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancelDelete} disabled={isDeleting}>
          Cancel
        </Button>
        <Button 
          onClick={handleConfirmDelete} 
          color="error"
          variant="contained"
          disabled={isDeleting}
          startIcon={isDeleting ? <CircularProgress size={16} /> : null}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Error state
  if (isError) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" gutterBottom>
            {t('buildings.errorLoading', { message: error?.data?.message || t('common.unknownError') })}
          </Typography>
          <Button variant="contained" color="primary" onClick={refetch}>
            {t('common.retry')}
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
                    {t('buildings.title')}
                  </Typography>
                </Box>
              }
              action={
                <Box display="flex" gap={2} flexWrap="wrap">
                  <TextField
                    fullWidth
                    placeholder={t('buildings.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      maxWidth: { xs: '100%', sm: 300 },
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'background.paper',
                      }
                    }}
                  />
                  
                  <TextField
                    select
                    label={t('buildings.filterByApartment')}
                    value={apartmentFilter}
                    onChange={(e) => setApartmentFilter(e.target.value)}
                    sx={{ 
                      minWidth: 150,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'background.paper',
                      }
                    }}
                  >
                    <MenuItem value="">{t('buildings.filters.allApartments')}</MenuItem>
                    <MenuItem value="vacant">{t('buildings.filters.vacant')}</MenuItem>
                    <MenuItem value="occupied">{t('buildings.filters.occupied')}</MenuItem>
                    <MenuItem value="under_renovation">{t('buildings.filters.underRenovation')}</MenuItem>
                    <MenuItem value="reserved">{t('buildings.filters.reserved')}</MenuItem>
                  </TextField>
                  
                  {hasPermission('create:buildings') && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/buildings/new')}
                    >
                      {t('buildings.addBuilding')}
                    </Button>
                  )}
                </Box>
              }
            />
            <CardContent>
              <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                  rows={buildingsData?.data?.buildings || []}
                  columns={columns}
                  loading={isLoading}
                  getRowId={(row) => row._id}
                  pageSizeOptions={[10, 25, 50]}
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  paginationMode="server"
                  rowCount={buildingsData?.total || 0}
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
                          {t('buildings.noBuildingsFound')}
                        </Typography>
                        {hasPermission('create:buildings') && (
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/buildings/new')}
                            sx={{ mt: 2 }}
                          >
                            {t('buildings.addFirstBuilding')}
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
      {renderDeleteDialog}
    </Container>
  );
};

export default Buildings;

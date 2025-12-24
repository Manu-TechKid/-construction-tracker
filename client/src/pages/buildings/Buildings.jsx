import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  FormControl,
  InputLabel,
  Select,
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
import { toast } from 'react-toastify';

const Buildings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [buildingToDelete, setBuildingToDelete] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const {
    data: buildingsData,
    isLoading,
    error,
    refetch
  } = useGetBuildingsQuery({
    search: searchTerm,
    // Remove status filter from API call - handle it in frontend
  });

  const [deleteBuilding, { isLoading: isDeleting }] = useDeleteBuildingMutation();

  const buildings = buildingsData?.data?.buildings || [];

  // Filter buildings on frontend if backend filtering isn't working
  const filteredBuildings = buildings.filter(building => {
    const matchesSearch = !searchTerm || 
      building.serviceManager ? `${building.name} - [${building.serviceManager}]` : building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (building.city && building.city.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
      building.status === statusFilter ||
      (statusFilter === 'active' && (!building.status || building.status === 'active'));
    
    return matchesSearch && matchesStatus;
  });

  const handleMenuOpen = (event, building) => {
    setAnchorEl(event.currentTarget);
    setSelectedBuilding(building);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBuilding(null);
  };

  const handleView = (building) => {
    navigate(`/buildings/${building._id}`);
    handleMenuClose();
  };

  const handleEdit = (building) => {
    navigate(`/buildings/${building._id}/edit`);
    handleMenuClose();
  };

  const handleDeleteClick = (building) => {
    setBuildingToDelete(building);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!buildingToDelete) return;
    
    try {
      await deleteBuilding(buildingToDelete._id).unwrap();
      toast.success(t('buildings.messages.deleted'));
      setDeleteDialogOpen(false);
      setBuildingToDelete(null);
    } catch (error) {
      console.error('Failed to delete building:', error);
      const errorMessage = error?.data?.message || error?.message || t('buildings.messages.error');
      toast.error(errorMessage);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setBuildingToDelete(null);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'maintenance':
        return 'warning';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      field: 'displayName',
      headerName: t('buildings.columns.name'),
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuildingIcon color="primary" />
          <Typography variant="body2" fontWeight="medium">
            {params.value || params.row.name}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'address',
      headerName: t('buildings.columns.address'),
      flex: 1,
      minWidth: 250,
    },
    {
      field: 'city',
      headerName: t('buildings.columns.city'),
      width: 150,
    },
    {
      field: 'apartments',
      headerName: t('buildings.columns.apartments'),
      width: 120,
      type: 'number',
      renderCell: (params) => (
        <Chip
          label={params.row.apartments?.length || 0}
          size="small"
          color="primary"
          variant="outlined"
        />
      ),
    },
    {
      field: 'status',
      headerName: t('buildings.columns.status'),
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value || 'Active'}
          size="small"
          color={getStatusColor(params.value)}
          variant="outlined"
        />
      ),
    },
    {
      field: 'actions',
      headerName: t('buildings.columns.actions'),
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton
          onClick={(event) => handleMenuOpen(event, params.row)}
          size="small"
        >
          <MoreVertIcon />
        </IconButton>
      ),
    },
  ];

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('errors.general')}
        </Alert>
        <Button variant="contained" onClick={refetch}>
          {t('common.retry')}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('buildings.title')}
        </Typography>
        {hasPermission('buildings', 'create') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/buildings/create')}
          >
            {t('buildings.create')}
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('common.filter')}</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label={t('common.filter')}
                >
                  <MenuItem value="all">{t('buildings.filter.all')}</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredBuildings}
          columns={columns}
          getRowId={(row) => row._id}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          sx={{
            '& .MuiDataGrid-cell:hover': {
              color: 'primary.main',
            },
          }}
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleView(selectedBuilding)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('common.view')}</ListItemText>
        </MenuItem>
        
        {hasPermission('buildings', 'update') && (
          <MenuItem onClick={() => handleEdit(selectedBuilding)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('common.edit')}</ListItemText>
          </MenuItem>
        )}
        
        {hasPermission('buildings', 'delete') && (
          <MenuItem onClick={() => handleDeleteClick(selectedBuilding)}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>
              {t('common.delete')}
            </ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('buildings.delete')}</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{buildingToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : null}
          >
            {isDeleting ? t('common.loading') : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Buildings;

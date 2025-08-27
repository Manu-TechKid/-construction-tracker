import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Chip, 
  Container, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider, 
  Grid, 
  IconButton, 
  Paper, 
  Tab, 
  Tabs, 
  Typography, 
  useTheme,
  Breadcrumbs,
  Link,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Tooltip,
  Badge,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Apartment as BuildingIcon,
  Home as ApartmentIcon,
  Work as WorkIcon,
  People as PeopleIcon,
  Info as InfoIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  Notifications as ReminderIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import ApartmentForm from '../../components/apartments/ApartmentForm';
import { useAuth } from '../../hooks/useAuth';
import { 
  useGetBuildingQuery,
  useDeleteApartmentMutation 
} from '../../features/buildings/buildingsApiSlice';
import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';
import { formatDate } from '../../utils/dateUtils';
import RemindersTab from './RemindersTab';

// Tab components
const BuildingInfoTab = ({ building }) => {
  const theme = useTheme();
  
  const infoItems = [
    { 
      icon: <InfoIcon color="primary" />, 
      primary: 'Status', 
      secondary: (
        <Chip 
          label={building.status || 'Active'} 
          color={building.status === 'active' ? 'success' : 'default'}
          size="small"
        />
      ) 
    },
    { 
      icon: <LocationIcon color="primary" />, 
      primary: 'Address', 
      secondary: building.address || 'Not specified' 
    },
    { 
      icon: <CalendarIcon color="primary" />, 
      primary: 'Created', 
      secondary: formatDate(building.createdAt, 'full') 
    },
    { 
      icon: <DescriptionIcon color="primary" />, 
      primary: 'Description', 
      secondary: building.description || 'No description available'
    },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Building Information
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <List>
          {infoItems.map((item, index) => (
            <ListItem key={index}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: theme.palette.background.default }}>
                  {item.icon}
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary={item.primary}
                primaryTypographyProps={{ variant: 'subtitle2' }}
                secondary={item.secondary}
                secondaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

const ApartmentsTab = ({ building }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [apartmentToDelete, setApartmentToDelete] = useState(null);
  
  const [deleteApartment] = useDeleteApartmentMutation();
  
  const handleViewApartmentReminders = (apartmentId, apartmentNumber) => {
    // Update URL with apartment ID and switch to reminders tab
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('apartment', apartmentId);
    window.location.hash = '#reminders';
    window.history.replaceState(null, '', `?${searchParams.toString()}#reminders`);
    
    // Force a reload to update the apartment context
    window.location.reload();
  };
  
  const handleAddApartment = () => {
    setSelectedApartment(null);
    setIsFormOpen(true);
  };
  
  const handleEditApartment = (apartment) => {
    setSelectedApartment(apartment);
    setIsFormOpen(true);
  };
  
  const handleDeleteClick = (apartment) => {
    setApartmentToDelete(apartment);
    setDeleteConfirmOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!apartmentToDelete) return;
    
    try {
      await deleteApartment({
        buildingId: building._id,
        apartmentId: apartmentToDelete._id
      }).unwrap();
      // Success will be handled by the invalidation in the mutation
    } catch (err) {
      console.error('Failed to delete apartment:', err);
    } finally {
      setDeleteConfirmOpen(false);
      setApartmentToDelete(null);
    }
  };
  
  const handleFormClose = (shouldRefresh) => {
    setIsFormOpen(false);
    setSelectedApartment(null);
    
    if (shouldRefresh) {
      // The invalidation in the mutation will trigger a refetch
      // No need to do anything else here
    }
  };

  const columns = [
    { 
      field: 'number', 
      headerName: 'Apartment', 
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ApartmentIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {params.row.number}
              {params.row.block && ` (Block ${params.row.block})`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.type ? params.row.type.charAt(0).toUpperCase() + params.row.type.slice(1) : 'N/A'}
              {params.row.area && ` • ${params.row.area} m²`}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { 
      field: 'floor', 
      headerName: 'Floor', 
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={`Floor ${params.value || 'N/A'}`} 
          size="small" 
          variant="outlined"
        />
      ),
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 140,
      renderCell: (params) => {
        const status = params.value || 'vacant';
        const statusMap = {
          occupied: { label: 'Occupied', color: 'success' },
          vacant: { label: 'Vacant', color: 'default' },
          under_renovation: { label: 'Under Renovation', color: 'warning' },
          reserved: { label: 'Reserved', color: 'info' },
        };
        
        const statusConfig = statusMap[status] || { label: status, color: 'default' };
        
        return (
          <Chip
            label={statusConfig.label}
            color={statusConfig.color}
            size="small"
            variant="outlined"
          />
        );
      },
    },
    { 
      field: 'details', 
      headerName: 'Details', 
      width: 150,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">
            {params.row.bedrooms || 0} bd • {params.row.bathrooms || 0} ba
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.area || 'N/A'} m²
          </Typography>
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Tooltip title="View Reminders">
            <IconButton 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleViewApartmentReminders(params.row._id, params.row.number);
              }}
            >
              <ReminderIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {hasPermission(['update:apartments']) && (
            <>
              <Tooltip title="Edit Apartment">
                <IconButton 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditApartment(params.row);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Delete Apartment">
                <IconButton 
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(params.row);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" component="span" sx={{ mr: 2 }}>
            Apartments
          </Typography>
          <Chip 
            label={`${building.apartments?.length || 0} total`} 
            size="small" 
            variant="outlined"
            color="default"
          />
        </Box>
        
        {hasPermission(['create:apartments']) && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddApartment}
          >
            Add Apartment
          </Button>
        )}
      </Box>
      
      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={building.apartments || []}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          disableColumnMenu
          hideFooterSelectedRowCount
          getRowId={(row) => row._id}
          sx={{
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: theme.palette.background.default,
              borderBottom: `1px solid ${theme.palette.divider}`,
            },
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${theme.palette.divider}`,
            },
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            },
          }}
          onRowClick={(params) => handleEditApartment(params.row)}
          components={{
            NoRowsOverlay: () => (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 4,
                }}
              >
                <ApartmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No apartments found for this building
                </Typography>
                {hasPermission(['create:apartments']) && (
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddApartment}
                    sx={{ mt: 1 }}
                  >
                    Add First Apartment
                  </Button>
                )}
              </Box>
            ),
          }}
        />
      </Box>
      
      {/* Apartment Form Dialog */}
      {building && (
        <ApartmentForm
          open={isFormOpen}
          onClose={handleFormClose}
          buildingId={building._id}
          apartment={selectedApartment}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Apartment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete apartment {apartmentToDelete?.number}? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const WorkOrdersTab = ({ buildingId }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data: workOrdersData, isLoading } = useGetWorkOrdersQuery({
    building: buildingId,
    limit: 5,
    sort: '-createdAt',
  });
  
  const workOrders = workOrdersData?.data || [];
  
  const handleCreateWorkOrder = () => {
    navigate(`/work-orders/new?building=${buildingId}`);
  };
  
  const columns = [
    { 
      field: 'title', 
      headerName: 'Work Order', 
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <WorkIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Box>
            <Typography variant="body2">{params.value}</Typography>
            <Typography variant="caption" color="text.secondary">
              #{params.row.workOrderNumber || params.row._id.slice(-6)}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      renderCell: (params) => {
        const statusMap = {
          completed: { label: 'Completed', color: 'success' },
          in_progress: { label: 'In Progress', color: 'warning' },
          pending: { label: 'Pending', color: 'error' },
          on_hold: { label: 'On Hold', color: 'info' },
        };
        
        const statusConfig = statusMap[params.value] || { label: params.value, color: 'default' };
        
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
      field: 'priority', 
      headerName: 'Priority', 
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small" 
          color={
            params.value === 'high' ? 'error' : 
            params.value === 'medium' ? 'warning' : 'default'
          }
          variant="outlined"
          sx={{ textTransform: 'capitalize' }}
        />
      ),
    },
    { 
      field: 'dueDate', 
      headerName: 'Due Date', 
      width: 150,
      valueFormatter: (params) => formatDate(params.value, 'short'),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Recent Work Orders</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleCreateWorkOrder}
        >
          Create Work Order
        </Button>
      </Box>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : workOrders.length > 0 ? (
        <Box sx={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={workOrders}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5]}
            disableSelectionOnClick
            disableColumnMenu
            hideFooterSelectedRowCount
            sx={{
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: theme.palette.background.default,
                borderBottom: `1px solid ${theme.palette.divider}`,
              },
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${theme.palette.divider}`,
              },
            }}
          />
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <WorkIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No work orders found for this building
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleCreateWorkOrder}
            sx={{ mt: 1 }}
          >
            Create First Work Order
          </Button>
        </Paper>
      )}
    </Box>
  );
};

const BuildingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { hasPermission } = useAuth();
  // Get apartment ID from URL if present
  const [apartmentId, setApartmentId] = useState(null);
  
  useEffect(() => {
    // Check URL for apartment ID
    const params = new URLSearchParams(window.location.search);
    const aptId = params.get('apartment');
    if (aptId) {
      setApartmentId(aptId);
    }
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    // Get the active tab from URL hash if present
    const hash = window.location.hash;
    if (hash === '#reminders') return 3;
    if (hash === '#work-orders') return 2;
    if (hash === '#apartments') return 1;
    return 0; // Default to info tab
  });
  
  // Fetch building data
  const { 
    data: buildingData, 
    isLoading, 
    isError, 
    error 
  } = useGetBuildingQuery(id);
  
  const building = buildingData?.data || null;
  
  console.log('BuildingDetails - buildingData:', buildingData);
  console.log('BuildingDetails - building:', building);
  console.log('BuildingDetails - building._id:', building?._id);

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Error state
  if (isError || !building) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          {error?.message || 'Building not found'}
        </Alert>
      </Container>
    );
  }
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Update URL hash without page reload
    let hash = '#';
    if (newValue === 3) hash = '#reminders';
    else if (newValue === 2) hash = '#work-orders';
    else if (newValue === 1) hash = '#apartments';
    window.history.replaceState(null, '', `${window.location.pathname}${hash}`);
  };
  
  // Handle edit building
  const handleEditBuilding = () => {
    navigate(`/buildings/${id}/edit`);
  };
  
  // Render tabs
  const tabs = [
    { 
      label: 'Info', 
      icon: <InfoIcon />,
      component: <BuildingInfoTab building={building} /> 
    },
    { 
      label: 'Apartments', 
      icon: <ApartmentIcon />,
      component: <ApartmentsTab building={building} /> 
    },
    { 
      label: 'Work Orders', 
      icon: <WorkIcon />,
      component: <WorkOrdersTab buildingId={id} /> 
    },
    { 
      label: apartmentId ? 'Apartment Reminders' : 'Reminders', 
      icon: building.reminders?.length > 0 ? (
        <Badge badgeContent={building.reminders.length} color="error">
          <ReminderIcon />
        </Badge>
      ) : (
        <ReminderIcon />
      ),
      component: <RemindersTab buildingId={id} apartmentId={apartmentId} />,
      badge: building.reminders?.length > 0 ? building.reminders.length : null,
      hidden: apartmentId && activeTab !== 3 // Hide if apartment context but not on reminders tab
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 1 }}
        >
          Back
        </Button>
        
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/buildings" color="inherit">
            Buildings
          </Link>
          <Typography color="text.primary">{building.name || 'Loading...'}</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BuildingIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Box>
              <Typography variant="h4" component="h1">
                {building.name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {building.address}
              </Typography>
            </Box>
          </Box>
          
          {hasPermission('update:buildings') && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
              onClick={handleEditBuilding}
            >
              Edit Building
            </Button>
          )}
        </Box>
        
        <Card variant="outlined">
          <CardContent sx={{ p: 0 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="building details tabs"
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
            >
              {tabs.map((tab, index) => (
                <Tab 
                  key={index}
                  icon={tab.icon}
                  label={
                    <Box display="flex" alignItems="center">
                      <Box>{tab.label}</Box>
                      {tab.badge && (
                        <Chip 
                          label={tab.badge} 
                          size="small" 
                          color="error" 
                          sx={{ 
                            ml: 1, 
                            height: 20, 
                            fontSize: '0.7rem',
                            '& .MuiChip-label': {
                              px: 0.5
                            }
                          }} 
                        />
                      )}
                    </Box>
                  }
                  sx={{
                    display: tab.hidden ? 'none' : 'flex',
                    minHeight: 48,
                    '&.Mui-selected': {
                      color: 'primary.main',
                      fontWeight: 'medium',
                    },
                  }}
                />
              ))}
            </Tabs>
            
            <Box sx={{ p: 3 }}>
              {tabs[activeTab].component}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default BuildingDetails;

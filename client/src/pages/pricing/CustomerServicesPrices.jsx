import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  TextField,
  MenuItem,
  Button,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

import {
  useGetClientPricingListQuery,
  useGetBuildingClientPricingQuery,
  useAddPricingServiceMutation,
  useUpdatePricingServiceMutation,
  useRemovePricingServiceMutation,
  useCreateClientPricingMutation,
} from '../../features/clientPricing/clientPricingApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import {
  useGetWorkTypesQuery,
  useGetWorkSubTypesQuery,
} from '../../features/setup/setupApiSlice';

const unitTypes = [
  { value: 'per_room', label: 'Per Room' },
  { value: 'per_sqft', label: 'Per Sq Ft' },
  { value: 'per_apartment', label: 'Per Apartment' },
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'fixed', label: 'Fixed' },
];

const defaultServiceForm = {
  category: '',
  subcategory: '',
  name: '',
  description: '',
  basePrice: '0',
  unitType: 'per_apartment',
  minimumCharge: '0',
  maximumCharge: '',
  laborCost: '0',
  materialCost: '0',
  equipmentCost: '0',
  overheadPercentage: '15',
  isActive: true,
};

function CustomToolbar({ onRefresh, onAddService }) {
  return (
    <GridToolbarContainer>
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
      <Button
        startIcon={<RefreshIcon />}
        onClick={onRefresh}
        size="small"
      >
        Refresh
      </Button>
      <Button
        startIcon={<AddIcon />}
        onClick={onAddService}
        variant="contained"
        size="small"
        sx={{ ml: 1 }}
      >
        Add Service
      </Button>
    </GridToolbarContainer>
  );
}

const CustomerServicesPrices = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    building: '',
    category: '',
  });

  // Handle URL parameters for pre-filtering
  useEffect(() => {
    const buildingParam = searchParams.get('building');
    if (buildingParam) {
      setFilters(prev => ({ ...prev, building: buildingParam }));
    }
  }, [searchParams]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState(defaultServiceForm);
  const [selectedBuilding, setSelectedBuilding] = useState('');

  // API hooks
  const { data: buildingsData, isLoading: isLoadingBuildings } = useGetBuildingsQuery();
  const { data: workTypesData, isLoading: isLoadingWorkTypes } = useGetWorkTypesQuery();
  const { data: workSubTypesData, isLoading: isLoadingWorkSubTypes } = useGetWorkSubTypesQuery(
    serviceForm.category || undefined
  );
  
  const { 
    data: pricingData, 
    isLoading: isLoadingPricing, 
    refetch: refetchPricing 
  } = useGetClientPricingListQuery({
    building: filters.building,
    category: filters.category,
    isActive: true,
  });

  const [addPricingService, { isLoading: isAddingService }] = useAddPricingServiceMutation();
  const [updatePricingService, { isLoading: isUpdatingService }] = useUpdatePricingServiceMutation();
  const [removePricingService, { isLoading: isRemovingService }] = useRemovePricingServiceMutation();
  const [createClientPricing, { isLoading: isCreatingPricing }] = useCreateClientPricingMutation();

  // Prepare data for DataGrid
  const rows = useMemo(() => {
    if (!pricingData?.data?.clientPricing) return [];

    const services = [];
    pricingData.data.clientPricing.forEach((pricing) => {
      pricing.services?.forEach((service) => {
        if (service.isActive) {
          services.push({
            id: `${pricing._id}-${service._id}`,
            pricingId: pricing._id,
            serviceId: service._id,
            buildingName: pricing.building?.name || 'Unknown Building',
            buildingId: pricing.building?._id,
            companyName: pricing.company?.name || 'Unknown Company',
            category: service.category,
            subcategory: service.subcategory,
            name: service.name,
            description: service.description || '',
            basePrice: service.pricing?.basePrice || 0,
            unitType: service.pricing?.unitType || 'per_apartment',
            minimumCharge: service.pricing?.minimumCharge || 0,
            maximumCharge: service.pricing?.maximumCharge || 0,
            laborCost: service.cost?.laborCost || 0,
            materialCost: service.cost?.materialCost || 0,
            equipmentCost: service.cost?.equipmentCost || 0,
            overheadPercentage: service.cost?.overheadPercentage || 0,
            totalCost: (service.cost?.laborCost || 0) + 
                      (service.cost?.materialCost || 0) + 
                      (service.cost?.equipmentCost || 0),
            service: service, // Keep original service object for editing
          });
        }
      });
    });

    return services;
  }, [pricingData]);

  const buildings = buildingsData?.data?.buildings || [];
  const workTypes = workTypesData?.data?.workTypes || [];
  const workSubTypes = workSubTypesData?.data?.workSubTypes || [];

  // Prepare categories for filter dropdown (use code for filtering)
  const serviceCategories = useMemo(() => {
    const categories = [{ value: '', label: 'All Categories' }];
    workTypes.forEach(workType => {
      categories.push({
        value: workType.code, // Use code for filtering to match service.category
        label: workType.name,
        code: workType.code
      });
    });
    return categories;
  }, [workTypes]);

  // Prepare categories for form dropdown (use _id for subcategory fetching)
  const formCategories = useMemo(() => {
    return workTypes.map(workType => ({
      value: workType._id, // Use _id for subcategory fetching
      label: workType.name,
      code: workType.code
    }));
  }, [workTypes]);

  // Prepare subcategories for form dropdown
  const serviceSubCategories = useMemo(() => {
    if (!serviceForm.category) return [];
    return workSubTypes.map(subType => ({
      value: subType.code || subType._id,
      label: subType.name,
      code: subType.code
    }));
  }, [workSubTypes, serviceForm.category]);

  const columns = [
    {
      field: 'buildingName',
      headerName: 'Customer/Building',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.row.buildingName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.companyName}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'category',
      headerName: 'Service Category',
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small" 
          variant="outlined"
          sx={{ textTransform: 'capitalize' }}
        />
      ),
    },
    {
      field: 'subcategory',
      headerName: 'Subtype',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'name',
      headerName: 'Definition',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          {params.row.description && (
            <Typography variant="caption" color="text.secondary">
              {params.row.description}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'basePrice',
      headerName: 'Price',
      width: 100,
      type: 'number',
      renderCell: (params) => (
        <Box textAlign="right">
          <Typography variant="body2" fontWeight="medium">
            ${params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.unitType.replace('_', ' ')}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'totalCost',
      headerName: 'Cost',
      width: 100,
      type: 'number',
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          ${params.value.toFixed(2)}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Edit service">
            <IconButton
              size="small"
              onClick={() => handleEditService(params.row)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete service">
            <IconButton
              size="small"
              onClick={() => handleDeleteService(params.row)}
              disabled={isRemovingService}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const handleFilterChange = async (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    
    // Auto-load subtypes when both building and category are selected
    if (field === 'category' && filters.building && value) {
      await handleAutoLoadSubtypes(filters.building, value);
    } else if (field === 'building' && filters.category && value) {
      await handleAutoLoadSubtypes(value, filters.category);
    }
  };

  const handleAutoLoadSubtypes = async (buildingId, categoryCode) => {
    try {
      // Find the WorkType by code to get its _id for fetching subtypes
      const selectedWorkType = workTypes.find(wt => wt.code === categoryCode);
      if (!selectedWorkType) return;

      // Fetch subtypes for this category
      const subtypesResponse = await fetch(`${process.env.REACT_APP_API_URL}/setup/work-subtypes?workType=${selectedWorkType._id}`);
      const subtypesData = await subtypesResponse.json();
      
      if (!subtypesData.success) return;

      const subtypes = subtypesData.data.workSubTypes || [];
      
      // Check if pricing config exists for this building
      let buildingPricing = pricingData?.data?.clientPricing?.find(
        p => p.building?._id === buildingId
      );
      
      if (!buildingPricing) {
        // Create new pricing configuration
        const selectedBuildingData = buildings.find(b => b._id === buildingId);
        const newPricingConfig = {
          company: {
            name: selectedBuildingData?.name || 'Default Company',
            type: 'other'
          },
          building: buildingId,
          services: [],
          terms: {
            paymentTerms: 'net_30',
            discountPercentage: 0,
            bulkDiscountThreshold: 0,
            specialInstructions: ''
          },
          isActive: true
        };

        const createdPricing = await createClientPricing(newPricingConfig).unwrap();
        buildingPricing = createdPricing.data.clientPricing;
      }

      // Add services for each subtype that doesn't already exist
      for (const subtype of subtypes) {
        const existingService = buildingPricing.services?.find(
          s => s.category === categoryCode && s.subcategory === subtype.code
        );
        
        if (!existingService) {
          const servicePayload = {
            category: categoryCode,
            subcategory: subtype.code,
            name: subtype.name,
            description: subtype.description || '',
            pricing: {
              basePrice: 0, // Default price - user will set this
              unitType: 'per_apartment',
              minimumCharge: 0,
            },
            cost: {
              laborCost: 0,
              materialCost: 0,
              equipmentCost: 0,
              overheadPercentage: 15,
            },
            specifications: {
              estimatedDuration: subtype.estimatedDuration || 1,
              workersRequired: 1,
              materialsIncluded: true,
              equipmentIncluded: true,
              notes: ''
            },
            isActive: true,
          };

          await addPricingService({
            pricingId: buildingPricing._id,
            service: servicePayload,
          }).unwrap();
        }
      }

      // Refresh the pricing data
      refetchPricing();
      toast.success(`Auto-loaded ${subtypes.length} ${selectedWorkType.name} services for ${buildings.find(b => b._id === buildingId)?.name}`);
      
    } catch (error) {
      console.error('Failed to auto-load subtypes:', error);
      toast.error('Failed to auto-load services');
    }
  };

  const handleEditService = (row) => {
    setEditingService(row);
    setSelectedBuilding(row.buildingId);
    setServiceForm({
      category: row.service.category || 'other',
      subcategory: row.service.subcategory || '',
      name: row.service.name || '',
      description: row.service.description || '',
      basePrice: row.service.pricing?.basePrice?.toString() || '0',
      unitType: row.service.pricing?.unitType || 'per_apartment',
      minimumCharge: row.service.pricing?.minimumCharge?.toString() || '0',
      maximumCharge: row.service.pricing?.maximumCharge?.toString() || '',
      laborCost: row.service.cost?.laborCost?.toString() || '0',
      materialCost: row.service.cost?.materialCost?.toString() || '0',
      equipmentCost: row.service.cost?.equipmentCost?.toString() || '0',
      overheadPercentage: row.service.cost?.overheadPercentage?.toString() || '15',
      isActive: row.service.isActive ?? true,
    });
    setServiceDialogOpen(true);
  };

  const handleAddService = () => {
    setEditingService(null);
    setServiceForm(defaultServiceForm);
    setSelectedBuilding('');
    setServiceDialogOpen(true);
  };

  const handleDeleteService = async (row) => {
    if (!window.confirm(`Delete service "${row.name}" from ${row.buildingName}?`)) {
      return;
    }

    try {
      await removePricingService({
        pricingId: row.pricingId,
        serviceId: row.serviceId,
      }).unwrap();
      toast.success('Service deleted successfully');
      refetchPricing();
    } catch (error) {
      console.error('Failed to delete service:', error);
      toast.error(error?.data?.message || 'Failed to delete service');
    }
  };

  const handleSaveService = async () => {
    if (!selectedBuilding) {
      toast.error('Please select a building/customer');
      return;
    }

    if (!serviceForm.name.trim()) {
      toast.error('Service name is required');
      return;
    }

    if (!serviceForm.subcategory.trim()) {
      toast.error('Sub-category is required');
      return;
    }

    if (!serviceForm.basePrice || Number(serviceForm.basePrice) <= 0) {
      toast.error('Base price must be greater than 0');
      return;
    }

    try {
      // Find the selected work type for category mapping
      const selectedWorkType = workTypes.find(wt => wt._id === serviceForm.category);
      
      const payload = {
        category: selectedWorkType?.code || serviceForm.category,
        subcategory: serviceForm.subcategory.trim(),
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim() || '',
        pricing: {
          basePrice: Number(serviceForm.basePrice) || 0,
          unitType: serviceForm.unitType,
          minimumCharge: serviceForm.minimumCharge === '' ? 0 : Number(serviceForm.minimumCharge),
          maximumCharge: serviceForm.maximumCharge === '' ? undefined : Number(serviceForm.maximumCharge),
        },
        cost: {
          laborCost: Number(serviceForm.laborCost) || 0,
          materialCost: Number(serviceForm.materialCost) || 0,
          equipmentCost: Number(serviceForm.equipmentCost) || 0,
          overheadPercentage: Number(serviceForm.overheadPercentage) || 0,
        },
        specifications: {
          estimatedDuration: 1,
          workersRequired: 1,
          materialsIncluded: true,
          equipmentIncluded: true,
          notes: ''
        },
        isActive: serviceForm.isActive,
      };

      if (payload.pricing.maximumCharge === undefined) {
        delete payload.pricing.maximumCharge;
      }

      console.log('Service payload:', payload);

      if (editingService) {
        await updatePricingService({
          pricingId: editingService.pricingId,
          serviceId: editingService.serviceId,
          service: payload,
        }).unwrap();
        toast.success('Service updated successfully');
      } else {
        // For new services, find or create pricing config for the selected building
        let buildingPricing = pricingData?.data?.clientPricing?.find(
          p => p.building?._id === selectedBuilding
        );
        
        if (!buildingPricing) {
          // Create new pricing configuration for this building
          const selectedBuildingData = buildings.find(b => b._id === selectedBuilding);
          
          const newPricingConfig = {
            company: {
              name: selectedBuildingData?.name || 'Default Company',
              type: 'other'
            },
            building: selectedBuilding,
            services: [],
            terms: {
              paymentTerms: 'net_30',
              discountPercentage: 0,
              bulkDiscountThreshold: 0,
              specialInstructions: ''
            },
            isActive: true
          };

          const createdPricing = await createClientPricing(newPricingConfig).unwrap();
          buildingPricing = createdPricing.data.clientPricing;
          toast.success('Created new price sheet for building');
        }

        await addPricingService({
          pricingId: buildingPricing._id,
          service: payload,
        }).unwrap();
        toast.success('Service added successfully');
      }

      setServiceDialogOpen(false);
      setEditingService(null);
      setServiceForm(defaultServiceForm);
      setSelectedBuilding('');
      refetchPricing();
    } catch (error) {
      console.error('Failed to save service:', error);
      console.error('Error details:', {
        status: error?.status,
        data: error?.data,
        message: error?.data?.message || error?.message
      });
      toast.error(error?.data?.message || error?.message || 'Failed to save service');
    }
  };

  const handleServiceFormChange = (event) => {
    const { name, value } = event.target;
    setServiceForm(prev => {
      const newForm = { ...prev, [name]: value };
      // Clear subcategory when category changes
      if (name === 'category') {
        newForm.subcategory = '';
      }
      return newForm;
    });
  };

  const handleServiceActiveToggle = (event) => {
    setServiceForm(prev => ({ ...prev, isActive: event.target.checked }));
  };

  if (isLoadingBuildings || isLoadingPricing || isLoadingWorkTypes) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Customer Services Prices
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardHeader 
          title="Filters" 
          avatar={<FilterIcon />}
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                fullWidth
                label="Building"
                value={filters.building}
                onChange={(e) => handleFilterChange('building', e.target.value)}
              >
                <MenuItem value="">All Buildings</MenuItem>
                {buildings.map((building) => (
                  <MenuItem key={building._id} value={building._id}>
                    {building.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                fullWidth
                label="Service Category or Type"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                {serviceCategories.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              pageSize={25}
              rowsPerPageOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
              slots={{
                toolbar: CustomToolbar,
              }}
              slotProps={{
                toolbar: {
                  onRefresh: refetchPricing,
                  onAddService: handleAddService,
                },
              }}
              sx={{
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #f0f0f0',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: '#f8f9fa',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Service Dialog */}
      <Dialog 
        open={serviceDialogOpen} 
        onClose={() => setServiceDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {editingService ? 'Edit Service' : 'Add Service'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {!editingService && (
              <TextField
                select
                fullWidth
                label="Customer/Building"
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                required
              >
                <MenuItem value="">Select a building</MenuItem>
                {buildings.map((building) => (
                  <MenuItem key={building._id} value={building._id}>
                    {building.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Category"
                  name="category"
                  value={serviceForm.category}
                  onChange={handleServiceFormChange}
                  fullWidth
                  required
                >
                  {formCategories.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Sub-Category"
                  name="subcategory"
                  value={serviceForm.subcategory}
                  onChange={handleServiceFormChange}
                  fullWidth
                  required
                  helperText="Match this to work sub-type code for auto-fill"
                  disabled={!serviceForm.category}
                >
                  {serviceSubCategories.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Service Name"
                  name="name"
                  value={serviceForm.name}
                  onChange={handleServiceFormChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Unit Type"
                  name="unitType"
                  value={serviceForm.unitType}
                  onChange={handleServiceFormChange}
                  fullWidth
                  required
                >
                  {unitTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  name="description"
                  value={serviceForm.description}
                  onChange={handleServiceFormChange}
                  fullWidth
                  multiline
                  minRows={2}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Base Price ($)"
                  name="basePrice"
                  type="number"
                  value={serviceForm.basePrice}
                  onChange={handleServiceFormChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Minimum Charge ($)"
                  name="minimumCharge"
                  type="number"
                  value={serviceForm.minimumCharge}
                  onChange={handleServiceFormChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Maximum Charge ($)"
                  name="maximumCharge"
                  type="number"
                  value={serviceForm.maximumCharge}
                  onChange={handleServiceFormChange}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Labor Cost ($)"
                  name="laborCost"
                  type="number"
                  value={serviceForm.laborCost}
                  onChange={handleServiceFormChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Material Cost ($)"
                  name="materialCost"
                  type="number"
                  value={serviceForm.materialCost}
                  onChange={handleServiceFormChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Equipment Cost ($)"
                  name="equipmentCost"
                  type="number"
                  value={serviceForm.equipmentCost}
                  onChange={handleServiceFormChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Overhead (%)"
                  name="overheadPercentage"
                  type="number"
                  value={serviceForm.overheadPercentage}
                  onChange={handleServiceFormChange}
                  fullWidth
                />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Switch
                  checked={serviceForm.isActive}
                  onChange={handleServiceActiveToggle}
                />
              }
              label="Service is active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServiceDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveService} 
            variant="contained"
            disabled={isAddingService || isUpdatingService}
          >
            {isAddingService || isUpdatingService ? 'Saving...' : 'Save Service'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CustomerServicesPrices;

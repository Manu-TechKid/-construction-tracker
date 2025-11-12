import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  useGetBuildingClientPricingQuery,
  useCreateClientPricingMutation,
  useUpdateClientPricingMutation,
  useAddPricingServiceMutation,
  useUpdatePricingServiceMutation,
  useRemovePricingServiceMutation,
} from '../../features/clientPricing/clientPricingApiSlice';
import { toast } from 'react-toastify';

const companyTypes = [
  { value: 'simpson_housing', label: 'Simpson Housing' },
  { value: 'greystar', label: 'Greystar' },
  { value: 'vista', label: 'Vista' },
  { value: 'other', label: 'Other' },
];

const paymentTermsOptions = [
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_60', label: 'Net 60' },
  { value: 'net_90', label: 'Net 90' },
];

const serviceCategories = [
  { value: 'painting', label: 'Painting' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'remodeling', label: 'Remodeling' },
  { value: 'other', label: 'Other' },
];

const unitTypes = [
  { value: 'per_room', label: 'Per Room' },
  { value: 'per_sqft', label: 'Per Sq Ft' },
  { value: 'per_apartment', label: 'Per Apartment' },
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'fixed', label: 'Fixed' },
];

const defaultServiceForm = {
  category: 'other',
  subcategory: '',
  name: '',
  description: '',
  basePrice: '',
  unitType: 'per_apartment',
  minimumCharge: '',
  maximumCharge: '',
  laborCost: '',
  materialCost: '',
  equipmentCost: '',
  overheadPercentage: '15',
  isActive: true,
};

const BuildingPricingTab = ({ buildingId, building }) => {
  const {
    data: pricingData,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetBuildingClientPricingQuery(buildingId, {
    skip: !buildingId,
  });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState(defaultServiceForm);
  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    companyType: 'other',
    paymentTerms: 'net_30',
    discountPercentage: 0,
    bulkDiscountThreshold: 0,
    bulkDiscountPercentage: 0,
    specialInstructions: '',
  });
  const [createForm, setCreateForm] = useState({
    companyName: building?.name || '',
    companyType: 'other',
    paymentTerms: 'net_30',
    discountPercentage: 0,
    bulkDiscountThreshold: 0,
    bulkDiscountPercentage: 0,
    specialInstructions: '',
  });

  const [createClientPricing, { isLoading: isCreating } ] = useCreateClientPricingMutation();
  const [updateClientPricing, { isLoading: isUpdatingPricing }] = useUpdateClientPricingMutation();
  const [addPricingService, { isLoading: isAddingService }] = useAddPricingServiceMutation();
  const [updatePricingService, { isLoading: isUpdatingService }] = useUpdatePricingServiceMutation();
  const [removePricingService, { isLoading: isRemovingService }] = useRemovePricingServiceMutation();

  const pricingConfig = useMemo(() => {
    if (!pricingData) return null;
    if (pricingData.data?.clientPricing) return pricingData.data.clientPricing;
    if (pricingData.clientPricing) return pricingData.clientPricing;
    return pricingData;
  }, [pricingData]);

  useEffect(() => {
    if (pricingConfig) {
      setCompanyForm({
        companyName: pricingConfig.company?.name || building?.name || '',
        companyType: pricingConfig.company?.type || 'other',
        paymentTerms: pricingConfig.terms?.paymentTerms || 'net_30',
        discountPercentage: pricingConfig.terms?.discountPercentage ?? 0,
        bulkDiscountThreshold: pricingConfig.terms?.bulkDiscountThreshold ?? 0,
        bulkDiscountPercentage: pricingConfig.terms?.bulkDiscountPercentage ?? 0,
        specialInstructions: pricingConfig.terms?.specialInstructions || '',
      });
    }
  }, [pricingConfig, building?.name]);

  const services = pricingConfig?.services || [];

  const serviceRows = useMemo(
    () => services.map((service) => {
      const totalCost = (service.cost?.laborCost || 0) + (service.cost?.materialCost || 0) + (service.cost?.equipmentCost || 0);
      return {
        id: service._id,
        name: service.name,
        category: service.category,
        subcategory: service.subcategory,
        unitType: service.pricing?.unitType,
        basePrice: service.pricing?.basePrice,
        minimumCharge: service.pricing?.minimumCharge,
        maximumCharge: service.pricing?.maximumCharge,
        laborCost: service.cost?.laborCost,
        materialCost: service.cost?.materialCost,
        equipmentCost: service.cost?.equipmentCost,
        overheadPercentage: service.cost?.overheadPercentage,
        totalCost,
        isActive: service.isActive,
        service,
      };
    }),
    [services]
  );

  const handleOpenCreateDialog = () => {
    setCreateForm({
      companyName: building?.name || '',
      companyType: 'other',
      paymentTerms: 'net_30',
      discountPercentage: 0,
      bulkDiscountThreshold: 0,
      bulkDiscountPercentage: 0,
      specialInstructions: '',
    });
    setCreateDialogOpen(true);
  };

  const handleCreatePricing = async () => {
    if (!buildingId) return;
    if (!createForm.companyName.trim()) {
      toast.error('Please provide a company name.');
      return;
    }

    try {
      const payload = {
        building: buildingId,
        company: {
          name: createForm.companyName.trim(),
          type: createForm.companyType,
        },
        services: [],
        terms: {
          paymentTerms: createForm.paymentTerms,
          discountPercentage: Number(createForm.discountPercentage) || 0,
          bulkDiscountThreshold: Number(createForm.bulkDiscountThreshold) || 0,
          bulkDiscountPercentage: Number(createForm.bulkDiscountPercentage) || 0,
          specialInstructions: createForm.specialInstructions?.trim() || '',
        },
      };

      await createClientPricing(payload).unwrap();
      toast.success('Price sheet created for this building.');
      setCreateDialogOpen(false);
      refetch();
    } catch (mutationError) {
      console.error('Failed to create client pricing', mutationError);
      toast.error(mutationError?.data?.message || 'Failed to create price sheet');
    }
  };

  const handleCompanyFormChange = (event) => {
    const { name, value } = event.target;
    setCompanyForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveCompanyDetails = async () => {
    if (!pricingConfig?._id) return;

    try {
      await updateClientPricing({
        id: pricingConfig._id,
        company: {
          name: companyForm.companyName.trim() || building?.name || 'Client',
          type: companyForm.companyType,
        },
        terms: {
          paymentTerms: companyForm.paymentTerms,
          discountPercentage: Number(companyForm.discountPercentage) || 0,
          bulkDiscountThreshold: Number(companyForm.bulkDiscountThreshold) || 0,
          bulkDiscountPercentage: Number(companyForm.bulkDiscountPercentage) || 0,
          specialInstructions: companyForm.specialInstructions?.trim() || '',
        },
      }).unwrap();

      toast.success('Pricing details updated.');
      refetch();
    } catch (mutationError) {
      console.error('Failed to update client pricing', mutationError);
      toast.error(mutationError?.data?.message || 'Failed to update pricing details');
    }
  };

  const handleOpenServiceDialog = (service = null) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        category: service.category || 'other',
        subcategory: service.subcategory || '',
        name: service.name || '',
        description: service.description || '',
        basePrice: service.pricing?.basePrice ?? '',
        unitType: service.pricing?.unitType || 'per_apartment',
        minimumCharge: service.pricing?.minimumCharge ?? '',
        maximumCharge: service.pricing?.maximumCharge ?? '',
        laborCost: service.cost?.laborCost ?? '',
        materialCost: service.cost?.materialCost ?? '',
        equipmentCost: service.cost?.equipmentCost ?? '',
        overheadPercentage: service.cost?.overheadPercentage ?? '15',
        isActive: service.isActive ?? true,
      });
    } else {
      setEditingService(null);
      setServiceForm(defaultServiceForm);
    }
    setServiceDialogOpen(true);
  };

  const handleServiceFormChange = (event) => {
    const { name, value } = event.target;
    setServiceForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleServiceActiveToggle = (event) => {
    setServiceForm((prev) => ({
      ...prev,
      isActive: event.target.checked,
    }));
  };

  const buildServicePayload = () => {
    const {
      category,
      subcategory,
      name,
      description,
      basePrice,
      unitType,
      minimumCharge,
      maximumCharge,
      laborCost,
      materialCost,
      equipmentCost,
      overheadPercentage,
      isActive,
    } = serviceForm;

    const payload = {
      category,
      subcategory: subcategory.trim(),
      name: name.trim(),
      description: description.trim(),
      pricing: {
        basePrice: Number(basePrice) || 0,
        unitType,
        minimumCharge: minimumCharge === '' ? 0 : Number(minimumCharge),
        maximumCharge: maximumCharge === '' ? undefined : Number(maximumCharge),
      },
      cost: {
        laborCost: Number(laborCost) || 0,
        materialCost: Number(materialCost) || 0,
        equipmentCost: Number(equipmentCost) || 0,
        overheadPercentage: Number(overheadPercentage) || 0,
      },
      isActive,
    };

    if (!payload.description) {
      delete payload.description;
    }

    if (!payload.pricing.maximumCharge && payload.pricing.maximumCharge !== 0) {
      delete payload.pricing.maximumCharge;
    }

    return payload;
  };

  const handleSaveService = async () => {
    if (!pricingConfig?._id) return;

    if (!serviceForm.name.trim()) {
      toast.error('Service name is required.');
      return;
    }

    if (!serviceForm.subcategory.trim()) {
      toast.error('Sub-category is required.');
      return;
    }

    try {
      const payload = buildServicePayload();

      if (editingService) {
        await updatePricingService({
          pricingId: pricingConfig._id,
          serviceId: editingService._id,
          service: payload,
        }).unwrap();
        toast.success('Service updated.');
      } else {
        await addPricingService({
          pricingId: pricingConfig._id,
          service: payload,
        }).unwrap();
        toast.success('Service added.');
      }

      setServiceDialogOpen(false);
      setEditingService(null);
      setServiceForm(defaultServiceForm);
      refetch();
    } catch (mutationError) {
      console.error('Failed to save service', mutationError);
      toast.error(mutationError?.data?.message || 'Failed to save service');
    }
  };

  const handleRemoveService = async (serviceId) => {
    if (!pricingConfig?._id) return;
    if (!window.confirm('Remove this service from the price sheet?')) {
      return;
    }

    try {
      await removePricingService({
        pricingId: pricingConfig._id,
        serviceId,
      }).unwrap();
      toast.success('Service removed.');
      refetch();
    } catch (mutationError) {
      console.error('Failed to remove service', mutationError);
      toast.error(mutationError?.data?.message || 'Failed to remove service');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isNotConfigured = error?.status === 404 || !pricingConfig;

  if (isNotConfigured) {
    return (
      <Box sx={{ py: 4 }}>
        <Card variant="outlined">
          <CardHeader title="No Price Sheet Configured" subheader="Create a building-specific price sheet to auto-fill pricing when creating work orders or estimates." />
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Building price sheets let you maintain service-specific pricing, cost, and terms that automatically flow into work orders, invoices, and estimates for this building.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog}>
              Create Price Sheet
            </Button>
          </CardContent>
        </Card>

        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create Building Price Sheet</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Company Name"
                name="companyName"
                value={createForm.companyName}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, companyName: event.target.value }))}
                fullWidth
              />
              <TextField
                select
                label="Company Type"
                name="companyType"
                value={createForm.companyType}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, companyType: event.target.value }))}
                fullWidth
              >
                {companyTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Payment Terms"
                name="paymentTerms"
                value={createForm.paymentTerms}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, paymentTerms: event.target.value }))}
                fullWidth
              >
                {paymentTermsOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Discount Percentage (%)"
                type="number"
                name="discountPercentage"
                value={createForm.discountPercentage}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, discountPercentage: event.target.value }))}
              />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Bulk Discount Threshold ($)"
                    type="number"
                    name="bulkDiscountThreshold"
                    value={createForm.bulkDiscountThreshold}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, bulkDiscountThreshold: event.target.value }))}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Bulk Discount (%)"
                    type="number"
                    name="bulkDiscountPercentage"
                    value={createForm.bulkDiscountPercentage}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, bulkDiscountPercentage: event.target.value }))}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <TextField
                label="Special Instructions"
                name="specialInstructions"
                value={createForm.specialInstructions}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, specialInstructions: event.target.value }))}
                multiline
                minRows={3}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePricing} variant="contained" disabled={isCreating}>
              {isCreating ? 'Creating…' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
        <Typography variant="h6">Building Price Sheet</Typography>
        {isFetching && <CircularProgress size={18} />}
        <Tooltip title="Refresh pricing">
          <IconButton size="small" onClick={() => refetch()}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Chip
          label={pricingConfig?.isActive ? 'Active' : 'Inactive'}
          color={pricingConfig?.isActive ? 'success' : 'default'}
          size="small"
        />
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card variant="outlined">
            <CardHeader title="Company & Terms" subheader="Update pricing company details and default terms." />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Company Name"
                  name="companyName"
                  value={companyForm.companyName}
                  onChange={handleCompanyFormChange}
                  fullWidth
                />
                <TextField
                  select
                  label="Company Type"
                  name="companyType"
                  value={companyForm.companyType}
                  onChange={handleCompanyFormChange}
                  fullWidth
                >
                  {companyTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Payment Terms"
                  name="paymentTerms"
                  value={companyForm.paymentTerms}
                  onChange={handleCompanyFormChange}
                  fullWidth
                >
                  {paymentTermsOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Discount (%)"
                      name="discountPercentage"
                      type="number"
                      value={companyForm.discountPercentage}
                      onChange={handleCompanyFormChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Bulk Discount (%)"
                      name="bulkDiscountPercentage"
                      type="number"
                      value={companyForm.bulkDiscountPercentage}
                      onChange={handleCompanyFormChange}
                      fullWidth
                    />
                  </Grid>
                </Grid>
                <TextField
                  label="Bulk Discount Threshold ($)"
                  name="bulkDiscountThreshold"
                  type="number"
                  value={companyForm.bulkDiscountThreshold}
                  onChange={handleCompanyFormChange}
                  fullWidth
                />
                <TextField
                  label="Special Instructions"
                  name="specialInstructions"
                  value={companyForm.specialInstructions}
                  onChange={handleCompanyFormChange}
                  multiline
                  minRows={3}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveCompanyDetails}
                    disabled={isUpdatingPricing}
                  >
                    {isUpdatingPricing ? 'Saving…' : 'Save Details'}
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card variant="outlined">
            <CardHeader
              title="Services & Rates"
              action={
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenServiceDialog()}
                >
                  Add Service
                </Button>
              }
            />
            <CardContent>
              {services.length === 0 ? (
                <Alert severity="info">
                  No services configured yet. Add services to define building-specific pricing for your work categories.
                </Alert>
              ) : (
                <Box sx={{ height: 400, width: '100%' }}>
                  <DataGrid
                    rows={serviceRows}
                    columns={[
                      {
                        field: 'name',
                        headerName: 'Service',
                        flex: 1,
                        renderCell: (params) => (
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {params.row.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {params.row.category} • {params.row.subcategory}
                            </Typography>
                          </Box>
                        ),
                      },
                      {
                        field: 'basePrice',
                        headerName: 'Base Price',
                        width: 120,
                        valueFormatter: ({ value }) =>
                          value === undefined ? '—' : `$${Number(value).toFixed(2)}`,
                      },
                      {
                        field: 'totalCost',
                        headerName: 'Cost',
                        width: 120,
                        valueFormatter: ({ value }) =>
                          value === undefined ? '—' : `$${Number(value).toFixed(2)}`,
                      },
                      {
                        field: 'unitType',
                        headerName: 'Unit',
                        width: 130,
                      },
                      {
                        field: 'isActive',
                        headerName: 'Status',
                        width: 120,
                        renderCell: (params) => (
                          <Chip
                            label={params.value ? 'Active' : 'Inactive'}
                            color={params.value ? 'success' : 'default'}
                            size="small"
                          />
                        ),
                      },
                      {
                        field: 'actions',
                        headerName: 'Actions',
                        width: 150,
                        sortable: false,
                        filterable: false,
                        renderCell: (params) => (
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Edit service">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenServiceDialog(params.row.service)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove service">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemoveService(params.row.id)}
                                  disabled={isRemovingService}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        ),
                      },
                    ]}
                    pageSize={5}
                    rowsPerPageOptions={[5, 10]}
                    disableRowSelectionOnClick
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={serviceDialogOpen} onClose={() => setServiceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Category"
                  name="category"
                  value={serviceForm.category}
                  onChange={handleServiceFormChange}
                  fullWidth
                >
                  {serviceCategories.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Sub-Category"
                  name="subcategory"
                  value={serviceForm.subcategory}
                  onChange={handleServiceFormChange}
                  fullWidth
                  helperText="Match this to the work sub-type code to auto-fill pricing."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Service Name"
                  name="name"
                  value={serviceForm.name}
                  onChange={handleServiceFormChange}
                  fullWidth
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
          <Button onClick={() => setServiceDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveService} variant="contained" disabled={isAddingService || isUpdatingService}>
            {isAddingService || isUpdatingService ? 'Saving…' : 'Save Service'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BuildingPricingTab;

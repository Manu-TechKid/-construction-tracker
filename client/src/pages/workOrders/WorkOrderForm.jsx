import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Card,
  CardHeader,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import PhotoUpload from '../../components/common/PhotoUpload';
import { useBuildingContext } from '../../contexts/BuildingContext';
import { useGetBuildingsQuery, useGetBuildingQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import {
  useCreateWorkOrderMutation,
  useGetWorkOrderQuery,
  useUpdateWorkOrderMutation,
} from '../../features/workOrders/workOrdersApiSlice';
import {
  useGetWorkTypesQuery,
  useGetWorkSubTypesQuery,
  useGetDropdownOptionsQuery
} from '../../features/setup/setupApiSlice';
import { useGetBuildingServicesQuery } from '../../features/clientPricing/clientPricingApiSlice';

const WorkOrderForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const isEdit = Boolean(id);
  const [photos, setPhotos] = useState([]);
  const { selectedBuilding } = useBuildingContext();

  // Photo functionality is working properly - integrated with PhotoUpload component

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      building: '',
      block: '',
      apartmentNumber: '',
      workType: '',
      workSubType: '',
      priority: 'medium',
      assignedTo: [],
      price: 0, // What we charge the customer
      cost: 0, // What it costs us (materials, labor, etc.)
      scheduledDate: new Date(),
      status: 'pending',
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Required'),
      description: Yup.string().required('Required'),
      building: Yup.string().required('Required'),
      workType: Yup.string().required('Required'),
      workSubType: Yup.string().required('Required'),
    }),
    onSubmit: async (values) => {
      try {
        // Format the data correctly for the backend, including photos
        const formattedValues = {
          ...values,
          // Ensure apartmentNumber is mapped correctly
          apartmentNumber: values.apartmentNumber || values.apartment,
          // Ensure scheduledDate is properly formatted
          scheduledDate: values.scheduledDate instanceof Date ? values.scheduledDate.toISOString() : values.scheduledDate,
          // Ensure price and cost are numbers
          price: Number(values.price) || 0,
          cost: Number(values.cost) || 0,
          // Ensure workType and workSubType are just IDs
          workType: values.workType && typeof values.workType === 'object' ? values.workType._id : values.workType,
          workSubType: values.workSubType && typeof values.workSubType === 'object' ? values.workSubType._id : values.workSubType,
          // Include photos in the work order data - ensure they are properly formatted for backend
          photos: photos && Array.isArray(photos) ? photos.map(photo => {
            // Handle both uploaded photos (with _id) and new photos (with file)
            if (photo._id) {
              // Existing uploaded photo
              return {
                _id: photo._id,
                url: photo.url,
                caption: photo.caption || '',
                type: photo.type || 'other',
                uploadedAt: photo.uploadedAt || new Date().toISOString()
              };
            } else {
              // New photo that needs to be uploaded
              return {
                url: photo.url,
                caption: photo.caption || '',
                type: photo.type || 'other',
                uploadedAt: photo.uploadedAt || new Date().toISOString(),
                file: photo.file // Include file for upload
              };
            }
          }) : []
        };

        console.log('Submitting work order with data:', formattedValues);

        let workOrderId = id;
        if (isEdit) {
          await updateWorkOrder({ id, ...formattedValues }).unwrap();
        } else {
          const newWorkOrder = await createWorkOrder(formattedValues).unwrap();
          workOrderId = newWorkOrder.data._id;
        }

        console.log(`Work order saved with ${photos?.length || 0} photos`);

        // Show success message and redirect immediately
        const message = isEdit ? 'Work order updated successfully!' : 'Work order created successfully!';
        toast.success(message, {
          position: "top-right",
          autoClose: 1500,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: true,
        });
        
        // Immediate navigation without delay
        // If returnTo is specified, go back to that page, otherwise go to work orders list
        navigate(returnTo || '/work-orders', { replace: true });
      } catch (error) {
        console.error('Failed to save work order:', error);
        toast.error(`Failed to save work order: ${error.message || 'Unknown error'}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    },
  });

  const { data: buildingsData, isLoading: isLoadingBuildings } = useGetBuildingsQuery();
  const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery({ role: 'worker' });
  const { data: workOrderData, isLoading: isLoadingWorkOrder } = useGetWorkOrderQuery(id, { skip: !isEdit });
  const { data: selectedBuildingData } = useGetBuildingQuery(formik.values.building, { skip: !formik.values.building });
  const apartmentCount = selectedBuildingData?.data?.apartments?.length || 0;
  
  // Setup data queries
  const { data: workTypesData, isLoading: isLoadingWorkTypes } = useGetWorkTypesQuery();
  const { data: workSubTypesData, isLoading: isLoadingWorkSubTypes } = useGetWorkSubTypesQuery(
    formik.values.workType && typeof formik.values.workType === 'object' 
      ? formik.values.workType._id 
      : formik.values.workType
  );
  const { data: priorityOptionsData } = useGetDropdownOptionsQuery('priority');
  const { data: statusOptionsData } = useGetDropdownOptionsQuery('status');

  const {
    data: buildingServicesData,
    isFetching: isFetchingPricing,
  } = useGetBuildingServicesQuery(
    { buildingId: formik.values.building },
    { skip: !formik.values.building }
  );

  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  // Photo functionality integrated below with PhotoUpload component

  const previousBuildingRef = useRef(formik.values.building);

  useEffect(() => {
    if (!isEdit && previousBuildingRef.current && formik.values.building && previousBuildingRef.current !== formik.values.building) {
      formik.setFieldValue('price', 0);
      formik.setFieldValue('cost', 0);
    }
    previousBuildingRef.current = formik.values.building;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.building]);

  const workTypes = useMemo(() => workTypesData?.data?.workTypes || workTypesData?.workTypes || [], [workTypesData]);
  const workSubTypes = useMemo(() => workSubTypesData?.data?.workSubTypes || workSubTypesData?.workSubTypes || [], [workSubTypesData]);

  const selectedWorkType = useMemo(
    () => workTypes.find((wt) => wt._id === formik.values.workType),
    [workTypes, formik.values.workType]
  );

  const selectedWorkSubType = useMemo(
    () => workSubTypes.find((st) => st._id === formik.values.workSubType),
    [workSubTypes, formik.values.workSubType]
  );

  const buildingServices = useMemo(() => {
    if (!buildingServicesData) return [];
    if (Array.isArray(buildingServicesData)) return buildingServicesData;
    if (buildingServicesData.data?.services) return buildingServicesData.data.services;
    if (buildingServicesData.services) return buildingServicesData.services;
    return [];
  }, [buildingServicesData]);

  const matchedPricingService = useMemo(() => {
    if (!selectedWorkSubType) return null;

    const categoryCandidates = [];
    if (selectedWorkType?.code) categoryCandidates.push(String(selectedWorkType.code).toLowerCase());
    if (selectedWorkType?.name) categoryCandidates.push(String(selectedWorkType.name).toLowerCase());
    if (selectedWorkType?._id) categoryCandidates.push(String(selectedWorkType._id).toLowerCase());

    const subcategoryCandidates = [];
    if (selectedWorkSubType.code) subcategoryCandidates.push(String(selectedWorkSubType.code).toLowerCase());
    if (selectedWorkSubType.name) subcategoryCandidates.push(String(selectedWorkSubType.name).toLowerCase());
    if (selectedWorkSubType._id) subcategoryCandidates.push(String(selectedWorkSubType._id).toLowerCase());

    return (
      buildingServices.find((service) => {
        const serviceCategory = service.category ? String(service.category).toLowerCase() : '';
        const serviceSubcategory = service.subcategory ? String(service.subcategory).toLowerCase() : '';

        const categoryMatches =
          categoryCandidates.length === 0 || categoryCandidates.includes(serviceCategory);

        const subCategoryMatches =
          subcategoryCandidates.length > 0 && subcategoryCandidates.includes(serviceSubcategory);

        return categoryMatches && subCategoryMatches;
      }) || null
    );
  }, [buildingServices, selectedWorkSubType, selectedWorkType]);

  // Auto-populate price and cost from Customer Pricing
  useEffect(() => {
    if (!matchedPricingService) return;

    const basePrice = matchedPricingService.calculatedPricing?.basePrice ?? matchedPricingService.pricing?.basePrice ?? 0;
    if (basePrice > 0) {
      const currentPrice = Number(formik.values.price) || 0;
      if (currentPrice <= 0 || Math.abs(currentPrice - basePrice) > 0.009) {
        formik.setFieldValue('price', Number(basePrice.toFixed(2)));
      }
    }

    const laborCost = matchedPricingService.cost?.laborCost || 0;
    const materialCost = matchedPricingService.cost?.materialCost || 0;
    const equipmentCost = matchedPricingService.cost?.equipmentCost || 0;
    const overheadPercentage = matchedPricingService.cost?.overheadPercentage || 0;
    const baseCost = laborCost + materialCost + equipmentCost;
    const totalCost = baseCost * (1 + overheadPercentage / 100);

    if (totalCost > 0) {
      const currentCost = Number(formik.values.cost) || 0;
      if (currentCost <= 0 || Math.abs(currentCost - totalCost) > 0.009) {
        formik.setFieldValue('cost', Number(totalCost.toFixed(2)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedPricingService]);

  // Auto-populate title and description from System Setup WorkSubType
  useEffect(() => {
    if (!selectedWorkSubType) return;
    
    // Auto-fill title if empty
    const currentTitle = formik.values.title?.trim() || '';
    if (!currentTitle && selectedWorkSubType.name) {
      formik.setFieldValue('title', selectedWorkSubType.name);
    }
    
    // Auto-fill description if empty
    const currentDescription = formik.values.description?.trim() || '';
    if (!currentDescription && selectedWorkSubType.description) {
      formik.setFieldValue('description', selectedWorkSubType.description);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkSubType]);

  // Auto-populate title and description from Customer Pricing when available
  // This prefers the price sheet service definition over the generic work sub-type
  // but only overrides if the user hasn't customized the fields yet.
  useEffect(() => {
    if (!matchedPricingService) return;

    const currentTitle = formik.values.title?.trim() || '';
    const subTypeTitle = selectedWorkSubType?.name?.trim() || '';
    if ((!currentTitle || currentTitle === subTypeTitle) && matchedPricingService.name) {
      formik.setFieldValue('title', matchedPricingService.name);
    }

    const currentDescription = formik.values.description?.trim() || '';
    const subTypeDescription = selectedWorkSubType?.description?.trim() || '';
    if ((!currentDescription || currentDescription === subTypeDescription) && matchedPricingService.description) {
      formik.setFieldValue('description', matchedPricingService.description);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedPricingService]);

  useEffect(() => {
    if (isEdit && workOrderData?.data) {
      // Exclude fields that are not part of the form to avoid warnings
      const { _id, __v, createdAt, updatedAt, ...formData } = workOrderData.data;
      
      // Ensure all form fields have proper values
      const safeFormData = {
        title: formData.title || '',
        description: formData.description || '',
        building: formData.building?._id || formData.building || '',
        block: formData.block || '',
        apartmentNumber: formData.apartmentNumber || '',
        workType: formData.workType?._id || formData.workType || '',
        workSubType: formData.workSubType?._id || formData.workSubType || '',
        priority: formData.priority || 'medium',
        assignedTo: formData.assignedTo?.map(a => a.worker?._id || a.worker) || [],
        price: formData.price || formData.estimatedCost || 0, // Map old estimatedCost to new price field
        cost: formData.cost || formData.actualCost || 0, // Map old actualCost to new cost field
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate) : new Date(),
        status: formData.status || 'pending'
      };
      
      formik.setValues(safeFormData);

      // Load existing photos for edit mode
      if (formData.photos && Array.isArray(formData.photos)) {
        setPhotos(formData.photos);
      }
    } else if (!isEdit && selectedBuilding) {
      // Set the building from context for new work orders
      formik.setFieldValue('building', selectedBuilding._id);
    }
  }, [isEdit, workOrderData, selectedBuilding]);

  if (isLoadingWorkOrder || isLoadingBuildings || isLoadingUsers || isLoadingWorkTypes) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">{isEdit ? 'Edit Work Order' : 'Create Work Order'}</Typography>
        <Button variant="outlined" onClick={() => navigate(returnTo || '/work-orders')}>
          {returnTo ? 'Back to Invoice' : 'Back to Work Orders'}
        </Button>
      </Box>
      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          {/* 1. Location & Type - FIRST as requested by Carlos */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Location & Type" />
              <Divider />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth error={formik.touched.building && Boolean(formik.errors.building)}>
                      <InputLabel>Building *</InputLabel>
                      <Select
                        id="building"
                        name="building"
                        value={formik.values.building}
                        onChange={formik.handleChange}
                        label="Building *"
                      >
                        {buildingsData?.data?.buildings?.map((building) => (
                          <MenuItem key={building._id} value={building._id}>
                            {building.serviceManager ? `${building.name} - [${building.serviceManager}]` : building.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {formik.touched.building && formik.errors.building && (
                        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                          {formik.errors.building}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth disabled={!formik.values.building}>
                      <InputLabel>Filter by Block (Optional)</InputLabel>
                      <Select
                        id="block"
                        name="block"
                        value={formik.values.block}
                        onChange={(e) => {
                          formik.setFieldValue('block', e.target.value);
                          formik.setFieldValue('apartmentNumber', '');
                        }}
                        displayEmpty
                        label="Filter by Block (Optional)"
                      >
                        <MenuItem value="">
                          <em>All Blocks</em>
                        </MenuItem>
                        {[
                          ...new Set(
                            selectedBuildingData?.data?.apartments
                              ?.map(a => a.block)
                              .filter(block => block)
                              .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) || []
                          )
                        ].map((block) => (
                          <MenuItem key={block} value={block}>
                            Block {block}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth disabled={!formik.values.building}>
                      <InputLabel>
                        {apartmentCount > 0 ? `Apartment (${apartmentCount} units)` : 'Apartment'}
                      </InputLabel>
                      <Select
                        id="apartmentNumber"
                        name="apartmentNumber"
                        value={formik.values.apartmentNumber}
                        onChange={formik.handleChange}
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 300,
                            },
                          },
                        }}
                        displayEmpty
                        label="Apartment"
                        renderValue={(selected) => {
                          if (!selected) return <em>Select an apartment</em>;
                          const apartment = selectedBuildingData?.data?.apartments?.find(a => a.number === selected);
                          if (!apartment) return selected;

                          const blockPart = apartment.block ? ` (Block ${apartment.block})` : '';
                          let typeLabel = '';
                          if (apartment.type === 'studio') {
                            typeLabel = 'Studio';
                          } else if (typeof apartment.bedrooms === 'number' && apartment.bedrooms > 0) {
                            typeLabel = `${apartment.bedrooms}Br`;
                          }
                          const typePart = typeLabel ? ` - ${typeLabel}` : '';

                          return `${apartment.number}${blockPart}${typePart}`;
                        }}
                      >
                        <MenuItem value="" disabled>
                          <em>Select an apartment</em>
                        </MenuItem>
                        {selectedBuildingData?.data?.apartments
                          ?.filter(a => {
                            if (!formik.values.block || formik.values.block === '') return true;
                            if (!a.block) return false;
                            return a.block === formik.values.block;
                          })
                          .sort((a, b) => {
                            const blockCompare = (a.block || '').localeCompare(b.block || '');
                            if (blockCompare !== 0) return blockCompare;
                            return a.number.localeCompare(b.number, undefined, { numeric: true });
                          })
                          .map((apartment) => (
                            <MenuItem key={apartment._id} value={apartment.number}>
                              {(() => {
                                const blockPart = apartment.block ? ` (Block ${apartment.block})` : '';
                                let typeLabel = '';
                                if (apartment.type === 'studio') {
                                  typeLabel = 'Studio';
                                } else if (typeof apartment.bedrooms === 'number' && apartment.bedrooms > 0) {
                                  typeLabel = `${apartment.bedrooms}Br`;
                                }
                                const typePart = typeLabel ? ` - ${typeLabel}` : '';
                                return `${apartment.number}${blockPart}${typePart}`;
                              })()}
                            </MenuItem>
                          ))}
                        {selectedBuildingData?.data?.apartments?.length === 0 && (
                          <MenuItem disabled>No apartments found</MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={6}>
                    <FormControl fullWidth error={formik.touched.workType && Boolean(formik.errors.workType)}>
                      <InputLabel>Work Type *</InputLabel>
                      <Select
                        id="workType"
                        name="workType"
                        value={formik.values.workType}
                        onChange={(e) => {
                          formik.setFieldValue('workType', e.target.value);
                          formik.setFieldValue('workSubType', '');
                        }}
                        label="Work Type *"
                        displayEmpty
                        renderValue={(selected) => {
                          if (!selected) {
                            return <em>Select a Service type or category</em>;
                          }
                          const workType = workTypes.find(wt => wt._id === selected);
                          return workType?.name || selected;
                        }}
                      >
                        <MenuItem value="" disabled>
                          <em>Select a Service type or category</em>
                        </MenuItem>
                        {workTypesData?.data?.workTypes?.map((workType) => (
                          <MenuItem key={workType._id} value={workType._id}>
                            {workType.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {formik.touched.workType && formik.errors.workType && (
                        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                          {formik.errors.workType}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={6}>
                    <FormControl fullWidth disabled={!formik.values.workType} error={formik.touched.workSubType && Boolean(formik.errors.workSubType)}>
                      <InputLabel>Work Sub-Type *</InputLabel>
                      <Select
                        id="workSubType"
                        name="workSubType"
                        value={formik.values.workSubType}
                        onChange={formik.handleChange}
                        label="Work Sub-Type *"
                      >
                        {workSubTypes.map(subType => (
                          <MenuItem key={subType._id} value={subType._id}>{subType.name}</MenuItem>
                        ))}
                      </Select>
                      {formik.touched.workSubType && formik.errors.workSubType && (
                        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                          {formik.errors.workSubType}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* 2. Work Order Details - SECOND as requested by Carlos */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Work Order Details" />
              <Divider />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="title"
                      name="title"
                      label="Title"
                      value={formik.values.title}
                      onChange={formik.handleChange}
                      error={formik.touched.title && Boolean(formik.errors.title)}
                      helperText={formik.touched.title && formik.errors.title}
                      inputProps={{ maxLength: 100 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="description"
                      name="description"
                      label="Description"
                      multiline
                      rows={6}
                      value={formik.values.description}
                      onChange={formik.handleChange}
                      error={formik.touched.description && Boolean(formik.errors.description)}
                      helperText={formik.touched.description && formik.errors.description}
                      inputProps={{ maxLength: 5000 }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 3. Assignment & Priority - THIRD as requested by Carlos */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Assignment & Priority" />
              <Divider />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Scheduled Date"
                        value={formik.values.scheduledDate}
                        onChange={(newValue) => formik.setFieldValue('scheduledDate', newValue)}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select id="priority" name="priority" value={formik.values.priority} onChange={formik.handleChange}>
                        {priorityOptionsData?.data?.options?.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select id="status" name="status" value={formik.values.status} onChange={formik.handleChange}>
                        {statusOptionsData?.data?.options?.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="price"
                      name="price"
                      label="Price (What customer pays)"
                      type="number"
                      value={formik.values.price}
                      onChange={formik.handleChange}
                      helperText={matchedPricingService ? `Auto-filled from price sheet: ${matchedPricingService.name}${isFetchingPricing ? ' (updating...)' : ''}` : undefined}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="cost"
                      name="cost"
                      label="Cost (What it costs us)"
                      type="number"
                      value={formik.values.cost}
                      onChange={formik.handleChange}
                      helperText={matchedPricingService ? 'Includes labor, material, equipment, and overhead from price sheet.' : undefined}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Assign To</InputLabel>
                      <Select multiple id="assignedTo" name="assignedTo" value={formik.values.assignedTo} onChange={formik.handleChange}>
                        {usersData?.data?.users?.map((user) => (
                            <MenuItem key={user._id} value={user._id}>{user.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 4. Photo Documentation - FOURTH as requested by Carlos */}
          <Grid item xs={12}>
            <PhotoUpload 
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={10}
              workOrderId={id}
            />
          </Grid>
        </Grid>
        <Box mt={3} display="flex" justifyContent="flex-end">
          <Button variant="contained" color="primary" type="submit" disabled={isCreating || isUpdating}>
            {isCreating || isUpdating ? <CircularProgress size={24} /> : (isEdit ? 'Save Changes' : 'Create Work Order')}
          </Button>
        </Box>
      </form>
    </Container>
  );
};

export default WorkOrderForm;

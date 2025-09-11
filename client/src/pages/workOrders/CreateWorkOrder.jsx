import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

import { useCreateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useAuth } from '../../hooks/useAuth';

// Service types matching the database enum
const SERVICE_TYPES = [
  'painting', 'cleaning', 'repair', 'plumbing', 
  'electrical', 'hvac', 'flooring', 'roofing', 'carpentry', 'other'
];

// Apartment status options
const APARTMENT_STATUS_OPTIONS = [
  'vacant', 'occupied', 'under_renovation', 'reserved'
];

const validationSchema = Yup.object({
  title: Yup.string()
    .required('Title is required')
    .max(100, 'Title cannot be longer than 100 characters'),
  description: Yup.string()
    .required('Description is required'),
  building: Yup.string()
    .required('Building is required'),
  apartmentNumber: Yup.string()
    .max(20, 'Apartment number cannot be longer than 20 characters'),
  block: Yup.string()
    .max(50, 'Block cannot be longer than 50 characters'),
  apartmentStatus: Yup.string()
    .oneOf(APARTMENT_STATUS_OPTIONS, 'Invalid apartment status'),
  priority: Yup.string()
    .oneOf(['low', 'medium', 'high', 'urgent'], 'Invalid priority'),
  scheduledDate: Yup.date()
    .required('Scheduled date is required'),
  estimatedCost: Yup.number()
    .min(0, 'Estimated cost cannot be negative'),
  services: Yup.array().of(
    Yup.object({
      type: Yup.string()
        .oneOf(SERVICE_TYPES, 'Invalid service type')
        .required('Service type is required'),
      description: Yup.string()
        .required('Service description is required'),
      laborCost: Yup.number()
        .min(0, 'Labor cost cannot be negative'),
      materialCost: Yup.number()
        .min(0, 'Material cost cannot be negative'),
    })
  ),
});

const CreateWorkOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // API queries
  const { data: buildingsData, isLoading: isLoadingBuildings, error: buildingsError } = useGetBuildingsQuery();
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useGetUsersQuery({ role: 'worker' });
  
  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();

  const buildings = buildingsData?.data?.buildings || [];
  const workers = usersData?.data?.users || [];
  
  // Get apartments for selected building
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const availableApartments = selectedBuilding?.apartments || [];

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      building: '',
      apartmentNumber: '',
      block: '',
      apartmentStatus: 'occupied',
      priority: 'medium',
      scheduledDate: new Date(),
      estimatedCost: 0,
      services: [{
        type: '',
        description: '',
        laborCost: 0,
        materialCost: 0,
        status: 'pending',
      }],
      assignedTo: [],
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        console.log('Submitting work order:', values);
        
        // Create FormData for backend compatibility (matches WorkOrderForm pattern)
        const formData = new FormData();
        
        // Add basic fields
        formData.append('title', values.title);
        formData.append('description', values.description || 'Work order created');
        formData.append('building', values.building);
        formData.append('apartmentNumber', values.apartmentNumber || '');
        formData.append('block', values.block || '');
        formData.append('apartmentStatus', values.apartmentStatus || 'occupied');
        formData.append('priority', values.priority || 'medium');
        formData.append('scheduledDate', values.scheduledDate ? values.scheduledDate.toISOString() : new Date().toISOString());
        formData.append('estimatedCost', parseFloat(values.estimatedCost) || 0);
        
        // Add services as JSON string (backend expects this format)
        const processedServices = values.services && values.services.length > 0 ? values.services.map(service => ({
          type: service.type || 'other',
          description: service.description || 'General work',
          laborCost: parseFloat(service.laborCost) || 0,
          materialCost: parseFloat(service.materialCost) || 0,
          status: service.status || 'pending'
        })) : [{
          type: 'other',
          description: 'General work',
          laborCost: 0,
          materialCost: 0,
          status: 'pending'
        }];
        formData.append('services', JSON.stringify(processedServices));
        
        // Add assignedTo as JSON string (backend expects this format)
        const processedAssignedTo = values.assignedTo && values.assignedTo.length > 0 ? values.assignedTo.map(workerId => ({
          worker: workerId,
          assignedBy: user._id,
          status: 'pending'
        })) : [];
        formData.append('assignedTo', JSON.stringify(processedAssignedTo));
        
        // Add user fields
        formData.append('createdBy', user._id);
        formData.append('updatedBy', user._id);
        
        // Add photos if any
        if (values.photos && values.photos.length > 0) {
          values.photos.forEach((photo, index) => {
            if (photo.file) {
              formData.append('photos', photo.file);
            }
          });
        }

        console.log('Processed work order FormData for backend');
        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
          console.log(key, typeof value === 'object' ? 'File object' : value);
        }

        await createWorkOrder(formData).unwrap();
        toast.success('Work order created successfully');
        navigate('/work-orders');
      } catch (error) {
        console.error('Failed to create work order:', error);
        const errorMessage = error?.data?.message || error?.message || 'Failed to create work order';
        toast.error(errorMessage);
      }
    },
  });

  // Handle building selection
  const handleBuildingSelection = (buildingId) => {
    if (buildingId && buildings.length > 0) {
      const building = buildings.find(b => b._id === buildingId);
      if (building) {
        setSelectedBuilding(building);
      }
    }
  };

  const addService = () => {
    formik.setFieldValue('services', [
      ...formik.values.services,
      {
        type: '',
        description: '',
        laborCost: 0,
        materialCost: 0,
        status: 'pending',
      }
    ]);
  };

  const removeService = (index) => {
    const newServices = formik.values.services.filter((_, i) => i !== index);
    formik.setFieldValue('services', newServices);
  };

  const updateService = (index, field, value) => {
    const newServices = [...formik.values.services];
    newServices[index] = { ...newServices[index], [field]: value };
    formik.setFieldValue('services', newServices);
  };

  const addWorker = (workerId) => {
    if (!formik.values.assignedTo.includes(workerId)) {
      formik.setFieldValue('assignedTo', [...formik.values.assignedTo, workerId]);
    }
  };

  const removeWorker = (workerId) => {
    const newAssignedTo = formik.values.assignedTo.filter(id => id !== workerId);
    formik.setFieldValue('assignedTo', newAssignedTo);
  };

  const isLoading = isLoadingBuildings || isLoadingUsers;

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (buildingsError || usersError) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Error loading data: {buildingsError?.message || usersError?.message || 'Unknown error'}
        </Alert>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton 
            onClick={() => navigate('/work-orders')} 
            color="primary"
            disabled={isCreating}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Create New Work Order
          </Typography>
        </Box>

        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Basic Information" />
                <CardContent>
                  <TextField
                    fullWidth
                    name="title"
                    label="Title"
                    value={formik.values.title}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.title && Boolean(formik.errors.title)}
                    helperText={formik.touched.title && formik.errors.title}
                    margin="normal"
                  />

                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    name="description"
                    label="Description"
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.description && Boolean(formik.errors.description)}
                    helperText={formik.touched.description && formik.errors.description}
                    margin="normal"
                  />

                  <FormControl 
                    fullWidth 
                    margin="normal"
                    error={formik.touched.building && Boolean(formik.errors.building)}
                  >
                    <InputLabel>Building</InputLabel>
                    <Select
                      name="building"
                      value={formik.values.building}
                      onChange={(e) => {
                        const buildingId = e.target.value;
                        formik.setFieldValue('building', buildingId);
                        handleBuildingSelection(buildingId);
                        // Reset apartment fields
                        formik.setFieldValue('apartmentNumber', '');
                        formik.setFieldValue('block', '');
                      }}
                      onBlur={formik.handleBlur}
                      label="Building"
                    >
                      {buildings.map((building) => (
                        <MenuItem key={building._id} value={building._id}>
                          {building.name} - {building.address}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {formik.touched.building && formik.errors.building}
                    </FormHelperText>
                  </FormControl>

                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Apartment Number</InputLabel>
                        <Select
                          name="apartmentNumber"
                          value={formik.values.apartmentNumber}
                          onChange={(e) => {
                            const apartmentNumber = e.target.value;
                            formik.setFieldValue('apartmentNumber', apartmentNumber);
                            // Auto-fill block when apartment is selected
                            if (apartmentNumber) {
                              const selectedApartment = availableApartments.find(apt => apt.number === apartmentNumber);
                              if (selectedApartment) {
                                formik.setFieldValue('block', selectedApartment.block);
                                formik.setFieldValue('apartmentStatus', selectedApartment.status);
                              }
                            }
                          }}
                          onBlur={formik.handleBlur}
                          label="Apartment Number"
                          disabled={!formik.values.building}
                        >
                          <MenuItem value="">Select Apartment</MenuItem>
                          {availableApartments.map((apartment) => (
                            <MenuItem key={apartment._id} value={apartment.number}>
                              {apartment.number} - Block {apartment.block} - Floor {apartment.floor}
                            </MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          {!formik.values.building ? 'Select a building first' : ('Choose from available apartments')}
                        </FormHelperText>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        name="block"
                        label="Block"
                        value={formik.values.block}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.block && Boolean(formik.errors.block)}
                        helperText={formik.touched.block && formik.errors.block || 'Auto-filled from apartment selection'}
                      />
                    </Grid>
                  </Grid>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>Apartment Status</InputLabel>
                    <Select
                      name="apartmentStatus"
                      value={formik.values.apartmentStatus}
                      onChange={formik.handleChange}
                      label="Apartment Status"
                    >
                      {APARTMENT_STATUS_OPTIONS.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>Priority</InputLabel>
                    <Select
                      name="priority"
                      value={formik.values.priority}
                      onChange={formik.handleChange}
                      label="Priority"
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>

            {/* Scheduling & Costs */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Scheduling & Costs" />
                <CardContent>
                  <DatePicker
                    label="Scheduled Date"
                    value={formik.values.scheduledDate}
                    onChange={(newValue) => formik.setFieldValue('scheduledDate', newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        margin="normal"
                        error={formik.touched.scheduledDate && Boolean(formik.errors.scheduledDate)}
                        helperText={formik.touched.scheduledDate && formik.errors.scheduledDate}
                      />
                    )}
                  />

                  <TextField
                    fullWidth
                    type="number"
                    name="estimatedCost"
                    label="Estimated Cost ($)"
                    value={formik.values.estimatedCost}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.estimatedCost && Boolean(formik.errors.estimatedCost)}
                    helperText={formik.touched.estimatedCost && formik.errors.estimatedCost}
                    margin="normal"
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </CardContent>
              </Card>

              {/* Worker Assignment */}
              <Card sx={{ mt: 2 }}>
                <CardHeader title="Worker Assignment" />
                <CardContent>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Assign Workers</InputLabel>
                    <Select
                      value=""
                      onChange={(e) => addWorker(e.target.value)}
                      label="Assign Workers"
                    >
                      {workers
                        .filter(worker => !formik.values.assignedTo.includes(worker._id))
                        .map((worker) => (
                          <MenuItem key={worker._id} value={worker._id}>
                            {worker.name} - {worker.email}
                          </MenuItem>
                        ))}
                    </Select>
                    <FormHelperText>Select workers to assign to this work order</FormHelperText>
                  </FormControl>

                  {/* Assigned Workers Display */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Assigned Workers ({formik.values.assignedTo.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {formik.values.assignedTo.map((workerId) => {
                        const worker = workers.find(w => w._id === workerId);
                        return worker ? (
                          <Chip
                            key={workerId}
                            label={worker.name}
                            onDelete={() => removeWorker(workerId)}
                            color="primary"
                            variant="outlined"
                          />
                        ) : null;
                      })}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Services */}
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Services"
                  action={
                    <Button
                      startIcon={<AddIcon />}
                      onClick={addService}
                      variant="outlined"
                      size="small"
                    >
                      Add Service
                    </Button>
                  }
                />
                <CardContent>
                  {/* Photo Upload Section */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Photos
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<PhotoCameraIcon />}
                      sx={{ mb: 2 }}
                    >
                      Upload Photos
                      <input
                        type="file"
                        hidden
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.target.files);
                          const photoObjects = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
                          formik.setFieldValue('photos', [...formik.values.photos, ...photoObjects]);
                        }}
                      />
                    </Button>
                    {formik.values.photos && formik.values.photos.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {formik.values.photos.map((photo, index) => (
                          <Box key={index} sx={{ position: 'relative' }}>
                            <img
                              src={photo.preview || photo.url}
                              alt={`Preview ${index + 1}`}
                              style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }}
                            />
                            <IconButton
                              size="small"
                              sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'error.main', color: 'white' }}
                              onClick={() => {
                                const newPhotos = formik.values.photos.filter((_, i) => i !== index);
                                formik.setFieldValue('photos', newPhotos);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                  {formik.values.services.map((service, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6">Service {index + 1}</Typography>
                          {formik.values.services.length > 1 && (
                            <IconButton
                              onClick={() => removeService(index)}
                              color="error"
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                              <InputLabel>Service Type</InputLabel>
                              <Select
                                value={service.type}
                                onChange={(e) => updateService(index, 'type', e.target.value)}
                                label="Service Type"
                              >
                                {SERVICE_TYPES.map((type) => (
                                  <MenuItem key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Service Description"
                              value={service.description}
                              onChange={(e) => updateService(index, 'description', e.target.value)}
                              multiline
                              rows={2}
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Labor Cost ($)"
                              value={service.laborCost === 0 ? '' : service.laborCost}
                              onChange={(e) => {
                                const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                updateService(index, 'laborCost', value);
                              }}
                              placeholder="0.00"
                              inputProps={{ min: 0, step: 0.01 }}
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Material Cost ($)"
                              value={service.materialCost === 0 ? '' : service.materialCost}
                              onChange={(e) => {
                                const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                updateService(index, 'materialCost', value);
                              }}
                              placeholder="0.00"
                              inputProps={{ min: 0, step: 0.01 }}
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField
                              fullWidth
                              label="Total Cost ($)"
                              value={`$${(service.laborCost + service.materialCost).toFixed(2)}`}
                              InputProps={{ readOnly: true }}
                              variant="filled"
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/work-orders')}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Work Order'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Container>
    </LocalizationProvider>
  );
};

export default CreateWorkOrder;

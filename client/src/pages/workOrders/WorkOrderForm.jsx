import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Divider,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  CloudUpload as CloudUploadIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

import { 
  useGetWorkOrderQuery,
  useCreateWorkOrderMutation,
  useUpdateWorkOrderMutation
} from '../../features/workOrders/workOrdersApiSlice';
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
  estimatedCompletionDate: Yup.date(),
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
      photos: Yup.array(),
  assignedTo: Yup.array().of(
    Yup.object({
      worker: Yup.string().required('Worker is required'),
    })
  ),
});

const WorkOrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  // API queries
  const { data: workOrderData, isLoading: isLoadingWorkOrder } = useGetWorkOrderQuery(id, {
    skip: !isEdit
  });
  const { data: buildingsData, isLoading: isLoadingBuildings } = useGetBuildingsQuery();
  const { data: workersData, isLoading: isLoadingWorkers } = useGetUsersQuery({ role: 'worker' });
  
  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();

  const buildings = buildingsData?.data?.buildings || [];
  const workers = workersData?.data?.users || [];
  
  // State for selected building
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
      estimatedCompletionDate: null,
      estimatedCost: 0,
      services: [],
      assignedTo: [],
      photos: [],
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        // Create FormData for file uploads
        const formData = new FormData();
        
        // Add all form fields
        Object.keys(values).forEach(key => {
          if (key === 'photos') {
            // Handle photos separately
            values.photos.forEach((photo, index) => {
              if (photo.file) {
                formData.append('photos', photo.file);
              }
            });
          } else if (key === 'services' || key === 'assignedTo') {
            // Handle arrays
            formData.append(key, JSON.stringify(values[key]));
          } else if (values[key] !== null && values[key] !== undefined) {
            formData.append(key, values[key]);
          }
        });
        
        // Add user info
        formData.append('createdBy', user._id);
        formData.append('updatedBy', user._id);

        if (isEdit && id) {
          await updateWorkOrder({ id, formData }).unwrap();
          toast.success('Work order updated successfully');
          navigate(`/work-orders/${id}/details`);
        } else {
          const result = await createWorkOrder(formData).unwrap();
          toast.success('Work order created successfully');
          navigate(`/work-orders/${result.data._id}/details`);
        }
      } catch (error) {
        console.error('Failed to save work order:', error);
        const errorMessage = error?.data?.message || error?.message || 'Failed to save work order';
        toast.error(errorMessage);
      }
    },
  });

  // Load work order data when editing
  useEffect(() => {
    if (isEdit && workOrderData?.data) {
      const workOrder = workOrderData.data;
      
      // Set the selected building first
      if (workOrder.building) {
        const building = buildings.find(b => b._id === workOrder.building._id);
        setSelectedBuilding(building);
      }
      
      formik.setValues({
        title: workOrder.title || '',
        description: workOrder.description || '',
        building: workOrder.building?._id || '',
        apartmentNumber: workOrder.apartmentNumber || '',
        block: workOrder.block || '',
        apartmentStatus: workOrder.apartmentStatus || 'occupied',
        priority: workOrder.priority || 'medium',
        scheduledDate: workOrder.scheduledDate ? new Date(workOrder.scheduledDate) : new Date(),
        estimatedCompletionDate: workOrder.estimatedCompletionDate ? new Date(workOrder.estimatedCompletionDate) : null,
        estimatedCost: workOrder.estimatedCost || 0,
        services: workOrder.services || [],
        assignedTo: workOrder.assignedTo || [],
        photos: [], // Reset photos for edit mode
      });
    }
  }, [isEdit, workOrderData, buildings]);

  // Handle building selection for both create and edit modes
  useEffect(() => {
    if (formik.values.building && !isEdit) {
      const building = buildings.find(b => b._id === formik.values.building);
      setSelectedBuilding(building);
      // Reset apartment fields when building changes in create mode
      formik.setFieldValue('apartmentNumber', '');
      formik.setFieldValue('block', '');
    }
  }, [formik.values.building, buildings, isEdit]);

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

  const addWorker = () => {
    formik.setFieldValue('assignedTo', [
      ...formik.values.assignedTo,
      {
        worker: '',
        assignedBy: user._id,
        status: 'pending',
      }
    ]);
  };

  const removeWorker = (index) => {
    const newAssignedTo = formik.values.assignedTo.filter((_, i) => i !== index);
    formik.setFieldValue('assignedTo', newAssignedTo);
  };

  const updateWorker = (index, field, value) => {
    const newAssignedTo = [...formik.values.assignedTo];
    newAssignedTo[index] = { ...newAssignedTo[index], [field]: value };
    formik.setFieldValue('assignedTo', newAssignedTo);
  };

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    formik.setFieldValue('photos', [...formik.values.photos, ...newPhotos]);
  };

  const removePhoto = (index) => {
    const newPhotos = formik.values.photos.filter((_, i) => i !== index);
    formik.setFieldValue('photos', newPhotos);
  };

  const isLoading = isLoadingWorkOrder || isLoadingBuildings || isLoadingWorkers;
  const isSubmitting = isCreating || isUpdating;

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
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
            disabled={isSubmitting}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isEdit ? 'Edit Work Order' : 'Create New Work Order'}
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
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="Building"
                    >
                      {buildings.map((building) => (
                        <MenuItem key={building._id} value={building._id}>
                          {building.name}
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
                            formik.setFieldValue('apartmentNumber', e.target.value);
                            // Auto-fill block when apartment is selected
                            const selectedApartment = availableApartments.find(apt => apt.number === e.target.value);
                            if (selectedApartment) {
                              formik.setFieldValue('block', selectedApartment.block);
                              formik.setFieldValue('apartmentStatus', selectedApartment.status);
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
                          {!formik.values.building ? 'Select a building first' : 'Choose from available apartments'}
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
                        helperText={formik.touched.block && formik.errors.block}
                        disabled={true} // Auto-filled from apartment selection
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

                  <DatePicker
                    label="Estimated Completion Date"
                    value={formik.values.estimatedCompletionDate}
                    onChange={(newValue) => formik.setFieldValue('estimatedCompletionDate', newValue)}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        fullWidth 
                        margin="normal"
                        error={formik.touched.estimatedCompletionDate && Boolean(formik.errors.estimatedCompletionDate)}
                        helperText={formik.touched.estimatedCompletionDate && formik.errors.estimatedCompletionDate}
                      />
                    )}
                  />

                  <TextField
                    fullWidth
                    name="estimatedCost"
                    label="Estimated Cost ($)"
                    type="number"
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
            </Grid>

            {/* Services */}
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Services"
                  action={
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={addService}
                    >
                      Add Service
                    </Button>
                  }
                />
                <CardContent>
                  {formik.values.services.length === 0 ? (
                    <Typography color="text.secondary" align="center" py={4}>
                      No services added yet. Click "Add Service" to get started.
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell width={120}>Labor Cost</TableCell>
                            <TableCell width={120}>Material Cost</TableCell>
                            <TableCell width={50}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {formik.values.services.map((service, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={service.type}
                                    onChange={(e) => updateService(index, 'type', e.target.value)}
                                    displayEmpty
                                  >
                                    <MenuItem value="">Select Type</MenuItem>
                                    {SERVICE_TYPES.map((type) => (
                                      <MenuItem key={type} value={type}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  fullWidth
                                  size="small"
                                  value={service.description}
                                  onChange={(e) => updateService(index, 'description', e.target.value)}
                                  placeholder="Service description"
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="number"
                                  value={service.laborCost}
                                  onChange={(e) => updateService(index, 'laborCost', parseFloat(e.target.value) || 0)}
                                  inputProps={{ min: 0, step: 0.01 }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="number"
                                  value={service.materialCost}
                                  onChange={(e) => updateService(index, 'materialCost', parseFloat(e.target.value) || 0)}
                                  inputProps={{ min: 0, step: 0.01 }}
                                />
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => removeService(index)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Worker Assignment */}
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Worker Assignment"
                  action={
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={addWorker}
                    >
                      Assign Worker
                    </Button>
                  }
                />
                <CardContent>
                  {formik.values.assignedTo.length === 0 ? (
                    <Typography color="text.secondary" align="center" py={4}>
                      No workers assigned yet. Click "Assign Worker" to get started.
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Worker</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell width={50}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {formik.values.assignedTo.map((assignment, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={assignment.worker}
                                    onChange={(e) => updateWorker(index, 'worker', e.target.value)}
                                    displayEmpty
                                  >
                                    <MenuItem value="">Select Worker</MenuItem>
                                    {workers.map((worker) => (
                                      <MenuItem key={worker._id} value={worker._id}>
                                        {worker.name}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={assignment.status?.charAt(0).toUpperCase() + assignment.status?.slice(1) || 'Pending'}
                                  color="default"
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => removeWorker(index)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Photo Upload */}
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Photos"
                  action={
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<PhotoCameraIcon />}
                    >
                      Upload Photos
                      <input
                        type="file"
                        hidden
                        multiple
                        accept="image/*"
                        onChange={handlePhotoUpload}
                      />
                    </Button>
                  }
                />
                <CardContent>
                  {formik.values.photos.length === 0 ? (
                    <Box 
                      sx={{ 
                        border: '2px dashed #ccc', 
                        borderRadius: 2, 
                        p: 4, 
                        textAlign: 'center',
                        cursor: 'pointer'
                      }}
                      onClick={() => document.querySelector('input[type="file"]').click()}
                    >
                      <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Upload Photos
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Click here or use the button above to upload photos
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {formik.values.photos.map((photo, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                          <Card>
                            <Box sx={{ position: 'relative' }}>
                              <img
                                src={photo.preview}
                                alt={photo.name}
                                style={{
                                  width: '100%',
                                  height: 200,
                                  objectFit: 'cover',
                                  borderRadius: '4px 4px 0 0'
                                }}
                              />
                              <IconButton
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  bgcolor: 'rgba(0,0,0,0.5)',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: 'rgba(0,0,0,0.7)',
                                  }
                                }}
                                size="small"
                                onClick={() => removePhoto(index)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                            <CardContent sx={{ p: 1 }}>
                              <Typography variant="caption" noWrap>
                                {photo.name}
                              </Typography>
                              <Typography variant="caption" display="block" color="text.secondary">
                                {(photo.size / 1024 / 1024).toFixed(2)} MB
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/work-orders')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting || !formik.isValid}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {isSubmitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Work Order' : 'Create Work Order')}
            </Button>
          </Box>
        </form>
      </Container>
    </LocalizationProvider>
  );
};

export default WorkOrderForm;

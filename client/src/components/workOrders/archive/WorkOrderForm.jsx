import React, { useState, useEffect, useMemo } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Autocomplete,
  Chip,
  CircularProgress,
  Alert,
  InputAdornment,
  Skeleton,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import PhotoUpload from '../common/PhotoUpload';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';
import ErrorBoundary from '../common/ErrorBoundary';

const WorkOrderForm = ({
  initialValues: initialValuesProp = {},
  onSubmit,
  isSubmitting = false,
  onCancel,
  mode = 'create',
}) => {
  const { t } = useTranslation();
  const { 
    data: buildingsData, 
    isLoading: buildingsLoading, 
    error: buildingsError,
    refetch: refetchBuildings 
  } = useGetBuildingsQuery();
  
  const { 
    data: workersData, 
    isLoading: workersLoading, 
    error: workersError,
    refetch: refetchWorkers 
  } = useGetWorkersQuery();
  
  // Get buildings and workers from the API response
  const buildings = buildingsData?.data?.buildings || [];
  const workers = workersData?.data?.workers || [];
  
  // Log initial values and loading states for debugging
  console.log('WorkOrderForm - initialValuesProp:', initialValuesProp);
  console.log('WorkOrderForm - loading states:', { 
    buildingsLoading, 
    workersLoading,
    buildingsError: buildingsError?.data?.message || buildingsError?.message,
    workersError: workersError?.data?.message || workersError?.message,
    buildingsCount: buildings.length,
    workersCount: workers.length,
    buildings: buildings.map(b => ({ id: b._id, name: b.name }))
  });
  
  // Form validation schema
  const validationSchema = Yup.object({
    title: Yup.string().required('Title is required'),
    building: Yup.string().required('Building is required'),
    description: Yup.string().required('Description is required'),
    startDate: Yup.date().required('Start date is required'),
    endDate: Yup.date()
      .required('End date is required')
      .when('startDate', (startDate, schema) => {
        return startDate ? schema.min(startDate, 'End date must be after start date') : schema;
      }),
    scheduledDate: Yup.date().required('Scheduled date is required'),
    priority: Yup.string()
      .oneOf(['low', 'medium', 'high', 'urgent'], 'Invalid priority')
      .required('Priority is required'),
    status: Yup.string()
      .oneOf(['pending', 'in_progress', 'on_hold', 'completed', 'cancelled'], 'Invalid status')
      .required('Status is required'),
    apartmentStatus: Yup.string()
      .oneOf(['vacant', 'occupied', 'under_renovation', 'reserved'], 'Invalid status')
      .required('Apartment status is required'),
    assignedTo: Yup.array().of(
      Yup.object({
        worker: Yup.string().required('Worker is required'),
        status: Yup.string()
          .oneOf(['pending', 'in_progress', 'completed', 'rejected'], 'Invalid status')
          .required('Status is required'),
      })
    ),
    services: Yup.array().of(
      Yup.object({
        type: Yup.string().required('Service type is required'),
        description: Yup.string().required('Description is required'),
        laborCost: Yup.number().min(0, 'Cost cannot be negative'),
        materialCost: Yup.number().min(0, 'Cost cannot be negative'),
        status: Yup.string()
          .oneOf(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], 'Invalid status')
          .required('Status is required'),
      })
    ),
  });

  // Set up initial values with defaults and null checks
  const initialValues = useMemo(() => {
    const safeInitialValues = initialValuesProp || {};
    
    const formatDate = (dateString) => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
      } catch (e) {
        return null;
      }
    };

    // Default values for a new work order
    const now = new Date();
    const defaultStartDate = new Date(now);
    defaultStartDate.setHours(9, 0, 0, 0); // Set to 9 AM
    
    const defaultEndDate = new Date(defaultStartDate);
    defaultEndDate.setHours(17, 0, 0, 0); // Set to 5 PM
    
    return {
      _id: safeInitialValues._id || undefined,
      title: safeInitialValues.title || '',
      building: safeInitialValues.building || '',
      apartmentNumber: safeInitialValues.apartmentNumber || '',
      block: safeInitialValues.block || '',
      floor: safeInitialValues.floor || '',
      apartmentStatus: safeInitialValues.apartmentStatus || 'vacant',
      description: safeInitialValues.description || '',
      priority: safeInitialValues.priority || 'medium',
      status: safeInitialValues.status || 'pending',
      assignedTo: Array.isArray(safeInitialValues.assignedTo) 
        ? safeInitialValues.assignedTo.map(worker => ({
            worker: worker.worker?._id || worker.worker || '',
            status: worker.status || 'pending',
            notes: worker.notes || '',
            timeSpent: worker.timeSpent || { hours: 0, minutes: 0 },
            materials: Array.isArray(worker.materials) ? worker.materials : []
          }))
        : [],
      services: Array.isArray(safeInitialValues.services) 
        ? safeInitialValues.services.map(service => ({
            ...service,
            type: service.type || '',
            description: service.description || '',
            status: service.status || 'pending',
            laborCost: service.laborCost || 0,
            materialCost: service.materialCost || 0,
            notes: Array.isArray(service.notes) ? service.notes : []
          }))
        : [{
            type: '',
            description: '',
            status: 'pending',
            laborCost: 0,
            materialCost: 0,
            notes: []
          }],
      startDate: formatDate(safeInitialValues.startDate) || defaultStartDate,
      endDate: formatDate(safeInitialValues.endDate) || defaultEndDate,
      scheduledDate: formatDate(safeInitialValues.scheduledDate) || defaultStartDate,
      estimatedCompletionDate: formatDate(safeInitialValues.estimatedCompletionDate) || defaultEndDate,
      estimatedCost: safeInitialValues.estimatedCost || 0,
      actualCost: safeInitialValues.actualCost || 0,
      notes: safeInitialValues.notes || '',
      photos: Array.isArray(safeInitialValues.photos) ? safeInitialValues.photos : [],
      createdAt: formatDate(safeInitialValues.createdAt) || now.toISOString(),
      updatedAt: formatDate(safeInitialValues.updatedAt) || now.toISOString(),
      createdBy: safeInitialValues.createdBy || '',
      updatedBy: safeInitialValues.updatedBy || '',
      completedBy: safeInitialValues.completedBy || '',
      completedAt: formatDate(safeInitialValues.completedAt)
    };
  }, [initialValuesProp]);

  const formik = useFormik({
    enableReinitialize: true, // Allow form to reinitialize when initialValues change
    initialValues,
    validationSchema,
    onSubmit: async (values, { setSubmitting, setFieldError, setStatus, setErrors }) => {
      try {
        // Format dates to ISO strings
        const formattedValues = {
          ...values,
          startDate: values.startDate.toISOString(),
          endDate: values.endDate.toISOString(),
          scheduledDate: values.scheduledDate.toISOString(),
          estimatedCompletionDate: values.estimatedCompletionDate?.toISOString(),
          estimatedCost: totalEstimatedCost,
          
          // Format assigned workers
          assignedTo: values.assignedTo
            .filter(assignment => assignment.worker) // Only include valid assignments
            .map(assignment => ({
              worker: assignment.worker._id || assignment.worker, // Handle both object and string IDs
              status: assignment.status || 'pending',
              notes: assignment.notes || '',
              timeSpent: assignment.timeSpent || { hours: 0, minutes: 0 },
              materials: Array.isArray(assignment.materials) ? assignment.materials : []
            })),
            
          // Format services
          services: values.services.map(service => ({
            ...service,
            laborCost: Number(service.laborCost) || 0,
            materialCost: Number(service.materialCost) || 0,
            status: service.status || 'pending',
            notes: Array.isArray(service.notes) ? service.notes : []
          })),
          
          // Ensure photos is an array
          photos: Array.isArray(values.photos) ? values.photos : []
        };
        
        console.log('Submitting work order with values:', formattedValues);
        await onSubmit(formattedValues);
        
        // Show success message
        toast.success(
          mode === 'edit' 
            ? 'Work order updated successfully!'
            : 'Work order created successfully!'
        );
        
      } catch (error) {
        console.error('Error saving work order:', error);
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save work order';
        
        // Show error toast
        toast.error(errorMessage);
        
        // Set form status for error display
        setStatus({ submitError: errorMessage });
        
        // Handle field-specific errors from API
        if (error?.response?.data?.errors) {
          const formErrors = {};
          Object.entries(error.response.data.errors).forEach(([field, message]) => {
            formErrors[field] = Array.isArray(message) ? message[0] : message;
          });
          setErrors(formErrors);
        }
        
        // Re-throw to allow parent component to handle the error if needed
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Service type options
  const serviceTypeOptions = [
    { value: 'painting', label: 'Painting' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'repair', label: 'Repair' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'hvac', label: 'HVAC' },
    { value: 'flooring', label: 'Flooring' },
    { value: 'roofing', label: 'Roofing' },
    { value: 'carpentry', label: 'Carpentry' },
    { value: 'other', label: 'Other' },
  ];

  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  // Apartment status options
  const apartmentStatusOptions = [
    { value: 'vacant', label: 'Vacant' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'under_renovation', label: 'Under Renovation' },
    { value: 'reserved', label: 'Reserved' },
  ];

  // Worker status options
  const workerStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
  ];

  // Handle worker assignment
  const handleWorkerAssignment = (index, field, value) => {
    const updatedWorkers = [...formik.values.assignedTo];
    updatedWorkers[index] = { ...updatedWorkers[index], [field]: value };
    formik.setFieldValue('assignedTo', updatedWorkers);
  };

  // Add a new worker assignment
  const addWorkerAssignment = () => {
    formik.setFieldValue('assignedTo', [
      ...formik.values.assignedTo,
      { worker: '', status: 'pending', notes: '', timeSpent: { hours: 0, minutes: 0 }, materials: [] }
    ]);
  };

  // Remove a worker assignment
  const removeWorkerAssignment = (index) => {
    const updatedWorkers = [...formik.values.assignedTo];
    updatedWorkers.splice(index, 1);
    formik.setFieldValue('assignedTo', updatedWorkers);
  };

  // Handle service changes
  const handleServiceChange = (index, field, value) => {
    const updatedServices = [...formik.values.services];
    updatedServices[index] = { ...updatedServices[index], [field]: value };
    formik.setFieldValue('services', updatedServices);
  };

  // Add a new service
  const addService = () => {
    formik.setFieldValue('services', [
      ...formik.values.services,
      { type: '', description: '', status: 'pending', laborCost: 0, materialCost: 0, notes: [] }
    ]);
  };

  // Remove a service
  const removeService = (index) => {
    const updatedServices = [...formik.values.services];
    updatedServices.splice(index, 1);
    formik.setFieldValue('services', updatedServices.length ? updatedServices : [{
      type: '', description: '', status: 'pending', laborCost: 0, materialCost: 0, notes: []
    }]);
  };

  // Handle photo upload
  const handlePhotoUpload = (newPhotos) => {
    formik.setFieldValue('photos', [...formik.values.photos, ...newPhotos]);
  };

  // Handle photo deletion
  const handlePhotoDelete = (index) => {
    const newPhotos = [...formik.values.photos];
    newPhotos.splice(index, 1);
    formik.setFieldValue('photos', newPhotos);
  };

  // Calculate total estimated cost
  const totalEstimatedCost = formik.values.services.reduce((sum, service) => {
    return sum + (Number(service.laborCost) || 0) + (Number(service.materialCost) || 0);
  }, 0);

  // Show loading state with more detailed skeleton
  if (buildingsLoading || workersLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Loading form data...</Typography>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Skeleton variant="rectangular" width={120} height={40} sx={{ mr: 2 }} />
          <Skeleton variant="rectangular" width={120} height={40} />
        </Box>
      </Box>
    );
  }

  if (buildingsError || workersError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading required data. Please try again.
          {buildingsError && <div>Buildings: {buildingsError.data?.message || buildingsError.message}</div>}
          {workersError && <div>Workers: {workersError.data?.message || workersError.message}</div>}
        </Alert>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            if (buildingsError) refetchBuildings();
            if (workersError) refetchWorkers();
          }}
          startIcon={<RefreshIcon />}
        >
          Retry Loading Data
        </Button>
      </Box>
    );
  }

  // Show error state with more details
  if (buildingsError || workersError) {
    const errorMessage = buildingsError?.message || workersError?.message || 'Error loading data';
    console.error('Error loading form data:', { buildingsError, workersError });
    
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
        <Button 
          variant="outlined" 
          onClick={() => window.location.reload()}
          startIcon={<RefreshIcon />}
        >
          Reload Page
        </Button>
      </Box>
    );

  // Main form content
  const FormContent = () => (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardContent>
          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={3}>
              {/* Form Header */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {mode === 'edit' ? 'Edit Work Order' : 'Create New Work Order'}
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>

              {/* Form Status and Errors */}
              {formik.status?.submitError && (
                <Grid item xs={12}>
                  <Alert 
                    severity="error" 
                    onClose={() => formik.setStatus({})}
                    sx={{ mb: 2 }}
                  >
                    {formik.status.submitError}
                  </Alert>
                </Grid>
              )}

              {/* Form Error Alert */}
              {formik.status?.error && (
                <Grid item xs={12}>
                  <Alert 
                    severity="error" 
                    onClose={() => formik.setStatus({})}
                    sx={{ mb: 2 }}
                  >
                    {formik.status.error}
                  </Alert>
                </Grid>
              )}
              {/* Title */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="title"
                  name="title"
                  label="Title *"
                  value={formik.values.title}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.title && Boolean(formik.errors.title)}
                  helperText={formik.touched.title && formik.errors.title}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>

              {/* Building */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.building && Boolean(formik.errors.building)}
                  margin="normal"
                >
                  <InputLabel>Building *</InputLabel>
                  <Select
                    name="building"
                    value={formik.values.building}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Building *"
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
              </Grid>

              {/* Apartment Number */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="apartmentNumber"
                  name="apartmentNumber"
                  label="Apartment Number"
                  value={formik.values.apartmentNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.apartmentNumber && Boolean(formik.errors.apartmentNumber)}
                  helperText={formik.touched.apartmentNumber && formik.errors.apartmentNumber}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>

              {/* Block */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  id="block"
                  name="block"
                  label="Block"
                  value={formik.values.block}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.block && Boolean(formik.errors.block)}
                  helperText={formik.touched.block && formik.errors.block}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>

              {/* Floor */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  id="floor"
                  name="floor"
                  label="Floor"
                  type="number"
                  value={formik.values.floor}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.floor && Boolean(formik.errors.floor)}
                  helperText={formik.touched.floor && formik.errors.floor}
                  margin="normal"
                  variant="outlined"
                  inputProps={{ min: 0 }}
                />
              </Grid>

              {/* Apartment Status */}
              <Grid item xs={12} md={4}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.apartmentStatus && Boolean(formik.errors.apartmentStatus)}
                  margin="normal"
                >
                  <InputLabel>Apartment Status *</InputLabel>
                  <Select
                    name="apartmentStatus"
                    value={formik.values.apartmentStatus}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Apartment Status *"
                  >
                    {apartmentStatusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {formik.touched.apartmentStatus && formik.errors.apartmentStatus}
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Priority */}
              <Grid item xs={12} md={4}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.priority && Boolean(formik.errors.priority)}
                  margin="normal"
                >
                  <InputLabel>Priority *</InputLabel>
                  <Select
                    name="priority"
                    value={formik.values.priority}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Priority *"
                  >
                    {priorityOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {formik.touched.priority && formik.errors.priority}
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Status */}
              <Grid item xs={12} md={4}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.status && Boolean(formik.errors.status)}
                  margin="normal"
                >
                  <InputLabel>Status *</InputLabel>
                  <Select
                    name="status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Status *"
                  >
                    {statusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {formik.touched.status && formik.errors.status}
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Description *"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                  margin="normal"
                  variant="outlined"
                  multiline
                  rows={4}
                />
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="notes"
                  name="notes"
                  label="Additional Notes"
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.notes && Boolean(formik.errors.notes)}
                  helperText={formik.touched.notes && formik.errors.notes}
                  margin="normal"
                  variant="outlined"
                  multiline
                  rows={3}
                />
              </Grid>

              {/* Dates Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Schedule</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              {/* Start Date */}
              <Grid item xs={12} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date *"
                    value={formik.values.startDate}
                    onChange={(date) => formik.setFieldValue('startDate', date)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        margin="normal"
                        error={formik.touched.startDate && Boolean(formik.errors.startDate)}
                        helperText={formik.touched.startDate && formik.errors.startDate}
                      />
                    )}
                  />
                </LocalizationProvider>
              </Grid>

              {/* End Date */}
              <Grid item xs={12} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="End Date *"
                    value={formik.values.endDate}
                    onChange={(date) => formik.setFieldValue('endDate', date)}
                    minDate={formik.values.startDate}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        margin="normal"
                        error={formik.touched.endDate && Boolean(formik.errors.endDate)}
                        helperText={formik.touched.endDate && formik.errors.endDate}
                      />
                    )}
                  />
                </LocalizationProvider>
              </Grid>

              {/* Scheduled Date */}
              <Grid item xs={12} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Scheduled Date *"
                    value={formik.values.scheduledDate}
                    onChange={(date) => formik.setFieldValue('scheduledDate', date)}
                    minDate={new Date()}
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
                </LocalizationProvider>
              </Grid>

              {/* Estimated Completion Date */}
              <Grid item xs={12} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Estimated Completion Date"
                    value={formik.values.estimatedCompletionDate}
                    onChange={(date) => formik.setFieldValue('estimatedCompletionDate', date)}
                    minDate={formik.values.startDate}
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
                </LocalizationProvider>
              </Grid>

              {/* Estimated Cost */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  id="estimatedCost"
                  name="estimatedCost"
                  label="Estimated Cost"
                  type="number"
                  value={formik.values.estimatedCost}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.estimatedCost && Boolean(formik.errors.estimatedCost)}
                  helperText={formik.touched.estimatedCost && formik.errors.estimatedCost}
                  margin="normal"
                  variant="outlined"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>

              {/* Actual Cost */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  id="actualCost"
                  name="actualCost"
                  label="Actual Cost"
                  type="number"
                  value={formik.values.actualCost}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.actualCost && Boolean(formik.errors.actualCost)}
                  helperText={formik.touched.actualCost && formik.errors.actualCost}
                  margin="normal"
                  variant="outlined"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>

              {/* Assigned Workers Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Assigned Workers</Typography>
                <Divider sx={{ mb: 2 }} />
                
                {formik.values.assignedTo.map((worker, index) => (
                  <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth margin="normal">
                          <InputLabel>Worker *</InputLabel>
                          <Select
                            name={`assignedTo[${index}].worker`}
                            value={worker.worker || ''}
                            onChange={(e) => handleWorkerAssignment(index, 'worker', e.target.value)}
                            label="Worker *"
                          >
                            {workers.map((w) => (
                              <MenuItem key={w._id} value={w._id}>
                                {w.name} ({w.role || 'No Role'})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth margin="normal">
                          <InputLabel>Status</InputLabel>
                          <Select
                            name={`assignedTo[${index}].status`}
                            value={worker.status || 'pending'}
                            onChange={(e) => handleWorkerAssignment(index, 'status', e.target.value)}
                            label="Status"
                          >
                            {workerStatusOptions.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Notes"
                          name={`assignedTo[${index}].notes`}
                          value={worker.notes || ''}
                          onChange={(e) => handleWorkerAssignment(index, 'notes', e.target.value)}
                          margin="normal"
                          variant="outlined"
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <IconButton
                          color="error"
                          onClick={() => removeWorkerAssignment(index)}
                          aria-label="Remove worker"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Box>
                ))}
                
                <Button
                  variant="outlined"
                  onClick={addWorkerAssignment}
                  startIcon={<AddIcon />}
                  sx={{ mt: 1 }}
                >
                  Add Worker
                </Button>
              </Grid>

              {/* Services Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Services</Typography>
                <Divider sx={{ mb: 2 }} />
                
                {formik.values.services.map((service, index) => (
                  <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth margin="normal">
                          <InputLabel>Service Type *</InputLabel>
                          <Select
                            name={`services[${index}].type`}
                            value={service.type || ''}
                            onChange={(e) => handleServiceChange(index, 'type', e.target.value)}
                            label="Service Type *"
                          >
                            {serviceTypeOptions.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth margin="normal">
                          <InputLabel>Status</InputLabel>
                          <Select
                            name={`services[${index}].status`}
                            value={service.status || 'pending'}
                            onChange={(e) => handleServiceChange(index, 'status', e.target.value)}
                            label="Status"
                          >
                            {statusOptions.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Description *"
                          name={`services[${index}].description`}
                          value={service.description || ''}
                          onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                          margin="normal"
                          variant="outlined"
                          multiline
                          rows={2}
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Labor Cost"
                          type="number"
                          name={`services[${index}].laborCost`}
                          value={service.laborCost || 0}
                          onChange={(e) => handleServiceChange(index, 'laborCost', parseFloat(e.target.value) || 0)}
                          margin="normal"
                          variant="outlined"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            inputProps: { min: 0, step: 0.01 }
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Material Cost"
                          type="number"
                          name={`services[${index}].materialCost`}
                          value={service.materialCost || 0}
                          onChange={(e) => handleServiceChange(index, 'materialCost', parseFloat(e.target.value) || 0)}
                          margin="normal"
                          variant="outlined"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            inputProps: { min: 0, step: 0.01 }
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Notes"
                          name={`services[${index}].notes`}
                          value={service.notes?.join('\n') || ''}
                          onChange={(e) => handleServiceChange(index, 'notes', e.target.value.split('\n'))}
                          margin="normal"
                          variant="outlined"
                          multiline
                          rows={2}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => removeService(index)}
                          disabled={formik.values.services.length <= 1}
                        >
                          Remove Service
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                ))}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={addService}
                    startIcon={<AddIcon />}
                  >
                    Add Service
                  </Button>
                  
                  <Typography variant="h6">
                    Total Estimated Cost: ${totalEstimatedCost.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>

              {/* Photo Upload */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Photos</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <PhotoUpload
                  onUpload={handlePhotoUpload}
                  maxFiles={5}
                  acceptedFormats={['image/jpeg', 'image/png']}
                  maxSize={5 * 1024 * 1024} // 5MB
                />
                
                {Array.isArray(formik.values.photos) && formik.values.photos.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle1" gutterBottom>
                      Uploaded Photos ({formik.values.photos.length}/5)
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={2}>
                      {formik.values.photos.map((photo, index) => (
                        <Box 
                          key={index} 
                          position="relative"
                          sx={{
                            border: '1px solid #ddd',
                            borderRadius: 1,
                            p: 1,
                            '&:hover': {
                              boxShadow: 1,
                            },
                          }}
                        >
                          <img
                            src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)}
                            alt={`Work order photo ${index + 1}`}
                            style={{
                              width: 120,
                              height: 120,
                              objectFit: 'cover',
                              borderRadius: 4,
                              display: 'block',
                            }}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handlePhotoDelete(index)}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                              },
                            }}
                            aria-label="Delete photo"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box 
                  display="flex" 
                  justifyContent="space-between" 
                  alignItems="center"
                  mt={4}
                  pt={2}
                  sx={{
                    borderTop: '1px solid rgba(0, 0, 0, 0.12)',
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    startIcon={<ArrowBackIcon />}
                    size="large"
                    sx={{ minWidth: 180 }}
                  >
                    Cancel
                  </Button>
                  
                  <Box display="flex" gap={2}>
                    {mode === 'edit' && (
                      <Button
                        type="button"
                        variant="outlined"
                        color="primary"
                        onClick={() => {
                          // Save as draft functionality
                          formik.handleSubmit({
                            ...formik.values,
                            status: 'draft'
                          });
                        }}
                        disabled={isSubmitting}
                        sx={{ minWidth: 180 }}
                      >
                        {isSubmitting ? 'Saving...' : 'Save as Draft'}
                      </Button>
                    )}
                    
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={isSubmitting || !formik.isValid}
                      startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
                      size="large"
                      sx={{ 
                        minWidth: 220,
                        '&.Mui-disabled': {
                          backgroundColor: 'action.disabledBackground',
                          color: 'text.disabled'
                        }
                      }}
                    >
                      {isSubmitting
                        ? 'Saving...'
                        : mode === 'edit'
                        ? 'Update Work Order'
                        : 'Create Work Order'}
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </LocalizationProvider>
  </ErrorBoundary>
);


export default WorkOrderForm;

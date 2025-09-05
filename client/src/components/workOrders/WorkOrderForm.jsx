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
import ErrorBoundary from '../common/ErrorBoundary';

const WorkOrderForm = ({
  initialValues: initialValuesProp = {},
  onSubmit,
  isSubmitting = false,
  onCancel,
  mode = 'create',
}) => {
  const { t } = useTranslation();
  const { data: buildingsData, isLoading: buildingsLoading, error: buildingsError } = useGetBuildingsQuery();
  const { data: workersData, isLoading: workersLoading, error: workersError } = useGetWorkersQuery();
  
  // Log initial values and loading states for debugging
  console.log('WorkOrderForm - initialValuesProp:', initialValuesProp);
  console.log('WorkOrderForm - loading states:', { buildingsLoading, workersLoading });
  
  // Form validation schema
  const validationSchema = Yup.object({
    title: Yup.string().required('Title is required'),
    workType: Yup.string().required('Work type is required'),
    status: Yup.string().required('Status is required'),
    building: Yup.string().required('Building is required'),
    description: Yup.string().required('Description is required'),
  });

  // Form initial values with proper fallbacks
  const initialValues = useMemo(() => ({
    title: initialValuesProp.title || '',
    workType: initialValuesProp.workType || '',
    status: initialValuesProp.status || 'pending',
    building: initialValuesProp.building || '',
    apartmentNumber: initialValuesProp.apartmentNumber || '',
    description: initialValuesProp.description || '',
    scheduledDate: initialValuesProp.scheduledDate || null,
    estimatedCompletionDate: initialValuesProp.estimatedCompletionDate || null,
    assignedWorkers: initialValuesProp.assignedTo?.map(a => a.worker) || [],
    photos: initialValuesProp.photos || [],
    priority: initialValuesProp.priority || 'medium',
    workSubType: initialValuesProp.workSubType || ''
  }), [initialValuesProp]);

  const formik = useFormik({
    enableReinitialize: true, // Allow form to reinitialize when initialValues change
    initialValues,
    validationSchema,
    onSubmit: async (values, { setSubmitting, setFieldError, setStatus, setErrors }) => {
      try {
        console.log('Form submitted with values:', values);
        await onSubmit(values);
      } catch (error) {
        console.error('Error saving work order:', error);
        const errorMessage = error?.message || 'Failed to save work order';
        setStatus({ error: errorMessage });
        
        // Handle field-specific errors
        if (error?.errors) {
          const formErrors = {};
          Object.entries(error.errors).forEach(([field, message]) => {
            formErrors[field] = Array.isArray(message) ? message[0] : message;
          });
          setErrors(formErrors);
        }
        
        throw error; // Re-throw to allow parent component to handle the error
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Work type options
  const workTypeOptions = [
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'repair', label: 'Repair' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'installation', label: 'Installation' },
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

  // Handle worker assignment
  const handleWorkerAssignment = (event, newValue) => {
    formik.setFieldValue('assignedWorkers', newValue);
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

  // Show loading state with more detailed skeleton
  if (buildingsLoading || workersLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Skeleton variant="rectangular" width={120} height={40} sx={{ mr: 2 }} />
          <Skeleton variant="rectangular" width={120} height={40} />
        </Box>
      </Box>
    );
  }

  // Show error state
  if (buildingsError || workersError) {
    return (
      <Alert severity="error">
        {buildingsError?.message || workersError?.message || 'Error loading data'}
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {mode === 'edit' ? 'Edit Work Order' : 'Create New Work Order'}
          </Typography>

          {/* Form Error Alert */}
          {formik.status?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formik.status.error}
            </Alert>
          )}

          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={3}>
              {/* Title */}
              {mode === 'create' && (
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
              )}

              {/* Work Type */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.workType && Boolean(formik.errors.workType)}
                  margin="normal"
                >
                  <InputLabel>Work Type *</InputLabel>
                  <Select
                    name="workType"
                    value={formik.values.workType}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Work Type *"
                  >
                    {workTypeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {formik.touched.workType && formik.errors.workType}
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Status */}
              <Grid item xs={12} md={6}>
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

              {/* Building */}
              <Grid item xs={12}>
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
                    {buildingsData?.map((building) => (
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

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
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
                />
              </Grid>

              {/* Scheduled Date */}
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Scheduled Date"
                  value={formik.values.scheduledDate}
                  onChange={(date) => formik.setFieldValue('scheduledDate', date)}
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
              </Grid>

              {/* Estimated Completion Date */}
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Estimated Completion Date"
                  value={formik.values.estimatedCompletionDate}
                  onChange={(date) => formik.setFieldValue('estimatedCompletionDate', date)}
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
              </Grid>

              {/* Assigned Workers */}
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={workersData || []}
                  getOptionLabel={(worker) => worker.name || ''}
                  value={formik.values.assignedWorkers}
                  onChange={handleWorkerAssignment}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Assigned Workers"
                      margin="normal"
                      placeholder="Select workers"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option._id}
                        label={option.name}
                      />
                    ))
                  }
                />
              </Grid>

              {/* Photo Upload */}
              <Grid item xs={12}>
                <PhotoUpload
                  onUpload={handlePhotoUpload}
                  maxFiles={5}
                  acceptedFormats={['image/jpeg', 'image/png']}
                />
                {formik.values.photos.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Uploaded Photos:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={2}>
                      {formik.values.photos.map((photo, index) => (
                        <Box key={index} position="relative">
                          <img
                            src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)}
                            alt={`Work order ${index + 1}`}
                            style={{
                              width: 100,
                              height: 100,
                              objectFit: 'cover',
                              borderRadius: 4,
                            }}
                          />
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handlePhotoDelete(index)}
                            style={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              minWidth: 'auto',
                              padding: 2,
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </Button>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" mt={3}>
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    startIcon={<ArrowBackIcon />}
                  >
                    Back to List
                  </Button>
                  <Box>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={isSubmitting}
                      startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
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
  );
};

export default WorkOrderForm;

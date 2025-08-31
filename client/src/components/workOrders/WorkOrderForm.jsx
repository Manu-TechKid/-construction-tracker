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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import PhotoUpload from '../common/PhotoUpload';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const WorkOrderForm = ({
  initialValues: initialValuesProp,
  onSubmit,
  isSubmitting,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { data: buildingsData, isLoading: buildingsLoading, error: buildingsError } = useGetBuildingsQuery();
  const { data: workersData, isLoading: workersLoading, error: workersError } = useGetWorkersQuery();
  
  // Extract buildings and workers from API response
  const buildings = useMemo(() => {
    if (!buildingsData) return [];
    if (buildingsData.data?.buildings && Array.isArray(buildingsData.data.buildings)) {
      return buildingsData.data.buildings;
    } else if (Array.isArray(buildingsData.data)) {
      return buildingsData.data;
    } else if (Array.isArray(buildingsData)) {
      return buildingsData;
    }
    return [];
  }, [buildingsData]);

  const workers = useMemo(() => {
    if (!workersData) return [];
    if (workersData.data?.workers && Array.isArray(workersData.data.workers)) {
      return workersData.data.workers;
    } else if (Array.isArray(workersData.data)) {
      return workersData.data;
    } else if (Array.isArray(workersData)) {
      return workersData;
    }
    return [];
  }, [workersData]);

  const [photos, setPhotos] = useState([]);
  const [submitError, setSubmitError] = useState([]);
  const [availableBlocks, setAvailableBlocks] = useState([]);

  // Work type options matching database model
  const workTypeOptions = [
    { value: 'painting', label: 'Painting' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'repairs', label: 'Repairs' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'hvac', label: 'HVAC' },
    { value: 'flooring', label: 'Flooring' },
    { value: 'roofing', label: 'Roofing' },
    { value: 'carpentry', label: 'Carpentry' },
    { value: 'other', label: 'Other' },
  ];

  // Work sub-type options based on work type
  const workSubTypeOptions = {
    cleaning: [
      '1 Bedroom Cleaning',
      '2 Bedroom Cleaning',
      '3 Bedroom Cleaning',
      'Studio Cleaning',
      'Deep Cleaning',
      'Move-in Cleaning',
      'Move-out Cleaning',
    ],
    painting: [
      'Interior Painting',
      'Exterior Painting',
      'Touch-up Painting',
      'Full Apartment Paint',
      'Ceiling Painting',
      'Trim Painting',
    ],
    repairs: [
      'Plumbing Repair',
      'Electrical Repair',
      'Drywall Repair',
      'Door Repair',
      'Window Repair',
      'Appliance Repair',
    ],
    maintenance: [
      'HVAC Maintenance',
      'Appliance Maintenance',
      'General Maintenance',
      'Preventive Maintenance',
    ],
    inspection: [
      'Move-in Inspection',
      'Move-out Inspection',
      'Routine Inspection',
      'Safety Inspection',
    ],
    other: ['Custom Work', 'Emergency Repair', 'Consultation'],
  };

  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'success' },
    { value: 'medium', label: 'Medium', color: 'warning' },
    { value: 'high', label: 'High', color: 'error' },
    { value: 'urgent', label: 'Urgent', color: 'error' },
  ];

  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  // Apartment status options
  const apartmentStatusOptions = [
    { value: 'vacant', label: 'Vacant' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'under_renovation', label: 'Under Renovation' },
    { value: 'reserved', label: 'Reserved' },
  ];

  const validationSchema = Yup.object({
    building: Yup.string().required('Building is required'),
    apartmentNumber: Yup.string().required('Apartment number is required'),
    block: Yup.string().required('Block is required'),
    apartmentStatus: Yup.string().required('Apartment status is required'),
    workType: Yup.string().required('Work type is required'),
    workSubType: Yup.string().required('Work sub-type is required'),
    description: Yup.string().required('Description is required'),
    priority: Yup.string().required('Priority is required'),
    status: Yup.string().required('Status is required'),
    estimatedCost: Yup.number().min(0, 'Cost must be positive'),
    actualCost: Yup.number().min(0, 'Actual cost must be positive'),
    scheduledDate: Yup.date().nullable(),
    estimatedCompletionDate: Yup.date().nullable(),
  });

  const initialValues = {
    building: '',
    apartmentNumber: '',
    block: '',
    apartmentStatus: 'vacant',
    workType: '',
    workSubType: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    estimatedCost: 0,
    actualCost: 0,
    scheduledDate: null,
    estimatedCompletionDate: null,
    assignedTo: [],
    photos: [],
    ...initialValuesProp,
  };

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: async (values) => {
      try {
        setSubmitError('');
        
        // Process photos - convert to proper format for backend
        const processedPhotos = photos.map(photo => ({
          url: photo.url,
          description: photo.caption || '',
          type: photo.type || 'other',
          uploadedAt: new Date().toISOString()
        }));
        
        const formData = {
          ...values,
          photos: processedPhotos,
          assignedTo: values.assignedTo.map(worker => worker._id || worker),
        };
        
        await onSubmit(formData);
      } catch (error) {
        console.error('Form submission error:', error);
        setSubmitError(error?.data?.message || 'Failed to submit form');
        toast.error(error?.data?.message || 'Failed to submit form');
      }
    },
  });

  // Update available blocks when building changes
  useEffect(() => {
    if (formik.values.building) {
      const selectedBuilding = buildings.find(b => b._id === formik.values.building);
      if (selectedBuilding?.apartments) {
        const blocks = [...new Set(selectedBuilding.apartments.map(apt => apt.block))];
        setAvailableBlocks(blocks);
      }
    }
  }, [formik.values.building, buildings]);

  // Get available sub-types based on work type
  const availableSubTypes = workSubTypeOptions[formik.values.workType] || [];

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  if (buildingsLoading || workersLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (buildingsError || workersError) {
    return (
      <Alert severity="error">
        Error loading form data: {buildingsError?.message || workersError?.message}
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Work Order Details
          </Typography>

          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <Box component="form" onSubmit={formik.handleSubmit}>
            <Grid container spacing={3}>
              {/* Building Selection */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.building && Boolean(formik.errors.building)}
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
                  {formik.touched.building && formik.errors.building && (
                    <FormHelperText>{formik.errors.building}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Apartment Number */}
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  name="apartmentNumber"
                  label="Apartment Number *"
                  value={formik.values.apartmentNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.apartmentNumber && Boolean(formik.errors.apartmentNumber)}
                  helperText={formik.touched.apartmentNumber && formik.errors.apartmentNumber}
                />
              </Grid>

              {/* Block */}
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  name="block"
                  label="Block *"
                  value={formik.values.block}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.block && Boolean(formik.errors.block)}
                  helperText={formik.touched.block && formik.errors.block}
                />
              </Grid>

              {/* Apartment Status */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.apartmentStatus && Boolean(formik.errors.apartmentStatus)}
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
                  {formik.touched.apartmentStatus && formik.errors.apartmentStatus && (
                    <FormHelperText>{formik.errors.apartmentStatus}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Work Type */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.workType && Boolean(formik.errors.workType)}
                >
                  <InputLabel>Work Type *</InputLabel>
                  <Select
                    name="workType"
                    value={formik.values.workType}
                    onChange={(e) => {
                      formik.handleChange(e);
                      // Reset workSubType when workType changes
                      formik.setFieldValue('workSubType', '');
                    }}
                    onBlur={formik.handleBlur}
                    label="Work Type *"
                  >
                    {workTypeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.workType && formik.errors.workType && (
                    <FormHelperText>{formik.errors.workType}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Work Sub-Type */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.workSubType && Boolean(formik.errors.workSubType)}
                  disabled={!formik.values.workType}
                >
                  <InputLabel>Service *</InputLabel>
                  <Select
                    name="workSubType"
                    value={formik.values.workSubType}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Service *"
                  >
                    {availableSubTypes.map((subType) => (
                      <MenuItem key={subType} value={subType}>
                        {subType}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.workSubType && formik.errors.workSubType && (
                    <FormHelperText>{formik.errors.workSubType}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Priority */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.priority && Boolean(formik.errors.priority)}
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
                  {formik.touched.priority && formik.errors.priority && (
                    <FormHelperText>{formik.errors.priority}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Status */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.status && Boolean(formik.errors.status)}
                >
                  <InputLabel>Work Status *</InputLabel>
                  <Select
                    name="status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Work Status *"
                  >
                    {statusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.status && formik.errors.status && (
                    <FormHelperText>{formik.errors.status}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Scheduled Date */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.scheduledDate && Boolean(formik.errors.scheduledDate)}
                >
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Scheduled Date"
                      value={formik.values.scheduledDate}
                      onChange={(newValue) => {
                        formik.setFieldValue('scheduledDate', newValue);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} />
                      )}
                    />
                  </LocalizationProvider>
                  {formik.touched.scheduledDate && formik.errors.scheduledDate && (
                    <FormHelperText>{formik.errors.scheduledDate}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Estimated Completion Date */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.estimatedCompletionDate && Boolean(formik.errors.estimatedCompletionDate)}
                >
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Estimated Completion Date"
                      value={formik.values.estimatedCompletionDate}
                      onChange={(newValue) => {
                        formik.setFieldValue('estimatedCompletionDate', newValue);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} />
                      )}
                    />
                  </LocalizationProvider>
                  {formik.touched.estimatedCompletionDate && formik.errors.estimatedCompletionDate && (
                    <FormHelperText>{formik.errors.estimatedCompletionDate}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Assigned Workers */}
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={workers}
                  getOptionLabel={(option) => option.name || ''}
                  value={formik.values.assignedTo}
                  onChange={(event, newValue) => {
                    formik.setFieldValue('assignedTo', newValue);
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.name}
                        {...getTagProps({ index })}
                        key={option._id}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Assign Workers"
                      placeholder="Select workers to assign"
                    />
                  )}
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  name="description"
                  label="Description *"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                />
              </Grid>

              {/* Estimated Cost */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  name="estimatedCost"
                  label="Estimated Cost"
                  value={formik.values.estimatedCost}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.estimatedCost && Boolean(formik.errors.estimatedCost)}
                  helperText={formik.touched.estimatedCost && formik.errors.estimatedCost}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Actual Cost */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  name="actualCost"
                  label="Actual Cost"
                  value={formik.values.actualCost}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.actualCost && Boolean(formik.errors.actualCost)}
                  helperText={formik.touched.actualCost && formik.errors.actualCost}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Photos */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Photos
                </Typography>
                <PhotoUpload
                  photos={photos}
                  onPhotosChange={setPhotos}
                  maxPhotos={10}
                />
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                    startIcon={isSubmitting && <CircularProgress size={20} />}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Work Order'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
};

export default WorkOrderForm;

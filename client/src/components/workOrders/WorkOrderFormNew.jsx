import React, { useState } from 'react';
import { useFormik } from 'formik';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Grid,
  Typography,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Divider,
  CircularProgress,
  Alert,
  Stack,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhotoUpload from '../common/PhotoUpload';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { workOrderValidationSchema } from './utils/validationSchema';
import { getInitialValues, formatFormDataForSubmit, calculateTotalEstimatedCost } from './utils/formHelpers';
import WorkerAssignmentSection from './sections/WorkerAssignmentSection';
import ServicesSection from './sections/ServicesSection';

const WorkOrderForm = ({
  initialValues: initialValuesProp = {},
  onSubmit: onSubmitProp,
  isSubmitting = false,
  onCancel,
  mode = 'create',
}) => {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState(initialValuesProp.photos || []);
  
  // Fetch buildings and workers data
  const { 
    data: buildingsData, 
    isLoading: buildingsLoading, 
    isError: buildingsError,
    refetch: refetchBuildings 
  } = useGetBuildingsQuery();
  
  const { 
    data: workersData, 
    isLoading: workersLoading, 
    isError: workersError,
    refetch: refetchWorkers 
  } = useGetWorkersQuery();

  // Initialize form with default values
  const initialValues = getInitialValues(initialValuesProp);

  // Form submission handler
  const onSubmit = async (values, { setSubmitting, setStatus }) => {
    try {
      // Format the form data for submission
      const formData = formatFormDataForSubmit(values, calculateTotalEstimatedCost(values.services));
      
      // Add photos to the form data
      formData.photos = photos;
      
      // Call the onSubmit prop with the formatted data
      await onSubmitProp(formData);
      
      // Show success message
      toast.success(
        mode === 'create' 
          ? t('workOrder.createSuccess') 
          : t('workOrder.updateSuccess')
      );
      
      setStatus({ success: true });
    } catch (error) {
      console.error('Form submission error:', error);
      setStatus({ success: false, error: error.message || 'An error occurred' });
      
      // Show error message
      toast.error(
        error.response?.data?.message || 
        (mode === 'create' 
          ? t('workOrder.createError') 
          : t('workOrder.updateError'))
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Formik configuration
  const formik = useFormik({
    initialValues,
    validationSchema: workOrderValidationSchema,
    onSubmit,
    enableReinitialize: true,
  });

  // Handle photo upload
  const handlePhotoUpload = (newPhotos) => {
    setPhotos([...photos, ...newPhotos]);
  };

  // Handle photo deletion
  const handlePhotoDelete = (index) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  // Handle building selection
  const handleBuildingChange = (event) => {
    const buildingId = event.target.value;
    const selectedBuilding = buildingsData?.find(b => b._id === buildingId);
    
    formik.setFieldValue('building', buildingId);
    
    // If the building has an address, update the location fields
    if (selectedBuilding?.address) {
      formik.setFieldValue('location', selectedBuilding.address);
    }
  };

  // Render loading state
  if (buildingsLoading || workersLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>Loading form data...</Typography>
      </Box>
    );
  }

  // Render error state
  if (buildingsError || workersError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load form data. Please try again.
        <Button 
          onClick={() => {
            if (buildingsError) refetchBuildings();
            if (workersError) refetchWorkers();
          }}
          sx={{ ml: 2 }}
        >
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <form onSubmit={formik.handleSubmit}>
        <Card>
          <CardContent>
            {/* Form Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" component="h2">
                {mode === 'create' ? 'Create Work Order' : 'Edit Work Order'}
              </Typography>
              <Box>
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={onCancel}
                  sx={{ mr: 1 }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={formik.isSubmitting || isSubmitting}
                >
                  {formik.isSubmitting || isSubmitting ? (
                    <CircularProgress size={24} />
                  ) : mode === 'create' ? (
                    'Create Work Order'
                  ) : (
                    'Update Work Order'
                  )}
                </Button>
              </Box>
            </Box>

            {formik.status?.error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {formik.status.error}
              </Alert>
            )}

            {/* Basic Information Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
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
                
                <Grid item xs={12} md={6}>
                  <FormControl 
                    fullWidth 
                    margin="normal"
                    error={formik.touched.building && Boolean(formik.errors.building)}
                  >
                    <InputLabel>Building *</InputLabel>
                    <Select
                      name="building"
                      value={formik.values.building || ''}
                      onChange={handleBuildingChange}
                      onBlur={formik.handleBlur}
                      label="Building *"
                    >
                      {buildingsData?.map((building) => (
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
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    id="apartmentNumber"
                    name="apartmentNumber"
                    label="Apartment / Unit #"
                    value={formik.values.apartmentNumber || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    id="block"
                    name="block"
                    label="Block"
                    value={formik.values.block || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    id="floor"
                    name="floor"
                    label="Floor"
                    value={formik.values.floor || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    margin="normal"
                    variant="outlined"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="description"
                    name="description"
                    label="Description *"
                    value={formik.values.description || ''}
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
              </Grid>
            </Box>

            {/* Worker Assignment Section */}
            <WorkerAssignmentSection
              values={formik.values}
              errors={formik.errors}
              touched={formik.touched}
              handleChange={formik.handleChange}
              handleBlur={formik.handleBlur}
              setFieldValue={formik.setFieldValue}
              workers={workersData || []}
            />

            {/* Services Section */}
            <ServicesSection
              values={formik.values}
              errors={formik.errors}
              touched={formik.touched}
              handleChange={formik.handleChange}
              handleBlur={formik.handleBlur}
              setFieldValue={formik.setFieldValue}
              calculateTotalEstimatedCost={calculateTotalEstimatedCost}
            />

            {/* Photos Section */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Photos & Attachments
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <PhotoUpload
                photos={photos}
                onUpload={handlePhotoUpload}
                onDelete={handlePhotoDelete}
                maxPhotos={10}
              />
            </Box>

            {/* Form Actions */}
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={formik.isSubmitting || isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={formik.isSubmitting || isSubmitting}
                startIcon={formik.isSubmitting || isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {mode === 'create' ? 'Create Work Order' : 'Update Work Order'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </form>
    </LocalizationProvider>
  );
};

export default WorkOrderForm;

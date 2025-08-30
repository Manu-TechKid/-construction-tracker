import React, { useState, useEffect } from 'react';
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
  const buildings = buildingsData?.data?.buildings || [];
  const workers = workersData?.data?.workers || [];
  const [photos, setPhotos] = useState([]);
  const [submitError, setSubmitError] = useState([]);
  const [availableBlocks, setAvailableBlocks] = useState([]);

  const validationSchema = Yup.object().shape({
    building: Yup.string().required(t('validation.required')),
    apartmentNumber: Yup.string().required(t('validation.required')),
    block: Yup.string().required(t('validation.required')),
    apartmentStatus: Yup.string().required('Apartment status is required'),
    workType: Yup.string().required(t('validation.required')),
    workSubType: Yup.string().required(t('validation.required')),
    description: Yup.string().required(t('validation.required')),
    priority: Yup.string().required(t('validation.required')),
    startDate: Yup.date().required(t('validation.required')),
    estimatedCost: Yup.number(),
    notes: Yup.string(),
    assignedTo: Yup.string().required(t('validation.required')),
  });

  const initialValues = {
    building: initialValuesProp?.building || '',
    apartmentNumber: '',
    block: '',
    apartmentStatus: '',
    workType: '',
    workSubType: '',
    description: '',
    priority: 'medium',
    startDate: new Date(),
    estimatedCost: '',
    notes: '',
    assignedTo: '',
    ...initialValuesProp,
  };

  // Work type options based on DSJ Company services
  const workTypes = {
    'painting': ['1 Room Painting', '2 Room Painting', '3 Room Painting', 'Door Painting', 'Ceiling Painting', 'Cabinet Painting', 'Hallway Painting', 'Paint Touch-ups'],
    'cleaning': ['1 Bedroom Cleaning', '2 Bedroom Cleaning', '3 Bedroom Cleaning', 'Touch-up Cleaning', 'Heavy Cleaning', 'Carpet Cleaning', 'Gutter Cleaning'],
    'repairs': ['Air Conditioning Repair', 'Door Repair', 'Ceiling Repair', 'Floor Repair', 'General Maintenance', 'Plumbing Repair', 'Electrical Repair']
  };

  const workSubTypes = workTypes;

  const priorities = [
    { value: 'low', label: t('workOrders.priorities.low') },
    { value: 'medium', label: t('workOrders.priorities.medium') },
    { value: 'high', label: t('workOrders.priorities.high') },
    { value: 'urgent', label: t('workOrders.priorities.urgent') },
  ];

  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setSubmitError('');
        setSubmitting(true);
        
        const workOrderData = {
          ...values,
          photos: photos.map(photo => photo.file || photo),
          estimatedCost: values.estimatedCost ? parseFloat(values.estimatedCost) : undefined,
        };
        
        await onSubmit(workOrderData);
      } catch (error) {
        console.error('Form submission error:', error);
        const errorMessage = error?.data?.message || error?.message || t('workOrders.messages.error');
        setSubmitError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (buildingsError || workersError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {t('errors.general')}
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component="form" onSubmit={formik.handleSubmit}>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}
        
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('workOrders.details')}
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.building && Boolean(formik.errors.building)}
                  disabled={buildingsLoading}
                >
                  <InputLabel>{t('workOrders.building')}</InputLabel>
                  <Select
                    name="building"
                    value={formik.values.building}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label={t('workOrders.building')}
                    disabled={buildingsLoading}
                  >
                    {buildings.map((building) => (
                      <MenuItem key={building._id} value={building._id}>
                        {building.name} - [{building.administratorName || 'No Administrator'}]
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.building && formik.errors.building && (
                    <FormHelperText>{formik.errors.building}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  name="apartmentNumber"
                  label={t('apartments.number')}
                  value={formik.values.apartmentNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.apartmentNumber && Boolean(formik.errors.apartmentNumber)}
                  helperText={formik.touched.apartmentNumber && formik.errors.apartmentNumber}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  name="block"
                  label="Block"
                  value={formik.values.block}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.block && Boolean(formik.errors.block)}
                  helperText={formik.touched.block && formik.errors.block}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.apartmentStatus && Boolean(formik.errors.apartmentStatus)}
                  required
                >
                  <InputLabel>Apartment Status *</InputLabel>
                  <Select
                    name="apartmentStatus"
                    value={formik.values.apartmentStatus}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Apartment Status *"
                  >
                    <MenuItem value="">
                      <em>Choose Status</em>
                    </MenuItem>
                    <MenuItem value="occupied">Occupied</MenuItem>
                    <MenuItem value="vacant">Vacant</MenuItem>
                    <MenuItem value="under_renovation">Under Renovation</MenuItem>
                    <MenuItem value="reserved">Reserved</MenuItem>
                  </Select>
                  {formik.touched.apartmentStatus && formik.errors.apartmentStatus && (
                    <FormHelperText>{formik.errors.apartmentStatus}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.workType && Boolean(formik.errors.workType)}
                >
                  <InputLabel>{t('workOrders.type')}</InputLabel>
                  <Select
                    name="workType"
                    value={formik.values.workType}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label={t('workOrders.type')}
                  >
                    {Object.keys(workTypes).map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.workType && formik.errors.workType && (
                    <FormHelperText>{formik.errors.workType}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.workSubType && Boolean(formik.errors.workSubType)}
                  disabled={!formik.values.workType}
                >
                  <InputLabel>{t('workOrders.service')}</InputLabel>
                  <Select
                    name="workSubType"
                    value={formik.values.workSubType}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label={t('workOrders.service')}
                  >
                    {(workTypes[formik.values.workType] || []).map((subType) => (
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

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  name="description"
                  label={t('common.description')}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.priority && Boolean(formik.errors.priority)}
                >
                  <InputLabel>{t('workOrders.priority')}</InputLabel>
                  <Select
                    name="priority"
                    value={formik.values.priority}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label={t('workOrders.priority')}
                  >
                    {priorities.map((priority) => (
                      <MenuItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.priority && formik.errors.priority && (
                    <FormHelperText>{formik.errors.priority}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.assignedTo && Boolean(formik.errors.assignedTo)}
                >
                  <InputLabel>{t('workOrders.assignedTo')}</InputLabel>
                  <Select
                    name="assignedTo"
                    value={formik.values.assignedTo}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label={t('workOrders.assignedTo')}
                  >
                    {workers.map((worker) => (
                      <MenuItem key={worker._id} value={worker._id}>
                        {worker.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.assignedTo && formik.errors.assignedTo && (
                    <FormHelperText>{formik.errors.assignedTo}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label={t('workOrders.dueDate')}
                  value={formik.values.startDate}
                  onChange={(date) => formik.setFieldValue('startDate', date)}
                  enableAccessibleFieldDOMStructure={false}
                  slots={{
                    textField: TextField
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: formik.touched.startDate && Boolean(formik.errors.startDate),
                      helperText: formik.touched.startDate && formik.errors.startDate
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="estimatedCost"
                  label={t('workOrders.cost')}
                  type="number"
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

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  name="notes"
                  label={t('workOrders.notes')}
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.notes && Boolean(formik.errors.notes)}
                  helperText={formik.touched.notes && formik.errors.notes}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              Photos
            </Typography>
            <PhotoUpload
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={5}
            />
          </CardContent>
        </Card>

        <Box display="flex" justifyContent="flex-end" gap={2} sx={{ mt: 3 }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
            size="large"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
            size="large"
          >
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default WorkOrderForm;

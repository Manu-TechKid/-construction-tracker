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
  const buildings = buildingsData?.data?.buildings || [];
  const workers = workersData?.data?.workers || [];
  const [photos, setPhotos] = useState([]);
  const [submitError, setSubmitError] = useState([]);
  const [availableBlocks, setAvailableBlocks] = useState([]);

  const validationSchema = Yup.object({
    building: Yup.string().required(t('validation.required')),
    apartmentNumber: Yup.string()
      .required(t('validation.required'))
      .max(20, t('validation.max', { max: 20 })),
    block: Yup.string()
      .required(t('validation.required'))
      .max(50, t('validation.max', { max: 50 })),
    apartmentStatus: Yup.string()
      .required(t('validation.required'))
      .oneOf(['vacant', 'occupied', 'under_renovation', 'reserved'], t('validation.invalid')),
    workType: Yup.string()
      .required(t('validation.required'))
      .oneOf(['painting', 'cleaning', 'repairs', 'maintenance', 'inspection', 'other', 'plumbing', 'electrical', 'hvac', 'flooring', 'roofing', 'carpentry'], t('validation.invalid')),
    workSubType: Yup.string()
      .required(t('validation.required'))
      .max(100, t('validation.max', { max: 100 })),
    description: Yup.string().required(t('validation.required')),
    priority: Yup.string()
      .required(t('validation.required'))
      .oneOf(['low', 'medium', 'high', 'urgent'], t('validation.invalid')),
    estimatedCost: Yup.number()
      .min(0, t('validation.min', { min: 0 }))
      .nullable(),
    notes: Yup.string(),
  });

  const initialValues = {
    building: initialValuesProp?.building || '',
    apartmentNumber: initialValuesProp?.apartmentNumber || '',
    block: initialValuesProp?.block || '',
    apartmentStatus: initialValuesProp?.apartmentStatus || 'vacant',
    workType: initialValuesProp?.workType || '',
    workSubType: initialValuesProp?.workSubType || '',
    description: initialValuesProp?.description || '',
    priority: initialValuesProp?.priority || 'medium',
    startDate: initialValuesProp?.startDate || new Date(),
    estimatedCost: initialValuesProp?.estimatedCost || '',
    notes: initialValuesProp?.notes || '',
    ...initialValuesProp,
  };

  const workTypes = [
    { value: 'painting', label: t('workOrders.types.painting') },
    { value: 'cleaning', label: t('workOrders.types.cleaning') },
    { value: 'repairs', label: t('workOrders.types.repairs') },
    { value: 'maintenance', label: t('workOrders.types.maintenance') },
    { value: 'inspection', label: t('workOrders.types.inspection') },
    { value: 'plumbing', label: t('workOrders.types.plumbing') },
    { value: 'electrical', label: t('workOrders.types.electrical') },
    { value: 'hvac', label: t('workOrders.types.hvac') },
    { value: 'flooring', label: t('workOrders.types.flooring') },
    { value: 'roofing', label: t('workOrders.types.roofing') },
    { value: 'carpentry', label: t('workOrders.types.carpentry') },
    { value: 'other', label: t('workOrders.types.other') }
  ];

  const apartmentStatuses = [
    { value: 'vacant', label: t('workOrders.statuses.vacant') },
    { value: 'occupied', label: t('workOrders.statuses.occupied') },
    { value: 'under_renovation', label: t('workOrders.statuses.under_renovation') },
    { value: 'reserved', label: t('workOrders.statuses.reserved') }
  ];

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
                    {apartmentStatuses.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
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
                    {workTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.workType && formik.errors.workType && (
                    <FormHelperText>{formik.errors.workType}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="workSubType"
                  label={t('workOrders.service')}
                  value={formik.values.workSubType}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.workSubType && Boolean(formik.errors.workSubType)}
                  helperText={formik.touched.workSubType && formik.errors.workSubType}
                />
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

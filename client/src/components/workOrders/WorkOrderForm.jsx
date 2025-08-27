import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  CircularProgress,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import PhotoUpload from '../common/PhotoUpload';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { toast } from 'react-toastify';

const WorkOrderForm = ({
  initialValues: initialValuesProp,
  onSubmit,
  isSubmitting,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { data: buildingsData, isLoading: buildingsLoading, error: buildingsError } = useGetBuildingsQuery();
  const buildings = buildingsData?.data?.buildings || [];
  const [photos, setPhotos] = useState([]);
  const [submitError, setSubmitError] = useState('');

  const validationSchema = Yup.object().shape({
    building: Yup.string().required(t('validation.required')),
    apartmentNumber: Yup.string().required(t('validation.required')),
    block: Yup.string().required(t('validation.required')),
    workType: Yup.string().required(t('validation.required')),
    workSubType: Yup.string().required(t('validation.required')),
    description: Yup.string().required(t('validation.required')),
    priority: Yup.string().required(t('validation.required')),
    startDate: Yup.date().required(t('validation.required')),
  });

  const initialValues = {
    building: initialValuesProp?.building || '',
    apartmentNumber: '',
    block: '',
    workType: '',
    workSubType: '',
    description: '',
    priority: 'medium',
    startDate: new Date(),
    estimatedCost: '',
    notes: '',
    ...initialValuesProp,
  };

  const workTypes = [
    { value: 'plumbing', label: t('workOrders.types.plumbing') },
    { value: 'electrical', label: t('workOrders.types.electrical') },
    { value: 'hvac', label: t('workOrders.types.hvac') },
    { value: 'painting', label: t('workOrders.types.painting') },
    { value: 'flooring', label: t('workOrders.types.flooring') },
    { value: 'appliances', label: t('workOrders.types.appliances') },
    { value: 'general', label: t('workOrders.types.general') },
  ];

  const workSubTypes = {
    plumbing: ['Leak Repair', 'Pipe Installation', 'Drain Cleaning', 'Faucet Repair'],
    electrical: ['Wiring', 'Outlet Installation', 'Light Fixture', 'Circuit Breaker'],
    hvac: ['AC Repair', 'Heating Repair', 'Vent Cleaning', 'Thermostat'],
    painting: ['Interior Painting', 'Exterior Painting', 'Touch-up', 'Primer'],
    flooring: ['Tile Repair', 'Carpet Installation', 'Hardwood Repair', 'Vinyl Installation'],
    appliances: ['Refrigerator', 'Washer/Dryer', 'Dishwasher', 'Oven/Stove'],
    general: ['Door Repair', 'Window Repair', 'Drywall', 'General Maintenance'],
  };

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

  if (buildingsError) {
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
                    startAdornment={buildingsLoading ? (
                      <InputAdornment position="start">
                        <CircularProgress size={20} />
                      </InputAdornment>
                    ) : null}
                  >
                    {buildings.map((building) => (
                      <MenuItem key={building._id} value={building._id}>
                        {building.name} - {building.address}
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
                    {(workSubTypes[formik.values.workType] || []).map((subType) => (
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
                <DatePicker
                  label={t('workOrders.dueDate')}
                  value={formik.values.startDate}
                  onChange={(date) => formik.setFieldValue('startDate', date)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      error={formik.touched.startDate && Boolean(formik.errors.startDate)}
                      helperText={formik.touched.startDate && formik.errors.startDate}
                    />
                  )}
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
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  name="notes"
                  label={t('common.notes')}
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Photos
            </Typography>
            <PhotoUpload
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={5}
            />
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !formik.isValid}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
          >
            {isSubmitting ? t('common.loading') : t('workOrders.create')}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default WorkOrderForm;

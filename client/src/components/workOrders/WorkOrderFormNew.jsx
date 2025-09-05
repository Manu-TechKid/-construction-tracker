import React, { useState, useEffect } from 'react';
import { useFormik, Form, FormikProvider } from 'formik';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
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
  Tabs,
  Tab,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Container,
  LinearProgress,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';

import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { 
  useCreateWorkOrderMutation, 
  useUpdateWorkOrderMutation,
  useGetWorkOrderQuery
} from '../../features/workOrders/workOrdersApiSlice';
import { workOrderValidationSchema } from './utils/validationSchema';
import { getInitialValues, formatFormDataForSubmit, calculateTotalEstimatedCost } from './utils/formHelpers';
import WorkerAssignmentSection from './sections/WorkerAssignmentSection';
import ServicesSection from './sections/ServicesSection';
import PhotoUploadSection from './sections/PhotoUploadSection';

// Tab panel component
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const a11yProps = (index) => ({
  id: `simple-tab-${index}`,
  'aria-controls': `simple-tabpanel-${index}`,
});

const WorkOrderForm = ({
  initialValues: initialValuesProp = {},
  onCancel,
  mode = 'create',
  workOrderId = null
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // API Hooks
  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  
  // Fetch work order data if in edit mode
  const { 
    data: workOrderData, 
    isLoading: isLoadingWorkOrder, 
    isError: workOrderError,
    refetch: refetchWorkOrder 
  } = useGetWorkOrderQuery(workOrderId, { skip: mode !== 'edit' });

  // Form state
  const [activeTab, setActiveTab] = useState(0);
  const [photos, setPhotos] = useState(initialValuesProp.photos || []);
  const isSubmitting = isCreating || isUpdating;
  
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
  const [initialValues, setInitialValues] = useState(getInitialValues(initialValuesProp));

  // Form submission handler
  const onSubmit = async (values, { setSubmitting, setStatus }) => {
    try {
      // Format the form data for submission
      const formData = formatFormDataForSubmit(values, calculateTotalEstimatedCost(values.services || []));
      
      // Add photos to the form data
      formData.photos = photos;
      
      let result;
      if (mode === 'create') {
        result = await createWorkOrder(formData).unwrap();
        toast.success('Work order created successfully!');
        navigate(`/work-orders/${result.data._id}`);
      } else {
        result = await updateWorkOrder({
          id: workOrderId || values._id,
          updates: formData
        }).unwrap();
        toast.success('Work order updated successfully!');
        navigate(`/work-orders/${workOrderId || values._id}`);
      }

      setStatus({ success: true });
      return result;
    } catch (error) {
      console.error('Form submission error:', error);
      const errorMessage = error?.data?.message || error.message || 'An error occurred';
      setStatus({ success: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
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
    validateOnMount: true,
  });

  // Update initial values when workOrderData changes (edit mode)
  useEffect(() => {
    if (mode === 'edit' && workOrderData) {
      const values = getInitialValues(workOrderData);
      setInitialValues(values);
      setPhotos(workOrderData.photos || []);
    }
  }, [workOrderData, mode]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle form reset
  const handleReset = () => {
    formik.resetForm();
    setPhotos(initialValues.photos || []);
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  };

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

  // Loading and error states
  const isLoading = isLoadingWorkOrder || buildingsLoading || workersLoading;
  const hasError = workOrderError || buildingsError || workersError;

  // Show loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {t('common.errorLoadingData')}
        <Button onClick={() => {
          refetchWorkOrder();
          refetchBuildings();
          refetchWorkers();
        }} color="inherit" size="small">
          {t('common.retry')}
        </Button>
      </Alert>
    );
  }

  // Render the form
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <FormikProvider value={formik}>
        <Form>
          <Container maxWidth="lg">
            <Card>
              <CardContent>
                {/* Form Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" component="h2">
                    {mode === 'create' ? t('workOrder.createTitle') : t('workOrder.editTitle')}
                  </Typography>
                </Box>

                {/* Form Tabs */}
                <Box sx={{ width: '100%' }}>
                  <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    aria-label="work order form tabs"
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    <Tab label={t('workOrder.tabs.basicInfo')} {...a11yProps(0)} />
                    <Tab label={t('workOrder.tabs.workers')} {...a11yProps(1)} />
                    <Tab label={t('workOrder.tabs.services')} {...a11yProps(2)} />
                    <Tab label={t('workOrder.tabs.schedule')} {...a11yProps(3)} />
                    <Tab label={t('workOrder.tabs.costs')} {...a11yProps(4)} />
                    <Tab label={t('workOrder.tabs.photos')} {...a11yProps(5)} />
                    <Tab label={t('workOrder.tabs.notes')} {...a11yProps(6)} />
                  </Tabs>

                  {/* Tab Panels */}
                  <TabPanel value={activeTab} index={0}>
                    {/* Basic Info Tab */}
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth margin="normal">
                          <InputLabel id="building-label">{t('workOrder.building')} *</InputLabel>
                          <Select
                            labelId="building-label"
                            id="building"
                            name="building"
                            value={formik.values.building}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={formik.touched.building && Boolean(formik.errors.building)}
                            label={t('workOrder.building')}
                          >
                            {buildingsData?.map((building) => (
                              <MenuItem key={building._id} value={building._id}>
                                {building.name}
                              </MenuItem>
                            ))}
                          </Select>
                          <FormHelperText error>
                            {formik.touched.building && formik.errors.building}
                          </FormHelperText>
                        </FormControl>
                      </Grid>
                      {/* Add more fields for basic info */}
                    </Grid>
                  </TabPanel>

                  <TabPanel value={activeTab} index={1}>
                    <WorkerAssignmentSection 
                      workers={workersData || []} 
                      formik={formik} 
                    />
                  </TabPanel>

                  <TabPanel value={activeTab} index={2}>
                    <ServicesSection 
                      formik={formik}
                      onServiceChange={(services) => {
                        formik.setFieldValue('services', services);
                      }}
                    />
                  </TabPanel>

                  {/* Add other tab panels */}
                </Box>

                {/* Form Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    startIcon={<ArrowForwardIcon />}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={handleReset}
                    disabled={isSubmitting}
                    startIcon={<RestartAltIcon />}
                  >
                    {t('common.reset')}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting || !formik.isValid}
                    startIcon={<SaveIcon />}
                  >
                    {isSubmitting ? t('common.saving') : t('common.save')}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Container>
        </Form>
      </FormikProvider>
    </LocalizationProvider>
  );
};

export default WorkOrderForm;

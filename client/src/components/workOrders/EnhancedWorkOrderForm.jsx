import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Divider,
  FormHelperText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useBuildingContext } from '../../../contexts/BuildingContext';
import { useCreateWorkOrderMutation, useUpdateWorkOrderMutation } from '../../../features/workOrders/workOrdersApiSlice';
import { useGetWorkersQuery } from '../../../features/workers/workersApiSlice';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';

const validationSchema = Yup.object({
  building: Yup.string()
    .required('Building is required')
    .matches(/^[0-9a-fA-F]{24}$/, 'Invalid building ID format'),
  apartmentNumber: Yup.string()
    .required('Apartment/Unit number is required')
    .max(20, 'Apartment number cannot be longer than 20 characters'),
  block: Yup.string()
    .max(20, 'Block number cannot be longer than 20 characters'),
  description: Yup.string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description cannot be longer than 1000 characters'),
  priority: Yup.string()
    .required('Priority is required')
    .oneOf(['low', 'medium', 'high', 'urgent'], 'Invalid priority level'),
  status: Yup.string()
    .oneOf(
      [
        'pending', 'in_progress', 'on_hold', 
        'completed', 'cancelled', 'pending_review', 'issue_reported'
      ], 
      'Invalid status'
    )
    .default('pending'),
  assignedTo: Yup.array()
    .of(Yup.string().matches(/^[0-9a-fA-F]{24}$/, 'Invalid worker ID format'))
    .min(1, 'At least one worker must be assigned'),
  services: Yup.array()
    .min(1, 'At least one service is required')
    .of(
      Yup.object().shape({
        type: Yup.string()
          .required('Service type is required')
          .oneOf(
            [
              'painting', 'cleaning', 'repair', 'maintenance', 
              'inspection', 'other', 'plumbing', 'electrical', 
              'hvac', 'flooring', 'roofing', 'carpentry'
            ],
            'Invalid service type'
          ),
      description: Yup.string().required('Description is required'),
      laborCost: Yup.number().min(0, 'Must be 0 or more').required('Required'),
      materialCost: Yup.number().min(0, 'Must be 0 or more').required('Required'),
      status: Yup.string().default('pending')
    })
  ).min(1, 'At least one service is required')
});

const serviceTypes = [
  { value: 'painting', label: 'Painting' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'repair', label: 'Repair' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'other', label: 'Other' }
];

const EnhancedWorkOrderForm = ({ workOrder, onCancel }) => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { buildings } = useBuildingContext();
  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  const { data: workers = [], isLoading: isLoadingWorkers } = useGetWorkersQuery();
  
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isEditMode = !!workOrder?._id;
  
  const formik = useFormik({
    initialValues: {
      building: workOrder?.building?._id || '',
      apartmentNumber: workOrder?.apartmentNumber || '',
      block: workOrder?.block || '',
      description: workOrder?.description || '',
      priority: workOrder?.priority || 'medium',
      status: workOrder?.status || 'pending',
      assignedTo: workOrder?.assignedTo?.map(a => a.worker?._id || a.worker) || [],
      services: workOrder?.services?.length > 0 
        ? workOrder.services.map(s => ({
            type: s.type,
            description: s.description,
            laborCost: s.laborCost,
            materialCost: s.materialCost,
            status: s.status || 'pending'
          }))
        : [{ type: '', description: '', laborCost: 0, materialCost: 0, status: 'pending' }],
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting, setStatus, setErrors }) => {
      try {
        setIsSubmitting(true);
        
        // Prepare form data for file uploads
        const formData = new FormData();
        
        // Add files if any
        files.forEach(file => {
          formData.append('photos', file);
        });
        
        // Add other form data
        Object.keys(values).forEach(key => {
          if (key === 'services' || key === 'assignedTo') {
            formData.append(key, JSON.stringify(values[key]));
          } else if (values[key] !== undefined && values[key] !== null) {
            formData.append(key, values[key]);
          }
        });
        
        let response;
        if (isEditMode) {
          response = await updateWorkOrder({
            id: workOrder._id,
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' }
          }).unwrap();
        } else {
          response = await createWorkOrder({
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' }
          }).unwrap();
        }
        
        enqueueSnackbar(
          isEditMode ? 'Work order updated successfully' : 'Work order created successfully',
          { variant: 'success' }
        );
        
        // Redirect to work order details or list
        if (!isEditMode) {
          navigate(`/work-orders/${response.data._id}`);
        } else if (onCancel) {
          onCancel();
        }
        
      } catch (error) {
        console.error('Error submitting work order:', error);
        
        // Handle validation errors
        if (error.status === 400 && error.data?.errors) {
          const formErrors = {};
          error.data.errors.forEach(err => {
            formErrors[err.path] = err.msg;
          });
          setErrors(formErrors);
          enqueueSnackbar('Please fix the form errors', { variant: 'error' });
        } else {
          enqueueSnackbar(
            error.data?.message || 'An error occurred while saving the work order',
            { variant: 'error' }
          );
        }
      } finally {
        setIsSubmitting(false);
        setSubmitting(false);
      }
    }
  });

  const addService = () => {
    const currentServices = formik.values.services;
    formik.setFieldValue('services', [...currentServices, { 
      type: 'painting', 
      description: '', 
      laborCost: 0, 
      materialCost: 0, 
      status: 'pending' 
    }]);
  };

  const removeService = (index) => {
    const currentServices = formik.values.services;
    if (currentServices.length > 1) {
      const updatedServices = [...currentServices];
      updatedServices.splice(index, 1);
      formik.setFieldValue('services', updatedServices);
    }
  };

  const updateService = (index, field, value) => {
    const currentServices = formik.values.services;
    const updatedServices = [...currentServices];
    updatedServices[index] = {
      ...updatedServices[index],
      [field]: field === 'laborCost' || field === 'materialCost' 
        ? parseFloat(value) || 0 
        : value
    };
    formik.setFieldValue('services', updatedServices);
  };

  return (
    <Box component="form" onSubmit={formik.handleSubmit}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Services
              </Typography>
              
              {formik.values.services.map((service, index) => (
                <Box key={index} mb={3} sx={{ border: '1px solid #eee', p: 2, borderRadius: 1 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth size="small" margin="normal">
                        <InputLabel>Service Type</InputLabel>
                        <Select
                          value={service.type}
                          onChange={(e) => updateService(index, 'type', e.target.value)}
                          label="Service Type"
                        >
                          {serviceTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        label="Description"
                        value={service.description}
                        onChange={(e) => updateService(index, 'description', e.target.value)}
                        error={formik.touched.services?.[index]?.description && Boolean(formik.errors.services?.[index]?.description)}
                        helperText={formik.touched.services?.[index]?.description && formik.errors.services?.[index]?.description}
                      />
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        type="number"
                        label="Labor Cost"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        value={service.laborCost}
                        onChange={(e) => updateService(index, 'laborCost', e.target.value)}
                        error={formik.touched.services?.[index]?.laborCost && Boolean(formik.errors.services?.[index]?.laborCost)}
                        helperText={formik.touched.services?.[index]?.laborCost && formik.errors.services?.[index]?.laborCost}
                      />
                    </Grid>
                    
                    <Grid item xs={5} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        type="number"
                        label="Material Cost"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        value={service.materialCost}
                        onChange={(e) => updateService(index, 'materialCost', e.target.value)}
                        error={formik.touched.services?.[index]?.materialCost && Boolean(formik.errors.services?.[index]?.materialCost)}
                        helperText={formik.touched.services?.[index]?.materialCost && formik.errors.services?.[index]?.materialCost}
                      />
                    </Grid>
                    
                    <Grid item xs={1} md={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <IconButton 
                        onClick={() => removeService(index)}
                        disabled={formik.values.services.length <= 1}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                  
                  <Box mt={1} display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="textSecondary">
                      Total: ${(parseFloat(service.laborCost) + parseFloat(service.materialCost)).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              ))}
              
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addService}
                sx={{ mt: 1 }}
              >
                Add Service
              </Button>
              
              {formik.touched.services && formik.errors.services && !Array.isArray(formik.errors.services) && (
                <FormHelperText error>{formik.errors.services}</FormHelperText>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Work Order Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="apartmentNumber"
                    label="Apartment Number"
                    value={formik.values.apartmentNumber}
                    onChange={formik.handleChange}
                    error={formik.touched.apartmentNumber && Boolean(formik.errors.apartmentNumber)}
                    helperText={formik.touched.apartmentNumber && formik.errors.apartmentNumber}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
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
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    name="description"
                    label="Description"
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    error={formik.touched.description && Boolean(formik.errors.description)}
                    helperText={formik.touched.description && formik.errors.description}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Services & Estimates</Typography>
                <Button startIcon={<AddIcon />} onClick={addService}>
                  Add Service
                </Button>
              </Box>
              
              {services.map((service, index) => (
                <Box key={index} sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Service Type</InputLabel>
                        <Select
                          value={service.type}
                          onChange={(e) => updateService(index, 'type', e.target.value)}
                          label="Service Type"
                        >
                          {serviceTypes.map(type => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Service Description"
                        value={service.description}
                        onChange={(e) => updateService(index, 'description', e.target.value)}
                      />
                    </Grid>
                    
                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Labor ($)"
                        value={service.laborCost}
                        onChange={(e) => updateService(index, 'laborCost', e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Materials ($)"
                        value={service.materialCost}
                        onChange={(e) => updateService(index, 'materialCost', e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={1}>
                      <IconButton 
                        color="error" 
                        onClick={() => removeService(index)}
                        disabled={services.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              ))}
              
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Total Estimate: ${services.reduce((sum, service) => sum + (parseFloat(service.laborCost) || 0) + (parseFloat(service.materialCost) || 0), 0).toFixed(2)}
                </Typography>
                <Chip 
                  icon={<AttachFileIcon />} 
                  label={`${services.length} Service${services.length !== 1 ? 's' : ''}`}
                  color="primary"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isCreating || isUpdating}
                  fullWidth
                >
                  {isCreating || isUpdating ? 'Saving...' : 'Save Work Order'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  disabled={isCreating || isUpdating}
                  fullWidth
                >
                  Cancel
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EnhancedWorkOrderForm;

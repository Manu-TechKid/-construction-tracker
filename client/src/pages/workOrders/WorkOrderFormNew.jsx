import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { 
  useCreateWorkOrderMutation, 
  useUpdateWorkOrderMutation,
  useGetWorkOrderQuery 
} from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkersQuery } from '../../features/users/usersApiSlice';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Chip,
  Avatar,
  IconButton,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Validation schema matching backend model
const validationSchema = Yup.object({
  title: Yup.string()
    .required('Work order title is required')
    .max(100, 'Title cannot be longer than 100 characters'),
  description: Yup.string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters'),
  building: Yup.string()
    .required('Building is required')
    .matches(/^[0-9a-fA-F]{24}$/, 'Invalid building ID format'),
  apartmentNumber: Yup.string()
    .max(20, 'Apartment number cannot be longer than 20 characters'),
  block: Yup.string()
    .max(50, 'Block cannot be longer than 50 characters'),
  apartmentStatus: Yup.string()
    .oneOf(['vacant', 'occupied', 'under_renovation', 'reserved'], 'Invalid apartment status')
    .default('occupied'),
  priority: Yup.string()
    .oneOf(['low', 'medium', 'high', 'urgent'], 'Invalid priority level')
    .default('medium'),
  status: Yup.string()
    .oneOf(['pending', 'in_progress', 'on_hold', 'completed', 'cancelled'], 'Invalid status')
    .default('pending'),
  scheduledDate: Yup.date()
    .required('Scheduled date is required')
    .min(new Date(), 'Scheduled date cannot be in the past')
    .typeError('Please enter a valid date'),
  estimatedCompletionDate: Yup.date()
    .min(Yup.ref('scheduledDate'), 'Completion date must be after scheduled date')
    .nullable()
    .typeError('Please enter a valid date'),
  assignedTo: Yup.array()
    .of(Yup.string().matches(/^[0-9a-fA-F]{24}$/, 'Invalid worker ID format')),
  services: Yup.array()
    .min(1, 'At least one service is required')
    .of(
      Yup.object({
        type: Yup.string()
          .required('Service type is required')
          .oneOf([
            'painting', 'cleaning', 'repair', 'plumbing', 
            'electrical', 'hvac', 'flooring', 'roofing', 'carpentry', 'other'
          ]),
        description: Yup.string()
          .required('Service description is required'),
        laborCost: Yup.number()
          .min(0, 'Labor cost cannot be negative')
          .default(0),
        materialCost: Yup.number()
          .min(0, 'Material cost cannot be negative')
          .default(0),
        status: Yup.string()
          .oneOf(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'])
          .default('pending')
      })
    ),
  notes: Yup.array().of(
    Yup.object({
      content: Yup.string().required('Note content is required'),
      isPrivate: Yup.boolean().default(false)
    })
  )
}).test(
  'dates-valid',
  'Completion date must be after scheduled date',
  function(value) {
    if (!value.estimatedCompletionDate) return true;
    return new Date(value.estimatedCompletionDate) >= new Date(value.scheduledDate);
  }
);

const WorkOrderFormNew = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  const [photos, setPhotos] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  
  // API hooks with loading and error states
  const [createWorkOrder, { 
    isLoading: isCreating,
    error: createError 
  }] = useCreateWorkOrderMutation();
  
  const [updateWorkOrder, { 
    isLoading: isUpdating,
    error: updateError 
  }] = useUpdateWorkOrderMutation();
  
  const { 
    data: workOrderData, 
    isLoading: isLoadingWorkOrder,
    error: workOrderError 
  } = useGetWorkOrderQuery(id, { 
    skip: !isEdit || !id 
  });
  
  const { 
    data: buildingsData, 
    isLoading: isLoadingBuildings,
    error: buildingsError 
  } = useGetBuildingsQuery();
  
  const { 
    data: usersData, 
    isLoading: isLoadingWorkers,
    error: workersError 
  } = useGetWorkersQuery();
  
  // Combined loading state
  const isLoading = isCreating || isUpdating || (isEdit && isLoadingWorkOrder) || 
                   isLoadingBuildings || isLoadingWorkers;
  
  // Handle API errors
  useEffect(() => {
    const error = createError || updateError || workOrderError || buildingsError || workersError;
    if (error) {
      console.error('API Error:', error);
      const errorMessage = error?.data?.message || error?.error || 'An error occurred';
      toast.error(errorMessage);
    }
  }, [createError, updateError, workOrderError, buildingsError, workersError]);
  
  const buildings = buildingsData?.data?.buildings || [];
  const workers = usersData?.data?.users?.filter(user => 
    user.role === 'worker' && 
    user.isActive && 
    user.workerProfile?.status === 'active' &&
    user.workerProfile?.approvalStatus === 'approved'
  ) || [];
  
  // Get apartments for selected building
  const apartments = selectedBuilding?.apartments || [];
  const blocks = [...new Set(apartments.map(apt => apt.block))];
  
  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      building: '',
      apartmentNumber: '',
      block: '',
      apartmentStatus: 'occupied',
      priority: 'medium',
      status: 'pending',
      scheduledDate: new Date(),
      estimatedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      assignedTo: [],
      services: [{
        type: 'other',
        description: '',
        laborCost: 0,
        materialCost: 0,
        status: 'pending'
      }],
      notes: []
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        setSubmitting(true);
        
        // Format dates to ISO strings
        const formatDate = (date) => {
          if (!date) return null;
          return new Date(date).toISOString();
        };

        // Create work order payload
        const workOrderData = {
          title: values.title.trim(),
          description: values.description.trim(),
          building: values.building,
          apartmentNumber: (values.apartmentNumber || '').trim(),
          block: (values.block || '').trim(),
          apartmentStatus: values.apartmentStatus,
          priority: values.priority,
          status: values.status,
          scheduledDate: formatDate(values.scheduledDate),
          estimatedCompletionDate: formatDate(values.estimatedCompletionDate),
          assignedTo: values.assignedTo || [],
          services: (values.services || []).map(service => ({
            type: service.type,
            description: service.description.trim(),
            laborCost: Number(service.laborCost) || 0,
            materialCost: Number(service.materialCost) || 0,
            status: service.status || 'pending'
          })),
          notes: (values.notes || []).map(note => ({
            content: note.content.trim(),
            isPrivate: Boolean(note.isPrivate),
            createdBy: user?._id
          }))
        };

        // Add photos if any
        if (photos.length > 0) {
          const formData = new FormData();
          Object.entries(workOrderData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              formData.append(key, JSON.stringify(value));
            } else if (value !== null && value !== undefined) {
              formData.append(key, value);
            }
          });
          
          photos.forEach((photo) => {
            formData.append(`photos`, photo);
          });
          
          workOrderData.formData = formData;
        }

        console.log('Submitting work order:', workOrderData);
        
        if (isEdit && id) {
          const result = await updateWorkOrder({ 
            id, 
            ...(workOrderData.formData ? { formData: workOrderData.formData } : workOrderData)
          }).unwrap();
          
          toast.success(result.message || 'Work order updated successfully');
        } else {
          const result = await createWorkOrder(
            workOrderData.formData || workOrderData
          ).unwrap();
          
          toast.success(result.message || 'Work order created successfully');
        }
        
        navigate('/work-orders');
      } catch (error) {
        console.error('Form submission error:', error);
        
        // Handle validation errors
        if (error.status === 400 && error.data?.fieldErrors) {
          // Set field errors
          Object.entries(error.data.fieldErrors).forEach(([field, message]) => {
            setFieldError(field, message);
          });
          
          // Scroll to first error
          const firstErrorField = Object.keys(error.data.fieldErrors)[0];
          if (firstErrorField) {
            const element = document.querySelector(`[name="${firstErrorField}"]`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
          
          toast.error('Please fix the validation errors');
        } 
        // Handle unauthorized errors
        else if (error.status === 401) {
          toast.error('Your session has expired. Please log in again.');
        }
        // Handle forbidden errors
        else if (error.status === 403) {
          toast.error('You do not have permission to perform this action');
        }
        // Handle not found errors
        else if (error.status === 404) {
          toast.error('The requested resource was not found');
          navigate('/work-orders');
        }
        // Handle server errors
        else if (error.status >= 500) {
          toast.error('A server error occurred. Please try again later.');
        }
        // Handle other errors
        else {
          const errorMessage = error?.data?.message || 
                             error?.data?.error || 
                             error?.message || 
                             'Failed to save work order';
          toast.error(errorMessage);
        }
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Load work order data for editing
  useEffect(() => {
    if (isEdit && workOrderData?.data) {
      const wo = workOrderData.data;
      formik.setValues({
        title: wo.title || '',
        description: wo.description || '',
        building: wo.building?._id || wo.building || '',
        apartmentNumber: wo.apartmentNumber || '',
        block: wo.block || '',
        apartmentStatus: wo.apartmentStatus || 'occupied',
        priority: wo.priority || 'medium',
        status: wo.status || 'pending',
        scheduledDate: wo.scheduledDate ? new Date(wo.scheduledDate) : new Date(),
        estimatedCompletionDate: wo.estimatedCompletionDate ? new Date(wo.estimatedCompletionDate) : new Date(),
        assignedTo: wo.assignedTo?.map(assignment => assignment.worker?._id || assignment.worker) || [],
        services: wo.services?.length ? wo.services : [{
          type: 'other',
          description: '',
          laborCost: 0,
          materialCost: 0,
          status: 'pending'
        }],
        notes: wo.notes || []
      });
    }
  }, [workOrderData, isEdit]);
  
  // Update selected building when building field changes
  useEffect(() => {
    if (formik.values.building) {
      const building = buildings.find(b => b._id === formik.values.building);
      setSelectedBuilding(building);
    }
  }, [formik.values.building, buildings]);
  
  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    setPhotos(prev => [...prev, ...files]);
  };
  
  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };
  
  const addService = () => {
    formik.setFieldValue('services', [
      ...formik.values.services,
      {
        type: 'other',
        description: '',
        laborCost: 0,
        materialCost: 0,
        status: 'pending'
      }
    ]);
  };
  
  const removeService = (index) => {
    const newServices = formik.values.services.filter((_, i) => i !== index);
    formik.setFieldValue('services', newServices);
  };

  // Show loading state while data is being fetched
  if (isLoading && !formik.isSubmitting) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading work order data...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton 
            onClick={() => navigate('/work-orders')} 
            color="primary"
            disabled={formik.isSubmitting}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" component="h1">
              {isEdit ? 'Edit Work Order' : 'Create Work Order'}
            </Typography>
            {formik.isSubmitting && (
              <CircularProgress size={24} />
            )}
          </Box>
        </Box>

        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardHeader title="Basic Information" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        name="title"
                        label="Work Order Title"
                        value={formik.values.title}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.title && Boolean(formik.errors.title)}
                        helperText={(formik.touched.title && formik.errors.title) || ' '}
                        disabled={formik.isSubmitting}
                        inputProps={{
                          maxLength: 100
                        }}
                      />
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
                        onBlur={formik.handleBlur}
                        error={formik.touched.description && Boolean(formik.errors.description)}
                        helperText={(formik.touched.description && formik.errors.description) || ' '}
                        disabled={formik.isSubmitting}
                        inputProps={{
                          minLength: 10
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl 
                        fullWidth 
                        error={formik.touched.building && Boolean(formik.errors.building)}
                        disabled={formik.isSubmitting}
                      >
                        <InputLabel>Building *</InputLabel>
                        <Select
                          name="building"
                          value={formik.values.building}
                          onChange={(e) => {
                            formik.setFieldValue('building', e.target.value);
                            formik.setFieldValue('apartmentNumber', '');
                            formik.setFieldValue('block', '');
                          }}
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
                          {(formik.touched.building && formik.errors.building) || ' '}
                        </FormHelperText>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl 
                        fullWidth 
                        error={formik.touched.block && Boolean(formik.errors.block)}
                        disabled={!formik.values.building || formik.isSubmitting}
                      >
                        <InputLabel>Block</InputLabel>
                        <Select
                          name="block"
                          value={formik.values.block}
                          onChange={(e) => {
                            formik.setFieldValue('block', e.target.value);
                            formik.setFieldValue('apartmentNumber', '');
                          }}
                          onBlur={formik.handleBlur}
                          label="Block"
                        >
                          {blocks.map((block) => (
                            <MenuItem key={block} value={block}>
                              {block}
                            </MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          {(formik.touched.block && formik.errors.block) || ' '}
                        </FormHelperText>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      {isEdit ? (
                        <TextField
                          fullWidth
                          name="apartmentNumber"
                          label="Apartment Number"
                          value={formik.values.apartmentNumber}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={formik.touched.apartmentNumber && Boolean(formik.errors.apartmentNumber)}
                          helperText={(formik.touched.apartmentNumber && formik.errors.apartmentNumber) || ' '}
                          disabled={formik.isSubmitting}
                          inputProps={{
                            maxLength: 20
                          }}
                        />
                      ) : (
                        <FormControl 
                          fullWidth 
                          error={formik.touched.apartmentNumber && Boolean(formik.errors.apartmentNumber)}
                          disabled={!formik.values.block || formik.isSubmitting}
                        >
                          <InputLabel>Apartment Number</InputLabel>
                          <Select
                            name="apartmentNumber"
                            value={formik.values.apartmentNumber}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            label="Apartment Number"
                          >
                            {apartments
                              .filter(apt => apt.block === formik.values.block)
                              .map((apartment) => (
                                <MenuItem key={apartment._id} value={apartment.number}>
                                  {apartment.number}
                                </MenuItem>
                              ))}
                          </Select>
                          <FormHelperText>
                            {(formik.touched.apartmentNumber && formik.errors.apartmentNumber) || ' '}
                          </FormHelperText>
                        </FormControl>
                      )}
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth disabled={formik.isSubmitting}>
                        <InputLabel>Apartment Status</InputLabel>
                        <Select
                          name="apartmentStatus"
                          value={formik.values.apartmentStatus}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Apartment Status"
                        >
                          <MenuItem value="vacant">Vacant</MenuItem>
                          <MenuItem value="occupied">Occupied</MenuItem>
                          <MenuItem value="under_renovation">Under Renovation</MenuItem>
                          <MenuItem value="reserved">Reserved</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth disabled={formik.isSubmitting}>
                        <InputLabel>Priority</InputLabel>
                        <Select
                          name="priority"
                          value={formik.values.priority}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Priority"
                        >
                          <MenuItem value="low">Low</MenuItem>
                          <MenuItem value="medium">Medium</MenuItem>
                          <MenuItem value="high">High</MenuItem>
                          <MenuItem value="urgent">Urgent</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth disabled={formik.isSubmitting}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          name="status"
                          value={formik.values.status}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Status"
                        >
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="in_progress">In Progress</MenuItem>
                          <MenuItem value="on_hold">On Hold</MenuItem>
                          <MenuItem value="completed">Completed</MenuItem>
                          <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Scheduled Date *"
                        value={formik.values.scheduledDate}
                        onChange={(date) => {
                          formik.setFieldValue('scheduledDate', date);
                          // If estimated date is before the new scheduled date, update it
                          if (formik.values.estimatedCompletionDate < date) {
                            const newEstimatedDate = new Date(date);
                            newEstimatedDate.setDate(newEstimatedDate.getDate() + 1);
                            formik.setFieldValue('estimatedCompletionDate', newEstimatedDate);
                          }
                        }}
                        minDate={new Date()}
                        disabled={formik.isSubmitting}
                        renderInput={(params) => (
                          <TextField
                            fullWidth
                            {...params}
                            onBlur={() => formik.setFieldTouched('scheduledDate', true)}
                            error={formik.touched.scheduledDate && Boolean(formik.errors.scheduledDate)}
                            helperText={(formik.touched.scheduledDate && formik.errors.scheduledDate) || ' '}
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Estimated Completion Date"
                        value={formik.values.estimatedCompletionDate}
                        onChange={(date) => formik.setFieldValue('estimatedCompletionDate', date)}
                        minDate={formik.values.scheduledDate}
                        disabled={formik.isSubmitting || !formik.values.scheduledDate}
                        renderInput={(params) => (
                          <TextField
                            fullWidth
                            {...params}
                            onBlur={() => formik.setFieldTouched('estimatedCompletionDate', true)}
                            error={formik.touched.estimatedCompletionDate && Boolean(formik.errors.estimatedCompletionDate)}
                            helperText={(formik.touched.estimatedCompletionDate && formik.errors.estimatedCompletionDate) || ' '}
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControl fullWidth error={formik.touched.assignedTo && Boolean(formik.errors.assignedTo)}>
                        <InputLabel>Assigned Workers</InputLabel>
                        <Select
                          multiple
                          name="assignedTo"
                          value={formik.values.assignedTo}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Assigned Workers"
                          disabled={formik.isSubmitting || workers.length === 0}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((workerId) => {
                                const worker = workers.find(w => w._id === workerId);
                                return worker ? (
                                  <Chip
                                    key={workerId}
                                    label={worker.name}
                                    size="small"
                                    avatar={<Avatar>{worker.name.charAt(0)}</Avatar>}
                                  />
                                ) : null;
                              })}
                            </Box>
                          )}
                        >
                          {workers.map((worker) => (
                            <MenuItem key={worker._id} value={worker._id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar size="small">{worker.name.charAt(0)}</Avatar>
                                <Box>
                                  <Typography variant="body2">{worker.name}</Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {worker.workerProfile?.skills?.join(', ') || 'General'}
                                  </Typography>
                                </Box>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                        {formik.touched.assignedTo && formik.errors.assignedTo && (
                          <FormHelperText>{formik.errors.assignedTo}</FormHelperText>
                        )}
                        {workers.length === 0 && (
                          <FormHelperText>No active workers found</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
              
              {/* Services Section */}
              <Card sx={{ mt: 3 }}>
                <CardHeader 
                  title="Services" 
                  action={
                    <Button 
                      startIcon={<AddIcon />} 
                      onClick={addService}
                      disabled={formik.isSubmitting}
                    >
                      Add Service
                    </Button>
                  } 
                />
                <CardContent>
                  {formik.values.services.map((service, index) => (
                    <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1">Service {index + 1}</Typography>
                        {formik.values.services.length > 1 && (
                          <IconButton 
                            size="small" 
                            onClick={() => removeService(index)}
                            disabled={formik.isSubmitting}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Service Type</InputLabel>
                            <Select
                              name={`services[${index}].type`}
                              value={service.type}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              label="Service Type"
                              disabled={formik.isSubmitting}
                            >
                              <MenuItem value="painting">Painting</MenuItem>
                              <MenuItem value="cleaning">Cleaning</MenuItem>
                              <MenuItem value="repair">Repair</MenuItem>
                              <MenuItem value="plumbing">Plumbing</MenuItem>
                              <MenuItem value="electrical">Electrical</MenuItem>
                              <MenuItem value="hvac">HVAC</MenuItem>
                              <MenuItem value="flooring">Flooring</MenuItem>
                              <MenuItem value="roofing">Roofing</MenuItem>
                              <MenuItem value="carpentry">Carpentry</MenuItem>
                              <MenuItem value="other">Other</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                              name={`services[${index}].status`}
                              value={service.status}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              label="Status"
                              disabled={formik.isSubmitting}
                            >
                              <MenuItem value="pending">Pending</MenuItem>
                              <MenuItem value="in_progress">In Progress</MenuItem>
                              <MenuItem value="completed">Completed</MenuItem>
                              <MenuItem value="on_hold">On Hold</MenuItem>
                              <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            name={`services[${index}].description`}
                            label="Description"
                            value={service.description}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            disabled={formik.isSubmitting}
                          />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            type="number"
                            name={`services[${index}].laborCost`}
                            label="Labor Cost ($)"
                            value={service.laborCost}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            disabled={formik.isSubmitting}
                            InputProps={{
                              startAdornment: '$',
                              inputProps: { min: 0, step: 0.01 }
                            }}
                          />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            type="number"
                            name={`services[${index}].materialCost`}
                            label="Material Cost ($)"
                            value={service.materialCost}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            disabled={formik.isSubmitting}
                            InputProps={{
                              startAdornment: '$',
                              inputProps: { min: 0, step: 0.01 }
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </CardContent>
              </Card>
              
              {/* Photos Section */}
              <Card sx={{ mt: 3 }}>
                <CardHeader title="Photos" />
                <CardContent>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="work-order-photos"
                    type="file"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={formik.isSubmitting}
                  />
                  <label htmlFor="work-order-photos">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      disabled={formik.isSubmitting}
                    >
                      Upload Photos
                    </Button>
                  </label>
                  
                  {photos.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Selected Photos ({photos.length}):
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {photos.map((photo, index) => (
                          <Box key={index} sx={{ position: 'relative' }}>
                            <img
                              src={URL.createObjectURL(photo)}
                              alt={`Preview ${index + 1}`}
                              style={{ 
                                width: 100, 
                                height: 100, 
                                objectFit: 'cover',
                                borderRadius: 4
                              }}
                            />
                            <IconButton
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: -8,
                                right: -8,
                                backgroundColor: 'error.main',
                                color: 'white',
                                '&:hover': {
                                  backgroundColor: 'error.dark',
                                },
                              }}
                              onClick={() => removePhoto(index)}
                              disabled={formik.isSubmitting}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              {/* Notes Section */}
              <Card>
                <CardHeader title="Notes" />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Add a note..."
                      variant="outlined"
                      value={formik.values.newNote || ''}
                      onChange={(e) => formik.setFieldValue('newNote', e.target.value)}
                      disabled={formik.isSubmitting}
                    />
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          if (formik.values.newNote?.trim()) {
                            formik.setFieldValue('notes', [
                              ...formik.values.notes,
                              {
                                content: formik.values.newNote.trim(),
                                isPrivate: false,
                                createdBy: user?._id,
                                createdAt: new Date().toISOString()
                              }
                            ]);
                            formik.setFieldValue('newNote', '');
                          }
                        }}
                        disabled={!formik.values.newNote?.trim() || formik.isSubmitting}
                      >
                        Add Note
                      </Button>
                    </Box>
                  </Box>
                  
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {formik.values.notes.length > 0 ? (
                      formik.values.notes.map((note, index) => (
                        <Box 
                          key={index} 
                          sx={{ 
                            p: 1.5, 
                            mb: 1, 
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" color="textSecondary">
                              {new Date(note.createdAt).toLocaleString()}
                            </Typography>
                            {note.isPrivate && (
                              <Chip 
                                label="Private" 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                          <Typography variant="body2">{note.content}</Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                        No notes added yet
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
              
              {/* Summary Section */}
              <Card sx={{ mt: 3 }}>
                <CardHeader title="Summary" />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Total Services: {formik.values.services.length}
                    </Typography>
                    <Typography variant="subtitle2" gutterBottom>
                      Assigned Workers: {formik.values.assignedTo.length}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Labor Cost:</Typography>
                      <Typography>
                        ${formik.values.services.reduce((sum, service) => sum + (Number(service.laborCost) || 0), 0).toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Material Cost:</Typography>
                      <Typography>
                        ${formik.values.services.reduce((sum, service) => sum + (Number(service.materialCost) || 0), 0).toFixed(2)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                      <Typography>Total Estimated Cost:</Typography>
                      <Typography>
                        ${formik.values.services.reduce((sum, service) => {
                          const labor = Number(service.laborCost) || 0;
                          const material = Number(service.materialCost) || 0;
                          return sum + labor + material;
                        }, 0).toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Action Buttons */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/work-orders')}
              startIcon={<CancelIcon />}
              disabled={formik.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={formik.isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={!formik.isValid || formik.isSubmitting}
            >
              {formik.isSubmitting 
                ? (isEdit ? 'Updating...' : 'Creating...') 
                : (isEdit ? 'Update' : 'Create') + ' Work Order'}
            </Button>
          </Box>
        </form>
      </Container>
    </LocalizationProvider>
  );
};

export default WorkOrderFormNew;

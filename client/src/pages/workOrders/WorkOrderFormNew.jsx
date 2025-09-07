import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
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
  Paper,
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

import { 
  useCreateWorkOrderMutation, 
  useUpdateWorkOrderMutation,
  useGetWorkOrderQuery 
} from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useAuth } from '../../hooks/useAuth';

// Validation schema matching backend model
const validationSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  description: Yup.string().required('Description is required'),
  building: Yup.string().required('Building is required'),
  scheduledDate: Yup.date().required('Scheduled date is required')
});

const WorkOrderFormNew = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  const [photos, setPhotos] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  
  // API hooks
  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  const { data: workOrderData } = useGetWorkOrderQuery(id, { skip: !isEdit || !id });
  const { data: buildingsData } = useGetBuildingsQuery();
  const { data: usersData } = useGetUsersQuery({ role: 'worker' });
  
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
      apartmentStatus: 'vacant',
      priority: 'medium',
      status: 'pending',
      scheduledDate: new Date(),
      estimatedCompletionDate: new Date(),
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
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const formData = new FormData();
        
        // Add basic fields
        formData.append('title', values.title);
        formData.append('description', values.description);
        formData.append('building', values.building);
        formData.append('apartmentNumber', values.apartmentNumber);
        formData.append('block', values.block);
        formData.append('apartmentStatus', values.apartmentStatus);
        formData.append('priority', values.priority);
        formData.append('status', values.status);
        formData.append('scheduledDate', values.scheduledDate.toISOString());
        formData.append('estimatedCompletionDate', values.estimatedCompletionDate.toISOString());
        formData.append('createdBy', user._id);
        
        // Add assigned workers
        values.assignedTo.forEach((workerId, index) => {
          formData.append(`assignedTo[${index}]`, workerId);
        });
        
        // Add services
        values.services.forEach((service, index) => {
          formData.append(`services[${index}][type]`, service.type);
          formData.append(`services[${index}][description]`, service.description);
          formData.append(`services[${index}][laborCost]`, service.laborCost);
          formData.append(`services[${index}][materialCost]`, service.materialCost);
          formData.append(`services[${index}][status]`, service.status);
        });
        
        // Add photos
        photos.forEach((photo, index) => {
          if (photo instanceof File) {
            formData.append('photos', photo);
          }
        });
        
        if (isEdit && id) {
          await updateWorkOrder({ id, formData }).unwrap();
          toast.success('Work order updated successfully');
        } else {
          await createWorkOrder(formData).unwrap();
          toast.success('Work order created successfully');
        }
        
        navigate('/work-orders');
      } catch (error) {
        console.error('Form submission error:', error);
        toast.error(error?.data?.message || 'Failed to save work order');
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
        apartmentStatus: wo.apartmentStatus || 'vacant',
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/work-orders')} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isEdit ? 'Edit Work Order' : 'Create Work Order'}
          </Typography>
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
                        error={formik.touched.title && Boolean(formik.errors.title)}
                        helperText={formik.touched.title && formik.errors.title}
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
                        error={formik.touched.description && Boolean(formik.errors.description)}
                        helperText={formik.touched.description && formik.errors.description}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth error={formik.touched.building && Boolean(formik.errors.building)}>
                        <InputLabel>Building</InputLabel>
                        <Select
                          name="building"
                          value={formik.values.building}
                          onChange={formik.handleChange}
                          label="Building"
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
                    
                    <Grid item xs={12} sm={6}>
                      {isEdit ? (
                        <TextField
                          fullWidth
                          name="block"
                          label="Block"
                          value={formik.values.block}
                          onChange={formik.handleChange}
                          error={formik.touched.block && Boolean(formik.errors.block)}
                          helperText={formik.touched.block && formik.errors.block}
                        />
                      ) : (
                        <FormControl fullWidth error={formik.touched.block && Boolean(formik.errors.block)}>
                          <InputLabel>Block</InputLabel>
                          <Select
                            name="block"
                            value={formik.values.block}
                            onChange={formik.handleChange}
                            label="Block"
                            disabled={!selectedBuilding}
                          >
                            {blocks.map((block) => (
                              <MenuItem key={block} value={block}>
                                {block}
                              </MenuItem>
                            ))}
                          </Select>
                          {formik.touched.block && formik.errors.block && (
                            <FormHelperText>{formik.errors.block}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      {isEdit ? (
                        <TextField
                          fullWidth
                          name="apartmentNumber"
                          label="Apartment Number"
                          value={formik.values.apartmentNumber}
                          onChange={formik.handleChange}
                          error={formik.touched.apartmentNumber && Boolean(formik.errors.apartmentNumber)}
                          helperText={formik.touched.apartmentNumber && formik.errors.apartmentNumber}
                        />
                      ) : (
                        <FormControl fullWidth error={formik.touched.apartmentNumber && Boolean(formik.errors.apartmentNumber)}>
                          <InputLabel>Apartment Number</InputLabel>
                          <Select
                            name="apartmentNumber"
                            value={formik.values.apartmentNumber}
                            onChange={formik.handleChange}
                            label="Apartment Number"
                            disabled={!formik.values.block}
                          >
                            {apartments
                              .filter(apt => apt.block === formik.values.block)
                              .map((apartment) => (
                                <MenuItem key={apartment._id} value={apartment.number}>
                                  {apartment.number}
                                </MenuItem>
                              ))}
                          </Select>
                          {formik.touched.apartmentNumber && formik.errors.apartmentNumber && (
                            <FormHelperText>{formik.errors.apartmentNumber}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Apartment Status</InputLabel>
                        <Select
                          name="apartmentStatus"
                          value={formik.values.apartmentStatus}
                          onChange={formik.handleChange}
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
                          <MenuItem value="urgent">Urgent</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Scheduled Date"
                        value={formik.values.scheduledDate}
                        onChange={(value) => formik.setFieldValue('scheduledDate', value)}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Worker Assignment */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader title="Assign Workers" />
                <CardContent>
                  <FormControl fullWidth error={formik.touched.assignedTo && Boolean(formik.errors.assignedTo)}>
                    <InputLabel>Select Workers</InputLabel>
                    <Select
                      multiple
                      name="assignedTo"
                      value={formik.values.assignedTo}
                      onChange={formik.handleChange}
                      label="Select Workers"
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
                  </FormControl>
                </CardContent>
              </Card>
              
              {/* Services */}
              <Card sx={{ mt: 2 }}>
                <CardHeader 
                  title="Services" 
                  action={
                    <Button
                      size="small"
                      onClick={addService}
                      startIcon={<AddIcon />}
                    >
                      Add Service
                    </Button>
                  }
                />
                <CardContent>
                  {formik.values.services.map((service, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Service Type</InputLabel>
                            <Select
                              name={`services[${index}].type`}
                              value={service.type}
                              onChange={formik.handleChange}
                              label="Service Type"
                            >
                              <MenuItem value="plumbing">Plumbing</MenuItem>
                              <MenuItem value="electrical">Electrical</MenuItem>
                              <MenuItem value="hvac">HVAC</MenuItem>
                              <MenuItem value="painting">Painting</MenuItem>
                              <MenuItem value="carpentry">Carpentry</MenuItem>
                              <MenuItem value="cleaning">Cleaning</MenuItem>
                              <MenuItem value="maintenance">Maintenance</MenuItem>
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
                              label="Status"
                            >
                              <MenuItem value="pending">Pending</MenuItem>
                              <MenuItem value="in_progress">In Progress</MenuItem>
                              <MenuItem value="completed">Completed</MenuItem>
                              <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            name={`services[${index}].description`}
                            label="Service Description"
                            value={service.description}
                            onChange={formik.handleChange}
                            multiline
                            rows={2}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            name={`services[${index}].laborCost`}
                            label="Labor Cost"
                            type="number"
                            value={service.laborCost}
                            onChange={formik.handleChange}
                            InputProps={{
                              startAdornment: <Typography variant="body2">$</Typography>
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            name={`services[${index}].materialCost`}
                            label="Material Cost"
                            type="number"
                            value={service.materialCost}
                            onChange={formik.handleChange}
                            InputProps={{
                              startAdornment: <Typography variant="body2">$</Typography>
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                            <Typography variant="body2" sx={{ mr: 2 }}>
                              Total: ${(parseFloat(service.laborCost || 0) + parseFloat(service.materialCost || 0)).toFixed(2)}
                            </Typography>
                            {formik.values.services.length > 1 && (
                              <IconButton
                                color="error"
                                onClick={() => removeService(index)}
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </CardContent>
              </Card>

              {/* Photo Upload */}
              <Card sx={{ mt: 2 }}>
                <CardHeader title="Photos" />
                <CardContent>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    startIcon={<CloudUploadIcon />}
                  >
                    Upload Photos
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                    />
                  </Button>
                  
                  {photos.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      {photos.map((photo, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {photo.name}
                          </Typography>
                          <IconButton size="small" onClick={() => removePhoto(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Action Buttons */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/work-orders')}
              startIcon={<CancelIcon />}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={formik.isSubmitting}
              startIcon={formik.isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {isEdit ? 'Update' : 'Create'} Work Order
            </Button>
          </Box>
        </form>
      </Container>
    </LocalizationProvider>
  );
};

export default WorkOrderFormNew;

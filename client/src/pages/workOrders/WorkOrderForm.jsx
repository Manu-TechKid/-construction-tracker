import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  CloudUpload as CloudUploadIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

import { 
  useGetWorkOrderQuery,
  useCreateWorkOrderMutation,
  useUpdateWorkOrderMutation
} from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useAuth } from '../../hooks/useAuth';

// Service types matching the database enum
const SERVICE_TYPES = [
  'painting', 'cleaning', 'repair', 'plumbing', 
  'electrical', 'hvac', 'flooring', 'roofing', 'carpentry', 'other'
];

// Apartment status options
const APARTMENT_STATUS_OPTIONS = [
  'vacant', 'occupied', 'under_renovation', 'reserved'
];

const workTypeSubtypes = {
  maintenance: ['inspection', 'cleaning', 'lubrication', 'calibration', 'safety_check'],
  repair: ['plumbing', 'electrical', 'hvac', 'appliance', 'structural'],
  installation: ['fixtures', 'appliances', 'systems', 'furniture', 'equipment'],
  inspection: ['safety', 'compliance', 'quality', 'pre_purchase', 'routine'],
  cleaning: ['regular', 'deep', 'post_construction', 'carpet', 'window'],
  renovation: ['kitchen', 'bathroom', 'flooring', 'painting', 'remodeling'],
  emergency: ['leak', 'power_outage', 'break_in', 'flood', 'fire'],
  preventive: ['maintenance', 'inspection', 'testing', 'calibration', 'replacement']
};

const validationSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  description: Yup.string().required('Description is required'),
  building: Yup.string().required('Building is required'),
  workType: Yup.string().required('Work type is required'),
  workSubType: Yup.string().required('Work sub-type is required'),
  priority: Yup.string().oneOf(['low', 'medium', 'high', 'urgent']),
  scheduledDate: Yup.date(),
  estimatedCost: Yup.number().min(0),
  assignedTo: Yup.array().of(Yup.string()),
});

const WorkOrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  // API queries
  const { data: workOrderData, isLoading: isLoadingWorkOrder } = useGetWorkOrderQuery(id, {
    skip: !isEdit
  });
  const { data: buildingsData, isLoading: isLoadingBuildings } = useGetBuildingsQuery();
  const { data: workersData, isLoading: isLoadingWorkers } = useGetUsersQuery({ role: 'worker' });
  
  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();

  const buildings = buildingsData?.data?.buildings || [];
  const workers = workersData?.data?.users || [];

  const workerOptions = React.useMemo(() => 
    workers.map(worker => ({
      id: worker._id,
      label: `${worker.firstName} ${worker.lastName}`,
      ...worker
    })), 
    [workers]
  );
  
  // State for selected building
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const availableApartments = selectedBuilding?.apartments || [];

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      building: '',
      apartmentNumber: '',
      block: '',
      apartmentStatus: 'occupied',
      workType: '',
      workSubType: '',
      priority: 'medium',
      scheduledDate: new Date(),
      estimatedCompletionDate: null,
      estimatedCost: 0,
      actualCost: 0,
      assignedTo: [],
      photos: [], // Keep for photo handling
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        // Create FormData for file uploads
        const formData = new FormData();
        
        // Add all form fields
        Object.keys(values).forEach(key => {
          if (key === 'photos') {
            // Handle photos separately
            values.photos.forEach((photo, index) => {
              if (photo.file) {
                formData.append('photos', photo.file);
              }
            });
          } else if (key === 'services') {
            // Handle services array
            formData.append(key, JSON.stringify(values[key]));
          } else if (key === 'assignedTo') {
            // Transform assignedTo to match backend expectations
            // assignedTo is now an array of strings (worker IDs)
            const transformedAssignedTo = values.assignedTo.map(workerId => ({
              worker: workerId,
              assignedBy: user._id,
              status: 'pending',
              assignedAt: new Date().toISOString()
            }));
            formData.append('assignedTo', JSON.stringify(transformedAssignedTo));
          } else if (values[key] !== null && values[key] !== undefined) {
            formData.append(key, values[key]);
          }
        });
        
        // Add a simplified service structure based on the description and costs
        const service = {
          type: values.workSubType || 'other',
          description: values.description,
          laborCost: values.estimatedCost || 0,
          materialCost: 0,
          status: 'pending'
        };
        formData.append('services', JSON.stringify([service]));

        if (!isEdit) {
          formData.append('createdBy', user._id);
        }
        formData.append('updatedBy', user._id);

        if (isEdit && id) {
          await updateWorkOrder({ id, formData }).unwrap();
          toast.success('Work order updated successfully');
          navigate(`/work-orders/${id}/details`);
        } else {
          const result = await createWorkOrder(formData).unwrap();
          toast.success('Work order created successfully');
          navigate(`/work-orders/${result.data._id}/details`);
        }
      } catch (error) {
        console.error('Failed to save work order:', error);
        const errorMessage = error?.data?.message || error?.message || 'Failed to save work order';
        toast.error(errorMessage);
      }
    },
  });

  // Load work order data when editing
  useEffect(() => {
    if (isEdit && workOrderData?.data) {
      const workOrder = workOrderData.data;
      
      // Set the selected building first
      if (workOrder.building) {
        const building = buildings.find(b => b._id === workOrder.building._id);
        setSelectedBuilding(building);
      }
      
      formik.setValues({
        title: workOrder.title || '',
        description: workOrder.description || '',
        building: workOrder.building?._id || '',
        apartmentNumber: workOrder.apartmentNumber || '',
        block: workOrder.block || '',
        apartmentStatus: workOrder.apartmentStatus || 'occupied',
        workType: workOrder.workType || '',
        workSubType: workOrder.workSubType || '',
        priority: workOrder.priority || 'medium',
        scheduledDate: workOrder.scheduledDate ? new Date(workOrder.scheduledDate) : new Date(),
        estimatedCompletionDate: workOrder.estimatedCompletionDate ? new Date(workOrder.estimatedCompletionDate) : null,
        estimatedCost: workOrder.estimatedCost || 0,
        actualCost: workOrder.actualCost || 0,
        assignedTo: workOrder.assignedTo?.map(assignment => assignment.worker?._id || assignment.worker) || [],
        photos: workOrder.photos || [],
      });
    }
  }, [isEdit, workOrderData, buildings]);

  // Handle building selection for both create and edit modes
  useEffect(() => {
    if (formik.values.building && !isEdit) {
      const building = buildings.find(b => b._id === formik.values.building);
      setSelectedBuilding(building);
      // Reset apartment fields when building changes in create mode
      formik.setFieldValue('apartmentNumber', '');
      formik.setFieldValue('block', '');
    }
  }, [formik.values.building, buildings, isEdit]);

  const addService = () => {
    formik.setFieldValue('services', [
      ...formik.values.services,
      {
        type: '',
        description: '',
        laborCost: 0,
        materialCost: 0,
        status: 'pending',
      }
    ]);
  };

  const removeService = (index) => {
    const newServices = formik.values.services.filter((_, i) => i !== index);
    formik.setFieldValue('services', newServices);
  };

  const updateService = (index, field, value) => {
    const newServices = [...formik.values.services];
    newServices[index] = { ...newServices[index], [field]: value };
    formik.setFieldValue('services', newServices);
  };

  const addWorker = () => {
    formik.setFieldValue('assignedTo', [
      ...formik.values.assignedTo,
      {
        worker: '',
        assignedBy: user._id,
        status: 'pending',
      }
    ]);
  };

  const removeWorker = (index) => {
    const newAssignedTo = formik.values.assignedTo.filter((_, i) => i !== index);
    formik.setFieldValue('assignedTo', newAssignedTo);
  };

  const updateWorker = (index, field, value) => {
    const newAssignedTo = [...formik.values.assignedTo];
    newAssignedTo[index] = { ...newAssignedTo[index], [field]: value };
    formik.setFieldValue('assignedTo', newAssignedTo);
  };

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    formik.setFieldValue('photos', [...formik.values.photos, ...newPhotos]);
  };

  const removePhoto = (index) => {
    const newPhotos = formik.values.photos.filter((_, i) => i !== index);
    formik.setFieldValue('photos', newPhotos);
  };

  const isLoading = isLoadingWorkOrder || isLoadingBuildings || isLoadingWorkers;
  const isSubmitting = isCreating || isUpdating;

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton 
            onClick={() => navigate('/work-orders')} 
            color="primary"
            disabled={isSubmitting}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isEdit ? 'Edit Work Order' : 'Create New Work Order'}
          </Typography>
        </Box>

        <form onSubmit={formik.handleSubmit}>
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                {/* Title */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="title"
                    label="Title *"
                    value={formik.values.title}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.title && Boolean(formik.errors.title)}
                    helperText={formik.touched.title && formik.errors.title}
                  />
                </Grid>

                {/* Description */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    name="description"
                    label="Description *"
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.description && Boolean(formik.errors.description)}
                    helperText={formik.touched.description && formik.errors.description}
                  />
                </Grid>

                {/* Building */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={formik.touched.building && Boolean(formik.errors.building)}>
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
                          {building.name} - {building.address}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>{formik.touched.building && formik.errors.building}</FormHelperText>
                  </FormControl>
                </Grid>

                {/* Priority */}
                <Grid item xs={12} md={6}>
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

                {/* Block, Apartment, Status */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Block</InputLabel>
                    <Select
                      name="block"
                      value={formik.values.block}
                      onChange={formik.handleChange}
                      label="Block"
                      disabled={!formik.values.building}
                    >
                      <MenuItem value=""><em>Select Block</em></MenuItem>
                      {[...new Set((buildings.find(b => b._id === formik.values.building)?.apartments || []).map(apt => apt.block).filter(Boolean))].map(block => (
                        <MenuItem key={block} value={block}>{block}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Apartment Number</InputLabel>
                    <Select
                      name="apartmentNumber"
                      value={formik.values.apartmentNumber}
                      onChange={formik.handleChange}
                      label="Apartment Number"
                      disabled={!formik.values.building}
                    >
                      <MenuItem value=""><em>Select Apartment</em></MenuItem>
                      {(buildings.find(b => b._id === formik.values.building)?.apartments || [])
                        .filter(apt => !formik.values.block || apt.block === formik.values.block)
                        .map(apt => (
                          <MenuItem key={apt.number} value={apt.number}>{apt.number}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Apartment Status</InputLabel>
                    <Select
                      name="apartmentStatus"
                      value={formik.values.apartmentStatus}
                      onChange={formik.handleChange}
                      label="Apartment Status"
                    >
                      {APARTMENT_STATUS_OPTIONS.map(status => (
                        <MenuItem key={status} value={status}>{status.replace('_', ' ')}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Work Type and Sub-Type */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={formik.touched.workType && Boolean(formik.errors.workType)}>
                    <InputLabel>Work Type *</InputLabel>
                    <Select
                      name="workType"
                      value={formik.values.workType}
                      onChange={formik.handleChange}
                      label="Work Type *"
                    >
                      {Object.keys(workTypeSubtypes).map(type => (
                        <MenuItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>{formik.touched.workType && formik.errors.workType}</FormHelperText>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={formik.touched.workSubType && Boolean(formik.errors.workSubType)}>
                    <InputLabel>Work Sub-Type *</InputLabel>
                    <Select
                      name="workSubType"
                      value={formik.values.workSubType}
                      onChange={formik.handleChange}
                      label="Work Sub-Type *"
                      disabled={!formik.values.workType}
                    >
                      {(workTypeSubtypes[formik.values.workType] || []).map(subType => (
                        <MenuItem key={subType} value={subType}>{subType.replace('_', ' ')}</MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>{formik.touched.workSubType && formik.errors.workSubType}</FormHelperText>
                  </FormControl>
                </Grid>

                {/* Dates */}
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Scheduled Date"
                    value={formik.values.scheduledDate}
                    onChange={value => formik.setFieldValue('scheduledDate', value)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Estimated Completion Date"
                    value={formik.values.estimatedCompletionDate}
                    onChange={value => formik.setFieldValue('estimatedCompletionDate', value)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>

                {/* Costs */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="estimatedCost"
                    label="Estimated Cost"
                    type="number"
                    value={formik.values.estimatedCost}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.estimatedCost && Boolean(formik.errors.estimatedCost)}
                    helperText={formik.touched.estimatedCost && formik.errors.estimatedCost}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="actualCost"
                    label="Actual Cost"
                    type="number"
                    value={formik.values.actualCost}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.actualCost && Boolean(formik.errors.actualCost)}
                    helperText={formik.touched.actualCost && formik.errors.actualCost}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  />
                </Grid>

                {/* Worker Assignment */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Assign Workers</InputLabel>
                    <Select
                      multiple
                      name="assignedTo"
                      value={formik.values.assignedTo}
                      onChange={formik.handleChange}
                      label="Assign Workers"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map(workerId => {
                            const worker = workers.find(w => w._id === workerId);
                            return <Chip key={workerId} label={worker ? `${worker.firstName} ${worker.lastName}` : ''} size="small" />;
                          })}
                        </Box>
                      )}
                    >
                      {workers.map(worker => (
                        <MenuItem key={worker._id} value={worker._id}>
                          <Checkbox checked={formik.values.assignedTo.includes(worker._id)} />
                          <ListItemText primary={`${worker.firstName} ${worker.lastName}`} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/work-orders')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting || !formik.isValid}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {isSubmitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Work Order' : 'Create Work Order')}
            </Button>
          </Box>
        </form>
      </Container>
    </LocalizationProvider>
  );
};

export default WorkOrderForm;

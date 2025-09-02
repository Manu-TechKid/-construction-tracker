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
  building: Yup.string().required('Building is required'),
  apartmentNumber: Yup.string().required('Apartment number is required'),
  description: Yup.string().required('Description is required'),
  priority: Yup.string().required('Priority is required'),
  assignedTo: Yup.array().min(1, 'At least one worker must be assigned'),
  services: Yup.array().of(
    Yup.object().shape({
      type: Yup.string().required('Service type is required'),
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
  const { selectedBuilding } = useBuildingContext();
  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  const { data: workersData } = useGetWorkersQuery();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  
  const [services, setServices] = useState(
    workOrder?.services?.length > 0 
      ? workOrder.services 
      : [{ type: 'painting', description: '', laborCost: 0, materialCost: 0, status: 'pending' }]
  );

  const formik = useFormik({
    initialValues: {
      building: workOrder?.building?._id || selectedBuilding?._id || '',
      apartmentNumber: workOrder?.apartmentNumber || '',
      block: workOrder?.block || '',
      apartmentStatus: workOrder?.apartmentStatus || 'occupied',
      description: workOrder?.description || '',
      priority: workOrder?.priority || 'medium',
      assignedTo: workOrder?.assignedTo?.map(a => a.worker._id) || [],
      scheduledDate: workOrder?.scheduledDate || new Date(),
      requiresInspection: workOrder?.requiresInspection || false,
      inspectionNotes: workOrder?.inspectionNotes || ''
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      try {
        const workOrderData = {
          ...values,
          services: services.map(svc => ({
            type: svc.type,
            description: svc.description,
            laborCost: parseFloat(svc.laborCost) || 0,
            materialCost: parseFloat(svc.materialCost) || 0,
            status: svc.status || 'pending'
          }))
        };

        if (workOrder?._id) {
          await updateWorkOrder({ id: workOrder._id, ...workOrderData }).unwrap();
          enqueueSnackbar('Work order updated successfully', { variant: 'success' });
        } else {
          await createWorkOrder(workOrderData).unwrap();
          enqueueSnackbar('Work order created successfully', { variant: 'success' });
        }

        navigate('/work-orders');
      } catch (error) {
        console.error('Error:', error);
        enqueueSnackbar(
          error?.data?.message || 'Error creating or updating work order', 
          { variant: 'error' }
        );
      }
    }
  });

  const addService = () => {
    setServices([...services, { 
      type: 'painting', 
      description: '', 
      laborCost: 0, 
      materialCost: 0, 
      status: 'pending' 
    }]);
  };

  const removeService = (index) => {
    if (services.length > 1) {
      const updatedServices = [...services];
      updatedServices.splice(index, 1);
      setServices(updatedServices);
    }
  };

  const updateService = (index, field, value) => {
    const updatedServices = [...services];
    updatedServices[index] = {
      ...updatedServices[index],
      [field]: field === 'laborCost' || field === 'materialCost' 
        ? parseFloat(value) || 0 
        : value
    };
    setServices(updatedServices);
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
              
              {services.map((service, index) => (
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
                        disabled={services.length <= 1}
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

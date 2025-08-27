import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Calculate as EstimateIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useBuildingContext } from '../../contexts/BuildingContext';

const validationSchema = Yup.object({
  building: Yup.string().required('Building is required'),
  apartmentNumber: Yup.string().required('Apartment number is required'),
  description: Yup.string().required('Description is required'),
  services: Yup.array().min(1, 'At least one service is required'),
  estimateTotal: Yup.number().min(0, 'Estimate must be positive'),
});

const EnhancedWorkOrderForm = ({ initialValues, onSubmit, isSubmitting, onCancel }) => {
  const { selectedBuilding, getBuildingFilterParams } = useBuildingContext();
  const [services, setServices] = useState([
    { type: 'painting', description: '', laborCost: 0, materialCost: 0 }
  ]);

  const serviceTypes = [
    'painting', 'cleaning', 'repair', 'plumbing', 'electrical', 'custom'
  ];

  const formik = useFormik({
    initialValues: {
      building: selectedBuilding?._id || '',
      apartmentNumber: '',
      description: '',
      priority: 'medium',
      estimateTotal: 0,
      ...getBuildingFilterParams(),
      ...initialValues,
    },
    validationSchema,
    onSubmit: (values) => {
      const totalEstimate = services.reduce((sum, service) => 
        sum + (service.laborCost || 0) + (service.materialCost || 0), 0
      );
      onSubmit({
        ...values,
        services,
        estimateTotal: totalEstimate,
      });
    },
  });

  const addService = () => {
    setServices([...services, { type: 'painting', description: '', laborCost: 0, materialCost: 0 }]);
  };

  const removeService = (index) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index, field, value) => {
    const updated = services.map((service, i) => 
      i === index ? { ...service, [field]: value } : service
    );
    setServices(updated);
  };

  const calculateTotal = () => {
    return services.reduce((sum, service) => 
      sum + (parseFloat(service.laborCost) || 0) + (parseFloat(service.materialCost) || 0), 0
    );
  };

  return (
    <Box component="form" onSubmit={formik.handleSubmit}>
      <Grid container spacing={3}>
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
                            <MenuItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
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
                  Total Estimate: ${calculateTotal().toFixed(2)}
                </Typography>
                <Chip 
                  icon={<EstimateIcon />} 
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
                  disabled={isSubmitting}
                  fullWidth
                >
                  {isSubmitting ? 'Saving...' : 'Save Work Order'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  disabled={isSubmitting}
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

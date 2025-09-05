import React from 'react';
import {
  Box,
  Button,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Divider,
  InputAdornment
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { serviceTypeOptions } from '../utils/validationSchema';

const ServicesSection = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  calculateTotalEstimatedCost
}) => {
  const handleServiceChange = (index, field, value) => {
    const updatedServices = [...values.services];
    updatedServices[index] = { ...updatedServices[index], [field]: value };
    
    // Update the services array
    setFieldValue('services', updatedServices);
    
    // Update the total estimated cost
    if (['laborCost', 'materialCost'].includes(field)) {
      const total = calculateTotalEstimatedCost(updatedServices);
      setFieldValue('estimatedCost', total);
    }
  };

  const addService = () => {
    setFieldValue('services', [
      ...values.services,
      {
        type: '',
        description: '',
        status: 'pending',
        laborCost: 0,
        materialCost: 0,
        notes: []
      }
    ]);
  };

  const removeService = (index) => {
    const updatedServices = [...values.services];
    updatedServices.splice(index, 1);
    setFieldValue('services', updatedServices);
    
    // Update the total estimated cost
    const total = calculateTotalEstimatedCost(updatedServices);
    setFieldValue('estimatedCost', total);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Services
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {values.services.map((service, index) => (
        <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Service Type *</InputLabel>
                <Select
                  name={`services[${index}].type`}
                  value={service.type || ''}
                  onChange={(e) => handleServiceChange(index, 'type', e.target.value)}
                  onBlur={handleBlur}
                  label="Service Type *"
                  error={touched.services?.[index]?.type && Boolean(errors.services?.[index]?.type)}
                >
                  {serviceTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Description *"
                name={`services[${index}].description`}
                value={service.description || ''}
                onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                onBlur={handleBlur}
                margin="normal"
                variant="outlined"
                error={touched.services?.[index]?.description && Boolean(errors.services?.[index]?.description)}
                helperText={touched.services?.[index]?.description && errors.services?.[index]?.description}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Labor Cost ($)"
                type="number"
                name={`services[${index}].laborCost`}
                value={service.laborCost || 0}
                onChange={(e) => handleServiceChange(index, 'laborCost', parseFloat(e.target.value) || 0)}
                onBlur={handleBlur}
                margin="normal"
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Material Cost ($)"
                type="number"
                name={`services[${index}].materialCost`}
                value={service.materialCost || 0}
                onChange={(e) => handleServiceChange(index, 'materialCost', parseFloat(e.target.value) || 0)}
                onBlur={handleBlur}
                margin="normal"
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Typography variant="subtitle1">
                Subtotal: ${((service.laborCost || 0) + (service.materialCost || 0)).toFixed(2)}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              {values.services.length > 1 && (
                <IconButton 
                  onClick={() => removeService(index)}
                  color="error"
                  aria-label="remove service"
                  sx={{ mt: 2 }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Grid>
          </Grid>
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
      
      <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="h6" align="right">
          Total Estimated Cost: ${values.estimatedCost?.toFixed(2) || '0.00'}
        </Typography>
      </Box>
    </Box>
  );
};

export default ServicesSection;

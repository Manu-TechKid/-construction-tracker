import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { toast } from 'react-toastify';

import { useCreateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useAuth } from '../../hooks/useAuth';

const CreateWorkOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // API queries
  const { data: buildingsData, isLoading: isLoadingBuildings } = useGetBuildingsQuery();
  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();

  const buildings = buildingsData?.data?.buildings || [];

  // Form state
  const [formData, setFormData] = useState({
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
    estimatedCost: 0,
    estimatedCompletionDate: null,
    actualCost: 0,
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.building) {
      newErrors.building = 'Building is required';
    }
    
    if (!formData.workType) {
      newErrors.workType = 'Work type is required';
    }
    
    if (!formData.workSubType) {
      newErrors.workSubType = 'Work sub-type is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    try {
      console.log('🚀 Creating work order with simplified data:', formData);
      
      // Create simple payload that matches backend expectations
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        building: formData.building,
        apartmentNumber: formData.apartmentNumber || '',
        block: formData.block || '',
        apartmentStatus: formData.apartmentStatus || 'occupied',
        priority: formData.priority || 'medium',
        scheduledDate: formData.scheduledDate ? formData.scheduledDate.toISOString() : new Date().toISOString(),
        estimatedCost: parseFloat(formData.estimatedCost) || 0,
        // Simple service structure
        services: [{
          type: 'other',
          description: formData.description.trim(),
          laborCost: parseFloat(formData.estimatedCost) || 0,
          materialCost: 0,
          status: 'pending'
        }],
        assignedTo: [],
        photos: [],
        notes: []
      };

      console.log('📤 Sending payload:', payload);
      
      const result = await createWorkOrder(payload).unwrap();
      console.log('✅ Work order created:', result);
      
      toast.success('Work order created successfully!');
      navigate('/work-orders');
      
    } catch (error) {
      console.error('❌ Failed to create work order:', error);
      
      let errorMessage = 'Failed to create work order';
      
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  if (isLoadingBuildings) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton 
            onClick={() => navigate('/work-orders')} 
            color="primary"
            disabled={isCreating}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Create Work Order
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                {/* Title */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Title *"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    error={!!errors.title}
                    helperText={errors.title}
                    placeholder="e.g., Apartment 101 Painting"
                  />
                </Grid>

                {/* Description */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description *"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    error={!!errors.description}
                    helperText={errors.description}
                    placeholder="Describe the work to be done..."
                  />
                </Grid>

                {/* Building */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!errors.building}>
                    <InputLabel>Building *</InputLabel>
                    <Select
                      value={formData.building}
                      onChange={(e) => handleInputChange('building', e.target.value)}
                      label="Building *"
                    >
                      <MenuItem value="">Select Building</MenuItem>
                      {buildings.map((building) => (
                        <MenuItem key={building._id} value={building._id}>
                          {building.name} - {building.address}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.building && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                        {errors.building}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                {/* Priority */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      label="Priority"
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Apartment Number */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Apartment Number"
                    value={formData.apartmentNumber}
                    onChange={(e) => handleInputChange('apartmentNumber', e.target.value)}
                    placeholder="e.g., 101"
                  />
                </Grid>

                {/* Block */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Block"
                    value={formData.block}
                    onChange={(e) => handleInputChange('block', e.target.value)}
                    placeholder="e.g., A"
                  />
                </Grid>

                {/* Apartment Status */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Apartment Status</InputLabel>
                    <Select
                      value={formData.apartmentStatus}
                      onChange={(e) => handleInputChange('apartmentStatus', e.target.value)}
                      label="Apartment Status"
                    >
                      <MenuItem value="vacant">Vacant</MenuItem>
                      <MenuItem value="occupied">Occupied</MenuItem>
                      <MenuItem value="under_renovation">Under Renovation</MenuItem>
                      <MenuItem value="reserved">Reserved</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Work Type and Sub-Type */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!errors.workType}>
                    <InputLabel>Work Type *</InputLabel>
                    <Select
                      value={formData.workType}
                      onChange={(e) => handleInputChange('workType', e.target.value)}
                      label="Work Type *"
                    >
                      <MenuItem value="maintenance">Maintenance</MenuItem>
                      <MenuItem value="repair">Repair</MenuItem>
                      <MenuItem value="installation">Installation</MenuItem>
                      <MenuItem value="inspection">Inspection</MenuItem>
                      <MenuItem value="cleaning">Cleaning</MenuItem>
                      <MenuItem value="renovation">Renovation</MenuItem>
                      <MenuItem value="emergency">Emergency</MenuItem>
                      <MenuItem value="preventive">Preventive</MenuItem>
                    </Select>
                    {errors.workType && (
                      <FormHelperText>{errors.workType}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!errors.workSubType}>
                    <InputLabel>Work Sub-Type *</InputLabel>
                    <Select
                      value={formData.workSubType}
                      onChange={(e) => handleInputChange('workSubType', e.target.value)}
                      label="Work Sub-Type *"
                    >
                      <MenuItem value="plumbing">Plumbing</MenuItem>
                      <MenuItem value="electrical">Electrical</MenuItem>
                      <MenuItem value="hvac">HVAC</MenuItem>
                      <MenuItem value="painting">Painting</MenuItem>
                      <MenuItem value="flooring">Flooring</MenuItem>
                      <MenuItem value="roofing">Roofing</MenuItem>
                      <MenuItem value="carpentry">Carpentry</MenuItem>
                      <MenuItem value="appliance">Appliance</MenuItem>
                      <MenuItem value="landscaping">Landscaping</MenuItem>
                      <MenuItem value="security">Security</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                    {errors.workSubType && (
                      <FormHelperText>{errors.workSubType}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                {/* Scheduled Date */}
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Scheduled Date"
                    value={formData.scheduledDate}
                    onChange={(newValue) => handleInputChange('scheduledDate', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth />
                    )}
                  />
                </Grid>

                {/* Estimated Completion Date */}
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Estimated Completion Date"
                    value={formData.estimatedCompletionDate}
                    onChange={(newValue) => handleInputChange('estimatedCompletionDate', newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                    minDate={new Date()}
                  />
                </Grid>

                {/* Cost Information */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Estimated Cost"
                    type="number"
                    value={formData.estimatedCost}
                    onChange={(e) => handleInputChange('estimatedCost', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Actual Cost"
                    type="number"
                    value={formData.actualCost}
                    onChange={(e) => handleInputChange('actualCost', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>

                {/* Submit Buttons */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/work-orders')}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={isCreating ? <CircularProgress size={16} /> : <SaveIcon />}
                      disabled={isCreating}
                    >
                      {isCreating ? 'Creating...' : 'Create Work Order'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </form>
      </Container>
    </LocalizationProvider>
  );
};

export default CreateWorkOrder;

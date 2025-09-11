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
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useAuth } from '../../hooks/useAuth';

const CreateWorkOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // API queries
  const { data: buildingsData, isLoading: isLoadingBuildings } = useGetBuildingsQuery();
  const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery();
  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();

  const buildings = buildingsData?.data?.buildings || [];
  const workers = (usersData?.data?.users || []).filter(user => user.role === 'worker');
  
  // Memoize workers for the dropdown
  const workerOptions = React.useMemo(() => 
    workers.map(worker => ({
      id: worker._id,
      label: `${worker.firstName} ${worker.lastName}`,
      ...worker
    })), 
    [workers]
  );

  // Work type and sub-type mappings
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
    assignedTo: [],
  });

  // Available apartments and blocks based on selected building
  const availableApartments = React.useMemo(() => {
    if (!formData.building) return [];
    const building = buildings.find(b => b._id === formData.building);
    return building?.apartments || [];
  }, [formData.building, buildings]);

  const availableBlocks = React.useMemo(() => {
    if (!formData.building) return [];
    const building = buildings.find(b => b._id === formData.building);
    return [...new Set(building?.apartments?.map(apt => apt.block).filter(Boolean))] || [];
  }, [formData.building, buildings]);

  // Filtered work sub-types based on selected work type
  const filteredWorkSubTypes = React.useMemo(() => {
    if (!formData.workType) return [];
    return workTypeSubtypes[formData.workType] || [];
  }, [formData.workType]);

  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      // Reset dependent fields when building or work type changes
      const updates = { [field]: value };
      
      if (field === 'building') {
        updates.apartmentNumber = '';
        updates.block = '';
      } else if (field === 'workType') {
        updates.workSubType = '';
      }
      
      return { ...prev, ...updates };
    });
    
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
      console.log('🚀 Creating work order with data:', formData);
      
      // Create payload with proper worker assignments
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        building: formData.building,
        apartmentNumber: formData.apartmentNumber || '',
        block: formData.block || '',
        apartmentStatus: formData.apartmentStatus || 'occupied',
        workType: formData.workType,
        workSubType: formData.workSubType,
        priority: formData.priority || 'medium',
        scheduledDate: formData.scheduledDate ? formData.scheduledDate.toISOString() : new Date().toISOString(),
        estimatedCost: parseFloat(formData.estimatedCost) || 0,
        estimatedCompletionDate: formData.estimatedCompletionDate ? formData.estimatedCompletionDate.toISOString() : null,
        actualCost: parseFloat(formData.actualCost) || 0,
        // Create service entry
        services: [{
          type: formData.workSubType || 'other',
          description: formData.description.trim(),
          laborCost: parseFloat(formData.estimatedCost) || 0,
          materialCost: 0,
          status: 'pending'
        }],
        // Map worker IDs to assignment objects
        assignedTo: Array.isArray(formData.assignedTo) ? formData.assignedTo.map(workerId => ({
          worker: workerId,
          status: 'pending',
          assignedBy: user?._id || null,
          assignedAt: new Date().toISOString()
        })) : [],
        photos: [],
        notes: []
      };
      
      console.log('📤 Submitting work order with payload:', payload);
      
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
                      disabled={isLoadingBuildings}
                    >
                      <MenuItem value="">
                        <em>Select Building</em>
                      </MenuItem>
                      {buildings.map((building) => (
                        <MenuItem key={building._id} value={building._id}>
                          {building.name} - {building.address}
                        </MenuItem>
                      ))}
                    </Select>
                    {isLoadingBuildings && (
                      <FormHelperText>Loading buildings...</FormHelperText>
                    )}
                    {errors.building && (
                      <FormHelperText error>{errors.building}</FormHelperText>
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

                {/* Block */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Block</InputLabel>
                    <Select
                      value={formData.block}
                      onChange={(e) => handleInputChange('block', e.target.value)}
                      label="Block"
                      disabled={!formData.building}
                    >
                      <MenuItem value="">
                        <em>Select Block</em>
                      </MenuItem>
                      {availableBlocks.map((block) => (
                        <MenuItem key={block} value={block}>
                          {block}
                        </MenuItem>
                      ))}
                    </Select>
                    {!formData.building && (
                      <FormHelperText>Select a building first</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                {/* Apartment Number */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Apartment Number</InputLabel>
                    <Select
                      value={formData.apartmentNumber}
                      onChange={(e) => handleInputChange('apartmentNumber', e.target.value)}
                      label="Apartment Number"
                      disabled={!formData.building}
                    >
                      <MenuItem value="">
                        <em>Select Apartment</em>
                      </MenuItem>
                      {availableApartments
                        .filter(apt => !formData.block || apt.block === formData.block)
                        .map((apt) => (
                          <MenuItem key={apt.number} value={apt.number}>
                            {apt.number} {apt.name ? `(${apt.name})` : ''}
                          </MenuItem>
                        ))}
                    </Select>
                    {!formData.building && (
                      <FormHelperText>Select a building first</FormHelperText>
                    )}
                  </FormControl>
                </div>

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
                      disabled={!formData.workType}
                    >
                      <MenuItem value="">
                        <em>Select a sub-type</em>
                      </MenuItem>
                      {filteredWorkSubTypes.map((subType) => (
                        <MenuItem key={subType} value={subType}>
                          {subType.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </MenuItem>
                      ))}
                    </Select>
                    {!formData.workType && (
                      <FormHelperText>Select a work type first</FormHelperText>
                    )}
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

                {/* Worker Assignment */}
                <Grid item xs={12}>
                  <FormControl fullWidth error={!!errors.assignedTo}>
                    <InputLabel>Assign Workers</InputLabel>
                    <Select
                      multiple
                      value={formData.assignedTo}
                      onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                      label="Assign Workers"
                      disabled={isLoadingUsers}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((workerId) => {
                            const worker = workers.find(w => w._id === workerId);
                            return worker ? (
                              <Chip 
                                key={worker._id} 
                                label={`${worker.firstName} ${worker.lastName?.charAt(0) || ''}.`} 
                                size="small"
                              />
                            ) : null;
                          })}
                        </Box>
                      )}
                    >
                      {workerOptions.map((worker) => (
                        <MenuItem key={worker.id} value={worker.id}>
                          <Checkbox checked={formData.assignedTo.includes(worker.id)} />
                          <ListItemText 
                            primary={`${worker.firstName} ${worker.lastName}`}
                            secondary={worker.email}
                          />
                        </MenuItem>
                      ))}
                    </Select>
                    {isLoadingUsers && (
                      <FormHelperText>Loading workers...</FormHelperText>
                    )}
                    {errors.assignedTo && (
                      <FormHelperText error>{errors.assignedTo}</FormHelperText>
                    )}
                  </FormControl>
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

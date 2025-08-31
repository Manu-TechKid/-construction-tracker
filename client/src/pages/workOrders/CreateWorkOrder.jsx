import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Container,
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  OutlinedInput,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { toast } from 'react-toastify';

import { useCreateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useAuth } from '../../hooks/useAuth';

// Validation schema
const validationSchema = Yup.object({
  workType: Yup.string().required('Work type is required'),
  workSubType: Yup.string().required('Service type is required'),
  building: Yup.string().required('Building is required'),
  apartmentNumber: Yup.string(),
  block: Yup.string(),
  description: Yup.string().required('Description is required'),
  priority: Yup.string().required('Priority is required'),
  estimatedCost: Yup.number().min(0, 'Cost must be positive'),
  apartmentStatus: Yup.string().required('Apartment status is required')
});

// Work type options matching backend
const workTypeOptions = [
  { value: 'painting', label: 'Painting' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' }
];

// Service subtypes based on work type
const serviceSubTypes = {
  painting: [
    'Apartment Painting - 1 Room',
    'Apartment Painting - 2 Rooms', 
    'Apartment Painting - 3 Rooms',
    'Door Painting',
    'Ceiling Painting',
    'Cabinet Painting',
    'Hallway Painting',
    'Paint Touch-ups',
    'Full Interior Painting',
    'Exterior Painting'
  ],
  cleaning: [
    '1 Bedroom Cleaning',
    '2 Bedroom Cleaning',
    '3 Bedroom Cleaning',
    'Touch-up Cleaning',
    'Heavy Cleaning',
    'Carpet Cleaning',
    'Gutter Cleaning',
    'Window Cleaning',
    'Deep Cleaning',
    'Move-out Cleaning'
  ],
  repairs: [
    'Air Conditioning Repair',
    'Door Repair',
    'Ceiling Repair',
    'Floor Repair',
    'Wall Repair',
    'Window Repair',
    'Appliance Repair',
    'General Maintenance Repair'
  ],
  maintenance: [
    'Preventive Maintenance',
    'Emergency Maintenance',
    'Routine Inspection',
    'Equipment Maintenance',
    'Safety Check'
  ],
  plumbing: [
    'Leak Repair',
    'Pipe Installation',
    'Drain Cleaning',
    'Fixture Installation',
    'Water Heater Service'
  ],
  electrical: [
    'Outlet Installation',
    'Light Fixture Installation',
    'Wiring Repair',
    'Circuit Breaker Service',
    'Electrical Inspection'
  ],
  hvac: [
    'AC Installation',
    'Heating Repair',
    'Vent Cleaning',
    'Filter Replacement',
    'System Maintenance'
  ],
  flooring: [
    'Carpet Installation',
    'Hardwood Installation',
    'Tile Installation',
    'Floor Repair',
    'Floor Refinishing'
  ],
  roofing: [
    'Roof Repair',
    'Roof Inspection',
    'Gutter Repair',
    'Leak Repair',
    'Roof Replacement'
  ],
  carpentry: [
    'Cabinet Installation',
    'Door Installation',
    'Trim Work',
    'Custom Carpentry',
    'Furniture Repair'
  ],
  inspection: [
    'Safety Inspection',
    'Quality Inspection',
    'Compliance Check',
    'Pre-move Inspection',
    'Damage Assessment'
  ],
  other: [
    'Custom Service',
    'Special Request',
    'Consultation',
    'Emergency Service'
  ]
};

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'success' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'high', label: 'High', color: 'error' },
  { value: 'urgent', label: 'Urgent', color: 'error' }
];

const apartmentStatusOptions = [
  { value: 'vacant', label: 'Vacant' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'under_renovation', label: 'Under Renovation' },
  { value: 'reserved', label: 'Reserved' }
];

const CreateWorkOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const { data: buildingsData, isLoading: buildingsLoading } = useGetBuildingsQuery();

  // Extract buildings from API response
  const buildings = buildingsData?.data?.buildings || buildingsData?.data || [];

  const formik = useFormik({
    initialValues: {
      workType: '',
      workSubType: '',
      building: '',
      apartmentNumber: '',
      block: '',
      description: '',
      priority: 'medium',
      estimatedCost: '',
      apartmentStatus: 'vacant',
      scheduledDate: null,
      photos: []
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const workOrderData = {
          ...values,
          createdBy: user?.id,
          estimatedCost: values.estimatedCost ? parseFloat(values.estimatedCost) : 0,
          scheduledDate: values.scheduledDate ? values.scheduledDate.toISOString() : null
        };

        const result = await createWorkOrder(workOrderData).unwrap();
        toast.success('Work order created successfully');
        navigate(`/work-orders/${result.data.workOrder._id}`);
      } catch (error) {
        console.error('Failed to create work order:', error);
        toast.error(error?.data?.message || 'Failed to create work order');
      }
    }
  });

  const handleCancel = () => {
    navigate('/work-orders');
  };

  const availableSubTypes = formik.values.workType ? serviceSubTypes[formik.values.workType] || [] : [];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/work-orders')}
          sx={{ mb: 2 }}
        >
          Back to Work Orders
        </Button>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <WorkIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              Create New Work Order
            </Typography>
          </Box>

          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={3}>
              {/* Work Details Section */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Work Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <FormControl 
                          fullWidth 
                          error={formik.touched.workType && Boolean(formik.errors.workType)}
                        >
                          <InputLabel>Work Type</InputLabel>
                          <Select
                            name="workType"
                            value={formik.values.workType}
                            onChange={(e) => {
                              formik.handleChange(e);
                              // Reset subtype when work type changes
                              formik.setFieldValue('workSubType', '');
                            }}
                            onBlur={formik.handleBlur}
                            label="Work Type"
                          >
                            {workTypeOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                          <FormHelperText>
                            {formik.touched.workType && formik.errors.workType}
                          </FormHelperText>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl 
                          fullWidth 
                          error={formik.touched.workSubType && Boolean(formik.errors.workSubType)}
                          disabled={!formik.values.workType}
                        >
                          <InputLabel>Service Type</InputLabel>
                          <Select
                            name="workSubType"
                            value={formik.values.workSubType}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            label="Service Type"
                          >
                            {availableSubTypes.map((subType) => (
                              <MenuItem key={subType} value={subType}>
                                {subType}
                              </MenuItem>
                            ))}
                          </Select>
                          <FormHelperText>
                            {formik.touched.workSubType && formik.errors.workSubType}
                          </FormHelperText>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          name="description"
                          label="Description"
                          multiline
                          rows={3}
                          value={formik.values.description}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={formik.touched.description && Boolean(formik.errors.description)}
                          helperText={formik.touched.description && formik.errors.description}
                          placeholder="Describe the work to be done..."
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Location Section */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Location Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <FormControl 
                          fullWidth 
                          error={formik.touched.building && Boolean(formik.errors.building)}
                        >
                          <InputLabel>Building</InputLabel>
                          <Select
                            name="building"
                            value={formik.values.building}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            label="Building"
                            disabled={buildingsLoading}
                          >
                            {buildings.map((building) => (
                              <MenuItem key={building._id} value={building._id}>
                                {building.name}
                              </MenuItem>
                            ))}
                          </Select>
                          <FormHelperText>
                            {formik.touched.building && formik.errors.building}
                          </FormHelperText>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          name="apartmentNumber"
                          label="Apartment Number"
                          value={formik.values.apartmentNumber}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={formik.touched.apartmentNumber && Boolean(formik.errors.apartmentNumber)}
                          helperText={formik.touched.apartmentNumber && formik.errors.apartmentNumber}
                          placeholder="e.g., 101, 2A"
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          name="block"
                          label="Block"
                          value={formik.values.block}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={formik.touched.block && Boolean(formik.errors.block)}
                          helperText={formik.touched.block && formik.errors.block}
                          placeholder="e.g., A, B, North"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl 
                          fullWidth 
                          error={formik.touched.apartmentStatus && Boolean(formik.errors.apartmentStatus)}
                        >
                          <InputLabel>Apartment Status</InputLabel>
                          <Select
                            name="apartmentStatus"
                            value={formik.values.apartmentStatus}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            label="Apartment Status"
                          >
                            {apartmentStatusOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                          <FormHelperText>
                            {formik.touched.apartmentStatus && formik.errors.apartmentStatus}
                          </FormHelperText>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Priority & Scheduling Section */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Priority & Scheduling
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <FormControl 
                          fullWidth 
                          error={formik.touched.priority && Boolean(formik.errors.priority)}
                        >
                          <InputLabel>Priority</InputLabel>
                          <Select
                            name="priority"
                            value={formik.values.priority}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            label="Priority"
                          >
                            {priorityOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                <Chip
                                  label={option.label}
                                  color={option.color}
                                  size="small"
                                  variant="outlined"
                                />
                              </MenuItem>
                            ))}
                          </Select>
                          <FormHelperText>
                            {formik.touched.priority && formik.errors.priority}
                          </FormHelperText>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          name="estimatedCost"
                          label="Estimated Cost ($)"
                          type="number"
                          value={formik.values.estimatedCost}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={formik.touched.estimatedCost && Boolean(formik.errors.estimatedCost)}
                          helperText={formik.touched.estimatedCost && formik.errors.estimatedCost}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <DatePicker
                          label="Scheduled Date"
                          value={formik.values.scheduledDate}
                          onChange={(date) => formik.setFieldValue('scheduledDate', date)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                              error={formik.touched.scheduledDate && Boolean(formik.errors.scheduledDate)}
                              helperText={formik.touched.scheduledDate && formik.errors.scheduledDate}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isCreating}
                    startIcon={isCreating ? <CircularProgress size={20} /> : <SaveIcon />}
                  >
                    {isCreating ? 'Creating...' : 'Create Work Order'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

export default CreateWorkOrder;

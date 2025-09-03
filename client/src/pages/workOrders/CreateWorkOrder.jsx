import React, { useState, useEffect } from 'react';
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
  Divider,
  Autocomplete,
  Checkbox,
  ListItemText,
  InputAdornment,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Work as WorkIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useDropzone } from 'react-dropzone';

import { useCreateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { useAuth } from '../../hooks/useAuth';
import { useBuildingContext } from '../../contexts/BuildingContext';
import WorkerSelectionDialog from '../../components/workOrders/WorkerSelectionDialog';

// Extended validation schema to match all WorkOrder model fields
const validationSchema = Yup.object({
  title: Yup.string().required('Title is required').max(100, 'Title cannot exceed 100 characters'),
  building: Yup.string().required('Building is required'),
  apartmentNumber: Yup.string().max(20, 'Apartment number cannot exceed 20 characters'),
  block: Yup.string().max(50, 'Block cannot exceed 50 characters'),
  apartmentStatus: Yup.string()
    .required('Apartment status is required')
    .oneOf(['vacant', 'occupied', 'under_renovation', 'reserved'], 'Invalid status'),
  description: Yup.string().required('Description is required'),
  priority: Yup.string()
    .required('Priority is required')
    .oneOf(['low', 'medium', 'high', 'urgent'], 'Invalid priority'),
  status: Yup.string()
    .required('Status is required')
    .oneOf(['pending', 'in_progress', 'on_hold', 'completed', 'cancelled'], 'Invalid status'),
  scheduledDate: Yup.date()
    .required('Scheduled date is required')
    .min(new Date(), 'Scheduled date cannot be in the past'),
  estimatedCompletionDate: Yup.date()
    .min(Yup.ref('scheduledDate'), 'Completion date must be after scheduled date')
    .nullable(),
  assignedTo: Yup.array().of(
    Yup.object({
      worker: Yup.string().required('Worker ID is required'),
      status: Yup.string().oneOf(['pending', 'in_progress', 'completed', 'rejected']),
      notes: Yup.string(),
      timeSpent: Yup.object({
        hours: Yup.number().min(0, 'Hours cannot be negative'),
        minutes: Yup.number().min(0, 'Minutes cannot be negative').max(59, 'Minutes must be less than 60')
      })
    })
  ),
  services: Yup.array()
    .min(1, 'At least one service is required')
    .of(
      Yup.object({
        type: Yup.string()
          .required('Service type is required')
          .oneOf(
            [
              'painting', 'cleaning', 'repair', 'plumbing', 'electrical', 
              'hvac', 'flooring', 'roofing', 'carpentry', 'other'
            ],
            'Invalid service type'
          ),
        description: Yup.string().required('Service description is required'),
        laborCost: Yup.number()
          .min(0, 'Labor cost must be positive')
          .required('Labor cost is required'),
        materialCost: Yup.number()
          .min(0, 'Material cost must be positive')
          .required('Material cost is required'),
        status: Yup.string()
          .oneOf(
            ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'],
            'Invalid status'
          )
      })
    ),
  notes: Yup.array().of(
    Yup.object({
      content: Yup.string().required('Note content is required'),
      isPrivate: Yup.boolean()
    })
  ),
  photos: Yup.array().of(
    Yup.object({
      url: Yup.string().required('Photo URL is required'),
      filename: Yup.string(),
      originalname: Yup.string()
    })
  ),
  isBilled: Yup.boolean(),
  isPaid: Yup.boolean(),
  requiresFollowUp: Yup.boolean()
});

// Service type options with categories
const serviceTypeOptions = [
  { value: 'painting', label: 'Painting', category: 'Interior' },
  { value: 'cleaning', label: 'Cleaning', category: 'Maintenance' },
  { value: 'repair', label: 'Repair', category: 'Maintenance' },
  { value: 'plumbing', label: 'Plumbing', category: 'Maintenance' },
  { value: 'electrical', label: 'Electrical', category: 'Maintenance' },
  { value: 'hvac', label: 'HVAC', category: 'Maintenance' },
  { value: 'flooring', label: 'Flooring', category: 'Interior' },
  { value: 'roofing', label: 'Roofing', category: 'Exterior' },
  { value: 'carpentry', label: 'Carpentry', category: 'Interior' },
  { value: 'landscaping', label: 'Landscaping', category: 'Exterior' },
  { value: 'appliance', label: 'Appliance', category: 'Maintenance' },
  { value: 'pest_control', label: 'Pest Control', category: 'Maintenance' },
  { value: 'safety', label: 'Safety Inspection', category: 'Inspection' },
  { value: 'move_in', label: 'Move-in', category: 'Inspection' },
  { value: 'move_out', label: 'Move-out', category: 'Inspection' },
  { value: 'other', label: 'Other', category: 'Miscellaneous' }
];

// Service descriptions based on service type with estimated times
const serviceDescriptions = {
  painting: [
    { label: 'Apartment Painting - 1 Room', estimatedHours: 4 },
    { label: 'Apartment Painting - 2 Rooms', estimatedHours: 6 },
    { label: 'Apartment Painting - 3+ Rooms', estimatedHours: 8 },
    { label: 'Door Painting', estimatedHours: 1 },
    { label: 'Ceiling Painting', estimatedHours: 3 },
    { label: 'Cabinet Painting', estimatedHours: 5 },
    { label: 'Hallway Painting', estimatedHours: 2 },
    { label: 'Paint Touch-ups', estimatedHours: 1 },
    { label: 'Full Interior Painting', estimatedHours: 16 },
    { label: 'Exterior Painting', estimatedHours: 24 }
  ],
  cleaning: [
    { label: '1 Bedroom Cleaning', estimatedHours: 2 },
    { label: '2 Bedroom Cleaning', estimatedHours: 3 },
    { label: '3+ Bedroom Cleaning', estimatedHours: 4 },
    { label: 'Touch-up Cleaning', estimatedHours: 1 },
    { label: 'Heavy Cleaning', estimatedHours: 6 },
    { label: 'Carpet Cleaning', estimatedHours: 3 },
    { label: 'Gutter Cleaning', estimatedHours: 2 },
    { label: 'Window Cleaning', estimatedHours: 2 },
    { label: 'Deep Cleaning', estimatedHours: 8 },
    { label: 'Move-out Cleaning', estimatedHours: 6 }
  ],
  repair: [
    { label: 'Air Conditioning Repair', estimatedHours: 2 },
    { label: 'Door Repair', estimatedHours: 1 },
    { label: 'Ceiling Repair', estimatedHours: 3 },
    { label: 'Floor Repair', estimatedHours: 2 },
    { label: 'Wall Repair', estimatedHours: 2 },
    { label: 'Window Repair', estimatedHours: 2 },
    { label: 'Appliance Repair', estimatedHours: 2 },
    { label: 'General Maintenance Repair', estimatedHours: 4 },
    { label: 'Carpentry Repair', estimatedHours: 3 },
    { label: 'Roof Repair', estimatedHours: 6 },
    { label: 'Plumbing Fixture Repair', estimatedHours: 2 },
    { label: 'Electrical Outlet Repair', estimatedHours: 1.5 }
  ],
  plumbing: [
    { label: 'Leak Repair', estimatedHours: 1.5 },
    { label: 'Pipe Installation', estimatedHours: 3 },
    { label: 'Drain Cleaning', estimatedHours: 1 },
    { label: 'Fixture Installation', estimatedHours: 2 },
    { label: 'Water Heater Service', estimatedHours: 2 },
    { label: 'Toilet Repair', estimatedHours: 1.5 },
    { label: 'Faucet Replacement', estimatedHours: 1 },
    { label: 'Shower Valve Repair', estimatedHours: 2 },
    { label: 'Sewer Line Inspection', estimatedHours: 3 },
    { label: 'Sump Pump Installation', estimatedHours: 4 }
  ],
  electrical: [
    { label: 'Outlet Installation', estimatedHours: 1 },
    { label: 'Light Fixture Installation', estimatedHours: 1.5 },
    { label: 'Circuit Breaker Replacement', estimatedHours: 2 },
    { label: 'GFCI Outlet Installation', estimatedHours: 1.5 },
    { label: 'Ceiling Fan Installation', estimatedHours: 2 },
    { label: 'Electrical Panel Upgrade', estimatedHours: 6 },
    { label: 'Wiring Inspection', estimatedHours: 2 },
    { label: 'Smoke Detector Installation', estimatedHours: 1 },
    { label: 'Generator Installation', estimatedHours: 8 },
    { label: 'Emergency Electrical Repair', estimatedHours: 4 },
    { label: 'Wiring Repair', estimatedHours: 3 },
    { label: 'Circuit Breaker Service', estimatedHours: 1.5 },
    { label: 'Electrical Inspection', estimatedHours: 2 },
    { label: 'Surge Protector Installation', estimatedHours: 1.5 },
    { label: 'Landscape Lighting Installation', estimatedHours: 4 }
  ],
  hvac: [
    { label: 'AC Installation', estimatedHours: 6 },
    { label: 'Heating Repair', estimatedHours: 3 },
    { label: 'Vent Cleaning', estimatedHours: 2 },
    { label: 'Filter Replacement', estimatedHours: 0.5 },
    { label: 'System Maintenance', estimatedHours: 2 },
    { label: 'Thermostat Installation', estimatedHours: 1.5 },
    { label: 'Ductwork Repair', estimatedHours: 4 },
    { label: 'Heat Pump Service', estimatedHours: 2.5 },
    { label: 'Air Handler Replacement', estimatedHours: 5 },
    { label: 'Emergency HVAC Repair', estimatedHours: 4 }
  ],
  flooring: [
    { label: 'Carpet Installation', estimatedHours: 8 },
    { label: 'Hardwood Installation', estimatedHours: 12 },
    { label: 'Tile Installation', estimatedHours: 16 },
    { label: 'Floor Refinishing', estimatedHours: 24 },
    { label: 'Laminate Installation', estimatedHours: 10 },
    { label: 'Vinyl Plank Installation', estimatedHours: 10 },
    { label: 'Subfloor Repair', estimatedHours: 6 },
    { label: 'Baseboard Installation', estimatedHours: 4 },
    { label: 'Stair Tread Replacement', estimatedHours: 6 },
    { label: 'Radiant Floor Heating', estimatedHours: 16 }
  ],
  roofing: [
    { label: 'Shingle Replacement', estimatedHours: 8 },
    { label: 'Roof Inspection', estimatedHours: 2 },
    { label: 'Leak Repair', estimatedHours: 4 },
    { label: 'Gutter Installation', estimatedHours: 6 },
    { label: 'Roof Coating', estimatedHours: 12 },
    { label: 'Flashing Repair', estimatedHours: 3 },
    { label: 'Roof Vent Installation', estimatedHours: 2 },
    { label: 'Skylight Installation', estimatedHours: 6 },
    { label: 'Ice Dam Removal', estimatedHours: 4 },
    { label: 'Emergency Tarp Installation', estimatedHours: 3 }
  ],
  carpentry: [
    { label: 'Cabinet Installation', estimatedHours: 8 },
    { label: 'Trim Work', estimatedHours: 6 },
    { label: 'Deck Building', estimatedHours: 24 },
    { label: 'Door Installation', estimatedHours: 3 },
    { label: 'Custom Shelving', estimatedHours: 5 },
    { label: 'Crown Molding', estimatedHours: 4 },
    { label: 'Wainscoting', estimatedHours: 8 },
    { label: 'Built-in Furniture', estimatedHours: 12 },
    { label: 'Window Trim', estimatedHours: 3 },
    { label: 'Stair Railing', estimatedHours: 6 },
    { label: 'Furniture Repair', estimatedHours: 4 }
  ],
  landscaping: [
    { label: 'Lawn Mowing', estimatedHours: 2 },
    { label: 'Yard Cleanup', estimatedHours: 4 },
    { label: 'Garden Bed Maintenance', estimatedHours: 3 },
    { label: 'Tree Trimming', estimatedHours: 6 },
    { label: 'Shrub Pruning', estimatedHours: 4 },
    { label: 'Flower Bed Installation', estimatedHours: 8 },
    { label: 'Patio Installation', estimatedHours: 12 },
    { label: 'Retaining Wall Installation', estimatedHours: 16 },
    { label: 'Irrigation System Installation', estimatedHours: 10 },
    { label: 'Outdoor Lighting Installation', estimatedHours: 8 }
  ],
  appliance: [
    { label: 'Refrigerator Installation', estimatedHours: 2 },
    { label: 'Dishwasher Installation', estimatedHours: 2 },
    { label: 'Washing Machine Installation', estimatedHours: 2 },
    { label: 'Dryer Installation', estimatedHours: 2 },
    { label: 'Oven Installation', estimatedHours: 3 },
    { label: 'Microwave Installation', estimatedHours: 1.5 },
    { label: 'Garbage Disposal Installation', estimatedHours: 1.5 },
    { label: 'Range Hood Installation', estimatedHours: 2 },
    { label: 'Appliance Repair', estimatedHours: 2 }
  ],
  pest_control: [
    { label: 'Ant Control', estimatedHours: 1 },
    { label: 'Bed Bug Treatment', estimatedHours: 4 },
    { label: 'Cockroach Control', estimatedHours: 2 },
    { label: 'Rodent Control', estimatedHours: 3 },
    { label: 'Termite Treatment', estimatedHours: 6 },
    { label: 'Flea and Tick Control', estimatedHours: 2 },
    { label: 'Mosquito Control', estimatedHours: 3 },
    { label: 'Spider Control', estimatedHours: 1.5 },
    { label: 'Wildlife Removal', estimatedHours: 4 }
  ],
  safety: [
    { label: 'Smoke Detector Check', estimatedHours: 1 },
    { label: 'Carbon Monoxide Testing', estimatedHours: 1 },
    { label: 'Fire Extinguisher Inspection', estimatedHours: 0.5 },
    { label: 'Emergency Exit Check', estimatedHours: 1 },
    { label: 'Safety Equipment Audit', estimatedHours: 2 },
    { label: 'Fire Alarm Testing', estimatedHours: 2 },
    { label: 'Elevator Safety Inspection', estimatedHours: 3 },
    { label: 'Handrail Inspection', estimatedHours: 1 },
    { label: 'Lighting Safety Check', estimatedHours: 1.5 },
    { label: 'Emergency Lighting Test', estimatedHours: 1 }
  ],
  other: [
    { label: 'Custom Service', estimatedHours: 4 },
    { label: 'Special Request', estimatedHours: 4 },
    { label: 'Consultation', estimatedHours: 2 },
    { label: 'Emergency Service', estimatedHours: 4 }
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

  // State for services array
  // State for worker assignment dialog
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [assignedWorkers, setAssignedWorkers] = useState([]);
  
  // State for services array
  const [services, setServices] = useState([{
    type: '',
    description: '',
    laborCost: 0,
    materialCost: 0,
    estimatedHours: 1,
    status: 'pending'
  }]);

  const addService = () => {
    const newService = { 
      type: 'painting', 
      description: 'Apartment Painting - 1 Room', 
      laborCost: 0, 
      materialCost: 0, 
      estimatedHours: 1,
      status: 'pending' 
    };
    const updatedServices = [...services, newService];
    setServices(updatedServices);
    formik.setFieldValue('services', updatedServices);
  };

  const removeService = (index) => {
    if (services.length <= 1) {
      toast.error('At least one service is required');
      return;
    }
    const newServices = [...services];
    newServices.splice(index, 1);
    setServices(newServices);
    formik.setFieldValue('services', newServices);
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate('/work-orders');
    }
  };

  // Handle worker assignment
  const handleOpenWorkerDialog = () => {
    setWorkerDialogOpen(true);
  };

  const handleCloseWorkerDialog = () => {
    setWorkerDialogOpen(false);
  };

  const handleSaveWorkers = (assignments) => {
    setAssignedWorkers(assignments);
    formik.setFieldValue('assignedTo', assignments);
  };

  // Format assigned workers for display
  const getAssignedWorkersText = () => {
    if (assignedWorkers.length === 0) return 'No workers assigned';
    return assignedWorkers
      .map(assignment => {
        const worker = assignment.worker?.name || 'Unknown Worker';
        return assignment.notes 
          ? `${worker} (${assignment.notes})` 
          : worker;
      })
      .join(', ');
  };

  const formik = useFormik({
    initialValues: {
      building: '',
      apartmentNumber: '',
      block: '',
      apartmentStatus: 'vacant',
      description: '',
      priority: 'medium',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      scheduledDate: new Date(),
      assignedTo: [],
      services: [{
        type: 'painting',
        description: 'Apartment Painting - 1 Room',
        laborCost: 0,
        materialCost: 0,
        status: 'pending'
      }]
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        // Validate services
        if (services.length === 0 || services.some(s => !s.type || !s.description)) {
          toast.error('Please add at least one complete service');
          return;
        }

        // Ensure services array is properly formatted
        const formattedServices = services.map(service => ({
          type: service.type,
          description: service.description,
          laborCost: Number(service.laborCost) || 0,
          materialCost: Number(service.materialCost) || 0,
          estimatedHours: Number(service.estimatedHours) || 1,
          status: service.status || 'pending'
        }));

        // Create work order data
        const workOrderData = {
          title: values.title || `Work Order - ${new Date().toLocaleDateString()}`,
          building: values.building,
          apartmentNumber: values.apartmentNumber || '',
          block: values.block || '',
          apartmentStatus: values.apartmentStatus,
          description: values.description,
          priority: values.priority,
          status: values.status || 'pending',
          scheduledDate: values.scheduledDate,
          estimatedCompletionDate: values.estimatedCompletionDate,
          assignedTo: values.assignedTo || [],
          services: formattedServices,
          createdBy: user._id,
          updatedBy: user._id
        };

        // Submit the work order
        await createWorkOrder(workOrderData).unwrap();
        
        // Show success message and reset form
        toast.success('Work order created successfully');
        resetForm();
        setServices([{
          type: 'painting',
          description: 'Apartment Painting - 1 Room',
          laborCost: 0,
          materialCost: 0,
          estimatedHours: 1,
          status: 'pending'
        }]);
        setAssignedWorkers([]);
        navigate('/work-orders');
      } catch (err) {
        console.error('Error creating work order:', err);
        toast.error(err?.data?.message || 'Failed to create work order');
      } finally {
        setSubmitting(false);
      }
    }
  });

  const updateService = (index, field, value) => {
    const updatedServices = [...services];
    
    // If description changes and it's from our predefined list, update estimated hours
    if (field === 'description' && value) {
      const currentService = updatedServices[index];
      if (currentService.type) {
        const descriptions = serviceDescriptions[currentService.type] || [];
        const selectedDesc = descriptions.find(d => d.label === value);
        if (selectedDesc) {
          updatedServices[index] = {
            ...currentService,
            description: value,
            estimatedHours: selectedDesc.estimatedHours
          };
          setServices(updatedServices);
          formik.setFieldValue('services', updatedServices);
          return;
        }
      }
    }
    
    // Handle service type change
    if (field === 'type' && value) {
      const serviceType = serviceTypeOptions.find(opt => opt.value === value);
      if (serviceType) {
        const descriptions = serviceDescriptions[value] || [];
        updatedServices[index] = {
          ...updatedServices[index],
          type: value,
          description: descriptions[0]?.label || '',
          estimatedHours: descriptions[0]?.estimatedHours || 1
        };
        setServices(updatedServices);
        formik.setFieldValue('services', updatedServices);
        return;
      }
    }
    
    // Default update for other fields
    updatedServices[index] = { 
      ...updatedServices[index], 
      [field]: field === 'laborCost' || field === 'materialCost' ? Number(value) : value 
    };
    
    setServices(updatedServices);
    formik.setFieldValue('services', updatedServices);
  };

  const getAvailableDescriptions = (serviceType) => {
    if (!serviceType) return [];
    const descriptions = serviceDescriptions[serviceType] || [];
    return descriptions.map(desc => desc.label);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      {/* Worker Selection Dialog */}
      <WorkerSelectionDialog
        open={workerDialogOpen}
        onClose={handleCloseWorkerDialog}
        onSave={handleSaveWorkers}
        assignedWorkers={assignedWorkers}
        maxAssignments={5}
      />
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
                      {/* Services Section */}
                      <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                          Services
                        </Typography>
                        {services.map((service, index) => (
                          <Card key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} md={3}>
                                <FormControl fullWidth>
                                  <InputLabel>Service Type</InputLabel>
                                  <Select
                                    value={service.type}
                                    onChange={(e) => updateService(index, 'type', e.target.value)}
                                    label="Service Type"
                                  >
                                    {serviceTypeOptions.map((option) => (
                                      <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <FormControl fullWidth disabled={!service.type}>
                                  <InputLabel>Description</InputLabel>
                                  <Select
                                    value={service.description}
                                    onChange={(e) => updateService(index, 'description', e.target.value)}
                                    label="Description"
                                  >
                                    {getAvailableDescriptions(service.type).map((desc) => {
                                      const descValue = typeof desc === 'string' ? desc : desc.label;
                                      return (
                                        <MenuItem key={descValue} value={descValue}>
                                          {descValue}
                                        </MenuItem>
                                      );
                                    })}
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={6} md={2}>
                                <TextField
                                  fullWidth
                                  label="Labor Cost ($)"
                                  type="number"
                                  value={service.laborCost}
                                  onChange={(e) => updateService(index, 'laborCost', e.target.value)}
                                  inputProps={{ min: 0, step: 0.01 }}
                                />
                              </Grid>
                              <Grid item xs={6} md={2}>
                                <TextField
                                  fullWidth
                                  label="Material Cost ($)"
                                  type="number"
                                  value={service.materialCost}
                                  onChange={(e) => updateService(index, 'materialCost', e.target.value)}
                                  inputProps={{ min: 0, step: 0.01 }}
                                />
                              </Grid>
                              <Grid item xs={12} md={1}>
                                <Button
                                  color="error"
                                  onClick={() => removeService(index)}
                                  disabled={services.length === 1}
                                >
                                  Remove
                                </Button>
                              </Grid>
                            </Grid>
                          </Card>
                        ))}
                        <Button
                          variant="outlined"
                          onClick={addService}
                          startIcon={<AddIcon />}
                          sx={{ mt: 1 }}
                        >
                          Add Service
                        </Button>
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
                          label="Total Estimated Cost ($)"
                          type="number"
                          value={formik.values.estimatedCost}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={formik.touched.estimatedCost && Boolean(formik.errors.estimatedCost)}
                          helperText={formik.touched.estimatedCost && formik.errors.estimatedCost}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <DatePicker
                          label="Start Date"
                          value={formik.values.startDate}
                          onChange={(date) => formik.setFieldValue('startDate', date)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                              error={formik.touched.startDate && Boolean(formik.errors.startDate)}
                              helperText={formik.touched.startDate && formik.errors.startDate}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <DatePicker
                          label="End Date"
                          value={formik.values.endDate}
                          onChange={(date) => formik.setFieldValue('endDate', date)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                              error={formik.touched.endDate && Boolean(formik.errors.endDate)}
                              helperText={formik.touched.endDate && formik.errors.endDate}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
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
                      <Grid item xs={12} md={3}>
                        <DatePicker
                          label="Est. Completion Date"
                          value={formik.values.estimatedCompletionDate}
                          onChange={(date) => formik.setFieldValue('estimatedCompletionDate', date)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Worker Assignment Section */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Worker Assignment
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={9}>
                        <TextField
                          fullWidth
                          label="Assigned Workers"
                          value={getAssignedWorkersText()}
                          InputProps={{
                            readOnly: true,
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonAddIcon />
                              </InputAdornment>
                            ),
                          }}
                          variant="outlined"
                          helperText={formik.touched.assignedTo && formik.errors.assignedTo}
                          error={formik.touched.assignedTo && Boolean(formik.errors.assignedTo)}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={handleOpenWorkerDialog}
                          startIcon={<PersonAddIcon />}
                        >
                          Assign Workers
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => formik.resetForm()}
                      disabled={isCreating}
                    >
                      Reset Form
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

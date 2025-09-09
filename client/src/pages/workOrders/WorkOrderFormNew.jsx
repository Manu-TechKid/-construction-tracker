import React, { useState, useEffect, useMemo } from 'react';
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
  Checkbox,
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
  Divider,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  ErrorOutline as ErrorOutlineIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Utility function to generate a color from a string
const stringToColor = (string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
};

// Validation schema
const validationSchema = Yup.object().shape({
  title: Yup.string()
    .required('Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: Yup.string()
    .max(1000, 'Description must be less than 1000 characters'),
  building: Yup.string()
    .required('Building is required'),
  apartmentNumber: Yup.string()
    .max(20, 'Apartment number must be less than 20 characters'),
  block: Yup.string()
    .max(20, 'Block must be less than 20 characters'),
  apartmentStatus: Yup.string()
    .oneOf(['vacant', 'occupied', 'under_renovation', 'reserved'], 'Invalid status')
    .default('occupied'),
  priority: Yup.string()
    .oneOf(['low', 'medium', 'high', 'urgent'], 'Invalid priority level')
    .default('medium'),
  status: Yup.string()
    .oneOf(
      ['pending', 'in_progress', 'on_hold', 'completed', 'cancelled', 'pending_review', 'issue_reported'],
      'Invalid status'
    )
    .default('pending'),
  scheduledDate: Yup.date()
    .required('Scheduled date is required'),
  estimatedCompletionDate: Yup.date()
    .min(Yup.ref('scheduledDate'), 'Completion date must be after scheduled date'),
  assignedTo: Yup.array()
    .of(Yup.string())
    .test(
      'max-workers',
      'Maximum of 5 workers can be assigned',
      (value) => !value || value.length <= 5
    ),
  services: Yup.array()
    .min(1, 'At least one service is required')
    .max(10, 'Maximum of 10 services allowed')
    .of(
      Yup.object().shape({
        type: Yup.string().required('Service type is required'),
        description: Yup.string().required('Description is required'),
        laborCost: Yup.number().min(0, 'Labor cost cannot be negative').required('Required'),
        materialCost: Yup.number().min(0, 'Material cost cannot be negative').required('Required'),
        estimatedHours: Yup.number()
          .min(0.1, 'Must be at least 0.1 hours')
          .required('Required'),
        status: Yup.string()
          .oneOf(['pending', 'in_progress', 'completed', 'on_hold'], 'Invalid status')
          .default('pending'),
        completed: Yup.boolean().default(false)
      })
    )
});

// Worker Details Dialog Component
const WorkerDetailsDialog = ({ open, onClose, worker }) => {
  if (!worker) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Worker Details</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80,
                bgcolor: stringToColor(worker.name || '') 
              }}
            >
              {worker.name?.charAt(0) || '?'}
            </Avatar>
            <Box>
              <Typography variant="h6">{worker.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {worker.role || 'Worker'}
              </Typography>
              <Chip 
                label={worker.status === 'active' ? 'Active' : 'Inactive'} 
                color={worker.status === 'active' ? 'success' : 'default'}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box display="grid" gridTemplateColumns="30px 1fr" gap={1} alignItems="center">
            <EmailIcon fontSize="small" color="action" />
            <Typography>{worker.email || 'No email provided'}</Typography>
            
            <PhoneIcon fontSize="small" color="action" />
            <Typography>{worker.phone || 'No phone provided'}</Typography>
            
            <WorkIcon fontSize="small" color="action" />
            <Typography>{worker.position || 'No position specified'}</Typography>
            
            <LocationIcon fontSize="small" color="action" />
            <Typography>{worker.location || 'No location specified'}</Typography>
          </Box>
          
          {worker.skills?.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Skills & Certifications
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {worker.skills.map((skill, index) => (
                  <Chip 
                    key={index}
                    label={skill}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const WorkOrderFormNew = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  // State
  const [photos, setPhotos] = useState([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerDetailsOpen, setWorkerDetailsOpen] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [apartments, setApartments] = useState([]);
  
  // API Hooks
  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  const { data: workOrderData, isLoading: isLoadingWorkOrder } = useGetWorkOrderQuery(id, {
    skip: !isEdit || !id
  });
  
  const { data: buildingsData, isLoading: isLoadingBuildings } = useGetBuildingsQuery();
  const { data: workersData, isLoading: isLoadingWorkers } = useGetWorkersQuery();
  
  // Memoized data
  const buildings = useMemo(() => buildingsData?.data || [], [buildingsData]);
  const workers = useMemo(() => workersData?.data || [], [workersData]);
  
  // Formik initialization
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
      estimatedCompletionDate: null,
      assignedTo: [],
      services: [{
        type: '',
        description: '',
        laborCost: 0,
        materialCost: 0,
        estimatedHours: 1,
        status: 'pending',
        completed: false
      }],
      notes: []
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, setStatus }) => {
      try {
        setStatus({ isSubmitting: true });
        
        const workOrderData = {
          ...values,
          scheduledDate: values.scheduledDate.toISOString(),
          estimatedCompletionDate: values.estimatedCompletionDate?.toISOString(),
          photos: photos.map(photo => ({
            url: photo.preview || photo.url,
            name: photo.name || 'photo.jpg',
            size: photo.size || 0,
            uploadedBy: user._id,
            uploadedAt: new Date().toISOString()
          })),
          // Ensure arrays are properly formatted
          assignedTo: Array.isArray(values.assignedTo) ? values.assignedTo : [],
          services: Array.isArray(values.services) ? values.services : [],
          notes: Array.isArray(values.notes) ? values.notes : []
        };
        
        if (isEdit && id) {
          await updateWorkOrder({ id, ...workOrderData }).unwrap();
          toast.success('Work order updated successfully');
          navigate(`/work-orders/${id}/details`);
        } else {
          const result = await createWorkOrder(workOrderData).unwrap();
          toast.success('Work order created successfully');
          navigate(`/work-orders/${result.data._id}/details`);
        }
      } catch (error) {
        console.error('Error saving work order:', error);
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
        building: wo.building?._id || '',
        apartmentNumber: wo.apartmentNumber || '',
        block: wo.block || '',
        apartmentStatus: wo.apartmentStatus || 'occupied',
        priority: wo.priority || 'medium',
        status: wo.status || 'pending',
        scheduledDate: new Date(wo.scheduledDate || new Date()),
        estimatedCompletionDate: wo.estimatedCompletionDate 
          ? new Date(wo.estimatedCompletionDate) 
          : null,
        assignedTo: wo.assignedTo?.map(w => w._id) || [],
        services: wo.services?.length > 0 
          ? wo.services 
          : [{
              type: '',
              description: '',
              laborCost: 0,
              materialCost: 0,
              estimatedHours: 1,
              status: 'pending',
              completed: false
            }],
        notes: wo.notes || []
      });
      
      if (wo.photos?.length > 0) {
        setPhotos(wo.photos);
      }
    }
  }, [isEdit, workOrderData]);
  
  // Load blocks and apartments when building/block changes
  useEffect(() => {
    if (formik.values.building) {
      // In a real app, fetch blocks for the selected building
      const mockBlocks = ['A', 'B', 'C', 'D'];
      setBlocks(mockBlocks);
      
      if (formik.values.block) {
        // In a real app, fetch apartments for the selected block
        const mockApartments = {
          'A': ['101', '102', '103', '104'],
          'B': ['201', '202', '203', '204'],
          'C': ['301', '302', '303', '304'],
          'D': ['401', '402', '403', '404']
        };
        setApartments(mockApartments[formik.values.block] || []);
      } else {
        setApartments([]);
      }
    } else {
      setBlocks([]);
      setApartments([]);
    }
  }, [formik.values.building, formik.values.block]);
  
  // Handle photo upload
  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB max
      
      if (!isValidType) {
        toast.error('Only image files are allowed');
        return false;
      }
      
      if (!isValidSize) {
        toast.error('File size must be less than 5MB');
        return false;
      }
      
      return true;
    });
    
    const newPhotos = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    
    setPhotos(prev => [...prev, ...newPhotos]);
  };
  
  // Remove photo
  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };
  
  // Add a new service
  const addService = () => {
    formik.setFieldValue('services', [
      ...formik.values.services,
      {
        type: '',
        description: '',
        laborCost: 0,
        materialCost: 0,
        estimatedHours: 1,
        status: 'pending',
        completed: false
      }
    ]);
  };
  
  // Remove a service
  const removeService = (index) => {
    if (formik.values.services.length <= 1) return;
    
    const newServices = [...formik.values.services];
    newServices.splice(index, 1);
    formik.setFieldValue('services', newServices);
  };
  
  // Toggle worker assignment
  const toggleWorkerAssignment = (workerId) => {
    const currentAssignments = [...formik.values.assignedTo];
    const index = currentAssignments.indexOf(workerId);
    
    if (index === -1) {
      currentAssignments.push(workerId);
    } else {
      currentAssignments.splice(index, 1);
    }
    
    formik.setFieldValue('assignedTo', currentAssignments);
  };
  
  // View worker details
  const viewWorkerDetails = (worker) => {
    setSelectedWorker(worker);
    setWorkerDetailsOpen(true);
  };
  
  // Loading state
  const isLoading = isCreating || isUpdating || isLoadingWorkOrder || isLoadingBuildings || isLoadingWorkers;
  
  if (isLoading && !formik.isSubmitting) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
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
          <Typography variant="h4" component="h1">
            {isEdit ? 'Edit Work Order' : 'Create New Work Order'}
          </Typography>
        </Box>
        
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            {/* Main Content */}
            <Grid item xs={12} md={8}>
              {/* Basic Information */}
              <Card>
                <CardHeader title="Basic Information" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        name="title"
                        label="Title"
                        value={formik.values.title}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.title && Boolean(formik.errors.title)}
                        helperText={formik.touched.title && formik.errors.title}
                        disabled={formik.isSubmitting}
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
                        helperText={formik.touched.description && formik.errors.description}
                        disabled={formik.isSubmitting}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl 
                        fullWidth 
                        error={formik.touched.building && Boolean(formik.errors.building)}
                        disabled={isLoadingBuildings || formik.isSubmitting}
                      >
                        <InputLabel>Building</InputLabel>
                        <Select
                          name="building"
                          value={formik.values.building}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Building"
                        >
                          {isLoadingBuildings ? (
                            <MenuItem disabled>Loading buildings...</MenuItem>
                          ) : buildings.length === 0 ? (
                            <MenuItem disabled>No buildings available</MenuItem>
                          ) : (
                            buildings.map((building) => (
                              <MenuItem key={building._id} value={building._id}>
                                {building.name}
                              </MenuItem>
                            ))
                          )}
                        </Select>
                        {formik.touched.building && formik.errors.building && (
                          <FormHelperText>{formik.errors.building}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl 
                        fullWidth 
                        disabled={!formik.values.building || formik.isSubmitting}
                      >
                        <InputLabel>Block</InputLabel>
                        <Select
                          name="block"
                          value={formik.values.block}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Block"
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {blocks.map((block) => (
                            <MenuItem key={block} value={block}>
                              {block}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl 
                        fullWidth 
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
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {apartments.map((apt) => (
                            <MenuItem key={apt} value={apt}>
                              {apt}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth disabled={formik.isSubmitting}>
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
                      <FormControl fullWidth disabled={formik.isSubmitting}>
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
                      <FormControl fullWidth disabled={formik.isSubmitting}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          name="status"
                          value={formik.values.status}
                          onChange={formik.handleChange}
                          label="Status"
                        >
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="in_progress">In Progress</MenuItem>
                          <MenuItem value="on_hold">On Hold</MenuItem>
                          <MenuItem value="completed">Completed</MenuItem>
                          <MenuItem value="cancelled">Cancelled</MenuItem>
                          <MenuItem value="pending_review">Pending Review</MenuItem>
                          <MenuItem value="issue_reported">Issue Reported</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
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
                            disabled={formik.isSubmitting}
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
                        renderInput={(params) => (
                          <TextField 
                            {...params} 
                            fullWidth 
                            error={formik.touched.estimatedCompletionDate && Boolean(formik.errors.estimatedCompletionDate)}
                            helperText={formik.touched.estimatedCompletionDate && formik.errors.estimatedCompletionDate}
                            disabled={formik.isSubmitting || !formik.values.scheduledDate}
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControl 
                        fullWidth 
                        error={formik.touched.assignedTo && Boolean(formik.errors.assignedTo)}
                        disabled={isLoadingWorkers || formik.isSubmitting}
                      >
                        <InputLabel>Assigned Workers</InputLabel>
                        <Select
                          multiple
                          name="assignedTo"
                          value={formik.values.assignedTo}
                          onChange={(e) => {
                            formik.setFieldValue('assignedTo', e.target.value);
                          }}
                          onBlur={formik.handleBlur}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((workerId) => {
                                const worker = workers.find(w => w._id === workerId);
                                if (!worker) return null;
                                
                                return (
                                  <Chip
                                    key={worker._id}
                                    label={worker.name}
                                    avatar={
                                      <Avatar 
                                        sx={{ 
                                          bgcolor: stringToColor(worker.name || '') 
                                        }}
                                      >
                                        {worker.name?.charAt(0) || '?'}
                                      </Avatar>
                                    }
                                    onDelete={() => {
                                      formik.setFieldValue(
                                        'assignedTo',
                                        formik.values.assignedTo.filter(id => id !== workerId)
                                      );
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      viewWorkerDetails(worker);
                                    }}
                                    sx={{ cursor: 'pointer' }}
                                  />
                                );
                              })}
                            </Box>
                          )}
                        >
                          <Box px={2} py={1}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="Search workers..."
                              value={workerSearch}
                              onChange={(e) => setWorkerSearch(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                  </InputAdornment>
                                ),
                                endAdornment: workerSearch && (
                                  <InputAdornment position="end">
                                    <IconButton 
                                      size="small" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setWorkerSearch('');
                                      }}
                                    >
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  </InputAdornment>
                                )
                              }}
                            />
                          </Box>
                          
                          <Divider />
                          
                          {isLoadingWorkers ? (
                            <Box display="flex" justifyContent="center" p={2}>
                              <CircularProgress size={24} />
                            </Box>
                          ) : workers.length === 0 ? (
                            <MenuItem disabled>No workers available</MenuItem>
                          ) : (
                            <Box maxHeight={300} overflow="auto">
                              {workers
                                .filter(worker => {
                                  if (!workerSearch) return true;
                                  const search = workerSearch.toLowerCase();
                                  return (
                                    worker.name?.toLowerCase().includes(search) ||
                                    worker.email?.toLowerCase().includes(search) ||
                                    worker.phone?.includes(workerSearch) ||
                                    worker.position?.toLowerCase().includes(search) ||
                                    worker.skills?.some(skill => 
                                      skill.toLowerCase().includes(search)
                                    )
                                  );
                                })
                                .map((worker) => (
                                  <MenuItem 
                                    key={worker._id}
                                    value={worker._id}
                                    onClick={() => toggleWorkerAssignment(worker._id)}
                                    sx={{ 
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      pr: 1
                                    }}
                                  >
                                    <Box display="flex" alignItems="center">
                                      <Checkbox 
                                        checked={formik.values.assignedTo?.includes(worker._id) || false}
                                        tabIndex={-1}
                                        disableRipple
                                      />
                                      <Avatar 
                                        sx={{ 
                                          width: 32,
                                          height: 32,
                                          mr: 1,
                                          fontSize: '0.875rem',
                                          bgcolor: stringToColor(worker.name || '') 
                                        }}
                                      >
                                        {worker.name?.charAt(0) || '?'}
                                      </Avatar>
                                      <Box>
                                        <Typography variant="body2">
                                          {worker.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          {worker.position}
                                        </Typography>
                                      </Box>
                                    </Box>
                                    
                                    <Box display="flex" alignItems="center">
                                      {worker.status === 'inactive' && (
                                        <Tooltip title="Inactive worker">
                                          <ErrorOutlineIcon 
                                            color="disabled" 
                                            fontSize="small"
                                            sx={{ mr: 1 }}
                                          />
                                        </Tooltip>
                                      )}
                                      
                                      <Button 
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          viewWorkerDetails(worker);
                                        }}
                                      >
                                        View
                                      </Button>
                                    </Box>
                                  </MenuItem>
                                ))}
                            </Box>
                          )}
                        </Select>
                        {formik.touched.assignedTo && formik.errors.assignedTo && (
                          <FormHelperText>{formik.errors.assignedTo}</FormHelperText>
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
                      disabled={formik.isSubmitting || formik.values.services.length >= 10}
                      size="small"
                    >
                      Add Service
                    </Button>
                  }
                />
                <CardContent>
                  {formik.values.services.map((service, index) => (
                    <Box 
                      key={index}
                      sx={{ 
                        mb: 3, 
                        p: 2, 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        borderRadius: 1,
                        position: 'relative'
                      }}
                    >
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          mb: 2 
                        }}
                      >
                        <Typography variant="subtitle1">
                          Service {index + 1}
                        </Typography>
                        
                        {formik.values.services.length > 1 && (
                          <IconButton 
                            size="small" 
                            onClick={() => removeService(index)}
                            disabled={formik.isSubmitting}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Service Type"
                            name={`services[${index}].type`}
                            value={service.type}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={
                              formik.touched.services?.[index]?.type && 
                              Boolean(formik.errors.services?.[index]?.type)
                            }
                            helperText={
                              formik.touched.services?.[index]?.type && 
                              formik.errors.services?.[index]?.type
                            }
                            disabled={formik.isSubmitting}
                          />
                        </Grid>
                        
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Description"
                            name={`services[${index}].description`}
                            value={service.description}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={
                              formik.touched.services?.[index]?.description && 
                              Boolean(formik.errors.services?.[index]?.description)
                            }
                            helperText={
                              formik.touched.services?.[index]?.description && 
                              formik.errors.services?.[index]?.description
                            }
                            disabled={formik.isSubmitting}
                          />
                        </Grid>
                        
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Labor Cost ($)"
                            name={`services[${index}].laborCost`}
                            value={service.laborCost}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={
                              formik.touched.services?.[index]?.laborCost && 
                              Boolean(formik.errors.services?.[index]?.laborCost)
                            }
                            helperText={
                              formik.touched.services?.[index]?.laborCost && 
                              formik.errors.services?.[index]?.laborCost
                            }
                            disabled={formik.isSubmitting}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">$</InputAdornment>
                              ),
                              inputProps: { min: 0, step: 0.01 }
                            }}
                          />
                        </Grid>
                        
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Material Cost ($)"
                            name={`services[${index}].materialCost`}
                            value={service.materialCost}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={
                              formik.touched.services?.[index]?.materialCost && 
                              Boolean(formik.errors.services?.[index]?.materialCost)
                            }
                            helperText={
                              formik.touched.services?.[index]?.materialCost && 
                              formik.errors.services?.[index]?.materialCost
                            }
                            disabled={formik.isSubmitting}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">$</InputAdornment>
                              ),
                              inputProps: { min: 0, step: 0.01 }
                            }}
                          />
                        </Grid>
                        
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Estimated Hours"
                            name={`services[${index}].estimatedHours`}
                            value={service.estimatedHours}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={
                              formik.touched.services?.[index]?.estimatedHours && 
                              Boolean(formik.errors.services?.[index]?.estimatedHours)
                            }
                            helperText={
                              formik.touched.services?.[index]?.estimatedHours && 
                              formik.errors.services?.[index]?.estimatedHours
                            }
                            disabled={formik.isSubmitting}
                            InputProps={{
                              inputProps: { min: 0.1, step: 0.1 }
                            }}
                          />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth disabled={formik.isSubmitting}>
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
                              <MenuItem value="on_hold">On Hold</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                name={`services[${index}].completed`}
                                checked={service.completed}
                                onChange={formik.handleChange}
                                disabled={formik.isSubmitting}
                              />
                            }
                            label="Mark as completed"
                            sx={{ mt: 2 }}
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
                    id="photo-upload"
                    type="file"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={formik.isSubmitting}
                  />
                  <label htmlFor="photo-upload">
                    <Button
                      component="span"
                      variant="outlined"
                      startIcon={<CloudUploadIcon />}
                      disabled={formik.isSubmitting}
                    >
                      Upload Photos
                    </Button>
                  </label>
                  
                  {photos.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {photos.length} photo{photos.length !== 1 ? 's' : ''} attached
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {photos.map((photo, index) => (
                          <Box 
                            key={index} 
                            sx={{ 
                              position: 'relative',
                              width: 120,
                              height: 120,
                              borderRadius: 1,
                              overflow: 'hidden',
                              border: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <img
                              src={photo.preview || photo.url}
                              alt={`Work order ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => removePhoto(index)}
                              sx={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                color: 'white',
                                '&:hover': {
                                  backgroundColor: 'rgba(0, 0, 0, 0.7)'
                                }
                              }}
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
              
              {/* Notes Section */}
              <Card sx={{ mt: 3, mb: 3 }}>
                <CardHeader title="Notes" />
                <CardContent>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    name="notes"
                    label="Add a note"
                    value={formik.values.notes}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={formik.isSubmitting}
                  />
                  
                  {formik.values.notes && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2">Preview</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formik.values.notes.length}/1000 characters
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          p: 2, 
                          bgcolor: 'background.paper', 
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          minHeight: 80
                        }}
                      >
                        <Typography variant="body2" whiteSpace="pre-line">
                          {formik.values.notes}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              {/* Summary Card */}
              <Card>
                <CardHeader title="Summary" />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Total Estimated Cost
                    </Typography>
                    <Typography variant="h5" color="primary">
                      ${formik.values.services.reduce((sum, service) => {
                        const laborCost = parseFloat(service.laborCost) || 0;
                        const materialCost = parseFloat(service.materialCost) || 0;
                        return sum + laborCost + materialCost;
                      }, 0).toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Based on {formik.values.services.length} service{formik.values.services.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Estimated Labor Hours
                    </Typography>
                    <Typography variant="body1">
                      {formik.values.services.reduce((sum, service) => {
                        return sum + (parseFloat(service.estimatedHours) || 0);
                      }, 0).toFixed(1)} hours
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Assigned Workers
                    </Typography>
                    {formik.values.assignedTo?.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {formik.values.assignedTo.map(workerId => {
                          const worker = workers.find(w => w._id === workerId);
                          if (!worker) return null;
                          
                          return (
                            <Chip
                              key={worker._id}
                              label={worker.name}
                              size="small"
                              avatar={
                                <Avatar 
                                  sx={{ 
                                    bgcolor: stringToColor(worker.name || ''),
                                    width: 24,
                                    height: 24,
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  {worker.name?.charAt(0) || '?'}
                                </Avatar>
                              }
                              onClick={() => viewWorkerDetails(worker)}
                              sx={{ cursor: 'pointer' }}
                            />
                          );
                        })}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No workers assigned
                      </Typography>
                    )}
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Created By
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar 
                        sx={{ 
                          width: 32, 
                          height: 32,
                          bgcolor: stringToColor(user?.name || '') 
                        }}
                      >
                        {user?.name?.charAt(0) || 'U'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">
                          {user?.name || 'Current User'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date().toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              
              {/* Action Buttons */}
              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  type="submit"
                  disabled={formik.isSubmitting || !formik.isValid}
                  startIcon={formik.isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {formik.isSubmitting ? 'Saving...' : 'Save Work Order'}
                </Button>
                
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  fullWidth
                  onClick={() => navigate('/work-orders')}
                  disabled={formik.isSubmitting}
                  startIcon={<CancelIcon />}
                >
                  Cancel
                </Button>
                
                {isEdit && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="large"
                    fullWidth
                    disabled={formik.isSubmitting}
                    startIcon={<DeleteIcon />}
                    sx={{ mt: 2 }}
                    onClick={() => {
                      // Handle delete work order
                      if (window.confirm('Are you sure you want to delete this work order?')) {
                        // Implement delete functionality
                        console.log('Delete work order', id);
                      }
                    }}
                  >
                    Delete Work Order
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
        </form>
        
        {/* Worker Details Dialog */}
        <WorkerDetailsDialog 
          open={workerDetailsOpen}
          onClose={() => setWorkerDetailsOpen(false)}
          worker={selectedWorker}
        />
      </Container>
    </LocalizationProvider>
  );
};

export default WorkOrderFormNew;

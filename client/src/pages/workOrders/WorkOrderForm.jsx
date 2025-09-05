import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  Grid,
  TextField,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Breadcrumbs,
  Link,
  IconButton,
  InputAdornment,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
  Assignment as WorkOrderIcon,
  Description as DescriptionIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Home as BuildingIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  PriorityHigh as PriorityHighIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useCreateWorkOrderMutation, useUpdateWorkOrderMutation, useGetWorkOrderQuery } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/dateUtils';

// Form validation schema
const validationSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  description: Yup.string().required('Description is required'),
  building: Yup.string().required('Building is required'),
  workType: Yup.string().required('Work type is required'),
  workSubType: Yup.string().required('Work sub-type is required'),
  assignedTo: Yup.array().min(1, 'At least one worker must be assigned'),
  priority: Yup.string().required('Priority is required'),
  status: Yup.string().required('Status is required'),
  dueDate: Yup.date().required('Due date is required'),
  estimatedCost: Yup.number().min(0, 'Must be 0 or more'),
  estimatedHours: Yup.number().min(0, 'Must be 0 or more'),
  requiresInspection: Yup.boolean(),
  inspectionNotes: Yup.string().when('requiresInspection', {
    is: true,
    then: Yup.string().required('Inspection notes are required'),
    otherwise: Yup.string(),
  }),
});

const WorkOrderForm = ({ isEdit = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // State for error handling
  const [error, setError] = useState(null);
  
  // API hooks
  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  
  // Fetch work order data if in edit mode
  const { 
    data: workOrderData, 
    isLoading: isLoadingWorkOrder,
    error: fetchError 
  } = useGetWorkOrderQuery(id, {
    skip: !isEdit,
  });

  // Handle fetch errors
  useEffect(() => {
    if (fetchError) {
      console.error('Error fetching work order:', fetchError);
      setError(fetchError?.data?.message || 'Failed to load work order data');
    }
  }, [fetchError]);
  
  // Show error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.location.reload()}
        >
          Reload
        </Button>
      </Container>
    );
  }
  const { data: buildingsData } = useGetBuildingsQuery();
  const { data: workersData } = useGetWorkersQuery();
  
  const workOrder = workOrderData?.data || {};
  const buildings = buildingsData?.data || [];
  const workers = workersData?.data?.users?.filter(user => user.role === 'worker') || [];
  const isLoading = isCreating || isUpdating || (isEdit && isLoadingWorkOrder);

  // Formik form
  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      building: '',
      workType: '',
      workSubType: '',
      assignedTo: [],
      priority: 'medium',
      status: 'pending',
      dueDate: new Date(),
      estimatedCost: 0,
      estimatedHours: 1,
      requiresInspection: false,
      inspectionNotes: '',
      attachments: [],
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, setStatus }) => {
      if (isLoading) return;
      
      setSubmitting(true);
      setStatus(null);
      setError(null);
      
      try {
        const formData = new FormData();
        
        // Add all form values to FormData
        Object.entries(values).forEach(([key, value]) => {
          if (value === null || value === undefined) return;
          
          if (key === 'assignedTo' && Array.isArray(value)) {
            value.forEach((id, i) => formData.append(`assignedTo[${i}]`, id));
          } else if (key === 'dueDate') {
            formData.append(key, value.toISOString());
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value);
          }
        });
        
        // Handle photo uploads
        if (photos?.length) {
          photos.forEach(photo => {
            if (photo instanceof File) {
              formData.append('photos', photo);
            } else if (typeof photo === 'string') {
              formData.append('photoUrls', photo);
            }
          });
        }
        
        if (isEdit) {
          await updateWorkOrder({ 
            id, 
            formData 
          }).unwrap();
          
          toast.success('Work order updated successfully!');
          navigate(`/work-orders/${id}`);
        } else {
          const result = await createWorkOrder(formData).unwrap();
          toast.success('Work order created successfully!');
          navigate(`/work-orders/${result.data._id}`);
        }
        
        setStatus({ success: true });
      } catch (error) {
        console.error('Form submission error:', error);
        const errorMessage = error?.data?.message || error.message || 'Failed to save work order';
        setError(errorMessage);
        setStatus({ success: false, error: errorMessage });
        toast.error(errorMessage);
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Set form values when work order data is loaded (edit mode)
  useEffect(() => {
    if (isEdit && workOrder) {
      formik.setValues({
        title: workOrder.title || '',
        description: workOrder.description || '',
        building: workOrder.building?._id || '',
        workType: workOrder.workType || '',
        workSubType: workOrder.workSubType || '',
        assignedTo: workOrder.assignedTo?.map(user => user._id) || [],
        priority: workOrder.priority || 'medium',
        status: workOrder.status || 'pending',
        dueDate: workOrder.dueDate ? new Date(workOrder.dueDate) : new Date(),
        estimatedCost: workOrder.estimatedCost || 0,
        estimatedHours: workOrder.estimatedHours || 1,
        requiresInspection: workOrder.requiresInspection || false,
        inspectionNotes: workOrder.inspectionNotes || '',
        attachments: workOrder.attachments || [],
      });
    }
  }, [workOrder, isEdit]);

  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'warning' },
    { value: 'in_progress', label: 'In Progress', color: 'info' },
    { value: 'on_hold', label: 'On Hold', color: 'secondary' },
    { value: 'completed', label: 'Completed', color: 'success' },
    { value: 'cancelled', label: 'Cancelled', color: 'error' },
  ];

  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'success' },
    { value: 'medium', label: 'Medium', color: 'warning' },
    { value: 'high', label: 'High', color: 'error' },
  ];

  // Work type options
  const workTypes = [
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
    { value: 'other', label: 'Other' },
  ];

  // Work sub-types based on main type
  const getWorkSubTypes = (workType) => {
    const subTypes = {
      painting: ['1 Room', '2 Rooms', '3 Rooms', 'Doors', 'Ceilings', 'Cabinets', 'Hallways', 'Touch-ups'],
      cleaning: ['1 Bedroom', '2 Bedrooms', '3 Bedrooms', 'Touch-up Cleaning', 'Heavy Cleaning', 'Carpet Cleaning', 'Gutter Cleaning'],
      repairs: ['Air Conditioning', 'Door Repairs', 'Ceiling Repairs', 'Floor Repairs', 'General Maintenance'],
      maintenance: ['Preventive', 'Corrective', 'Emergency', 'Routine'],
      plumbing: ['Leak Repair', 'Pipe Installation', 'Drain Cleaning', 'Fixture Replacement'],
      electrical: ['Wiring', 'Outlet Installation', 'Light Fixture', 'Panel Upgrade'],
      hvac: ['Installation', 'Repair', 'Maintenance', 'Duct Cleaning'],
      flooring: ['Installation', 'Repair', 'Refinishing', 'Cleaning'],
      roofing: ['Repair', 'Replacement', 'Inspection', 'Maintenance'],
      carpentry: ['Installation', 'Repair', 'Custom Work', 'Finishing'],
      inspection: ['Pre-move', 'Post-work', 'Routine', 'Safety'],
      other: ['Custom Service']
    };
    return subTypes[workType] || [];
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    formik.setFieldValue('attachments', [...formik.values.attachments, ...files]);
  };

  // Handle file delete
  const handleFileDelete = (index) => {
    const newAttachments = formik.values.attachments.filter((_, i) => i !== index);
    formik.setFieldValue('attachments', newAttachments);
  };

  // Handle cancel
  const handleCancel = () => {
    if (formik.dirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/work-orders');
      }
    } else {
      navigate('/work-orders');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/work-orders" underline="hover">
            Work Orders
          </Link>
          <Typography color="text.primary">
            {isEdit ? 'Edit Work Order' : 'Create Work Order'}
          </Typography>
        </Breadcrumbs>
        
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/work-orders')} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <WorkOrderIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            {isEdit ? 'Edit Work Order' : 'Create Work Order'}
          </Typography>
        </Box>
      </Box>

      <Box component="form" onSubmit={formik.handleSubmit}>
        <Card>
          <CardHeader 
            title={isEdit ? 'Edit Work Order Details' : 'Work Order Details'}
            subheader="Fill in the details for the work order"
          />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        id="title"
                        name="title"
                        label="Work Order Title"
                        value={formik.values.title}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.title && Boolean(formik.errors.title)}
                        helperText={formik.touched.title && formik.errors.title}
                        disabled={isLoading}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        id="description"
                        name="description"
                        label="Description"
                        multiline
                        rows={4}
                        value={formik.values.description}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.description && Boolean(formik.errors.description)}
                        helperText={formik.touched.description && formik.errors.description}
                        disabled={isLoading}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth error={formik.touched.building && Boolean(formik.errors.building)}>
                        <InputLabel id="building-label">Building</InputLabel>
                        <Select
                          labelId="building-label"
                          id="building"
                          name="building"
                          value={formik.values.building}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Building"
                          disabled={isLoading}
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
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                          label="Due Date"
                          value={formik.values.dueDate}
                          onChange={(newValue) => formik.setFieldValue('dueDate', newValue)}
                          disabled={isLoading}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                              error={formik.touched.dueDate && Boolean(formik.errors.dueDate)}
                              helperText={formik.touched.dueDate && formik.errors.dueDate}
                            />
                          )}
                        />
                      </LocalizationProvider>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth error={formik.touched.workType && Boolean(formik.errors.workType)}>
                        <InputLabel id="work-type-label">Work Type</InputLabel>
                        <Select
                          labelId="work-type-label"
                          id="workType"
                          name="workType"
                          value={formik.values.workType}
                          onChange={(e) => {
                            formik.handleChange(e);
                            formik.setFieldValue('workSubType', '');
                          }}
                          onBlur={formik.handleBlur}
                          label="Work Type"
                          disabled={isLoading}
                        >
                          {workTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {formik.touched.workType && formik.errors.workType && (
                          <FormHelperText>{formik.errors.workType}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth error={formik.touched.workSubType && Boolean(formik.errors.workSubType)}>
                        <InputLabel id="work-sub-type-label">Work Sub-Type</InputLabel>
                        <Select
                          labelId="work-sub-type-label"
                          id="workSubType"
                          name="workSubType"
                          value={formik.values.workSubType}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Work Sub-Type"
                          disabled={isLoading || !formik.values.workType}
                        >
                          {getWorkSubTypes(formik.values.workType).map((subType) => (
                            <MenuItem key={subType} value={subType}>
                              {subType}
                            </MenuItem>
                          ))}
                        </Select>
                        {formik.touched.workSubType && formik.errors.workSubType && (
                          <FormHelperText>{formik.errors.workSubType}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth error={formik.touched.priority && Boolean(formik.errors.priority)}>
                        <InputLabel id="priority-label">Priority</InputLabel>
                        <Select
                          labelId="priority-label"
                          id="priority"
                          name="priority"
                          value={formik.values.priority}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Priority"
                          disabled={isLoading}
                        >
                          {priorityOptions.map((priority) => (
                            <MenuItem key={priority.value} value={priority.value}>
                              <Chip 
                                label={priority.label} 
                                color={priority.color} 
                                size="small" 
                                variant="outlined"
                              />
                            </MenuItem>
                          ))}
                        </Select>
                        {formik.touched.priority && formik.errors.priority && (
                          <FormHelperText>{formik.errors.priority}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth error={formik.touched.status && Boolean(formik.errors.status)}>
                        <InputLabel id="status-label">Status</InputLabel>
                        <Select
                          labelId="status-label"
                          id="status"
                          name="status"
                          value={formik.values.status}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Status"
                          disabled={isLoading}
                        >
                          {statusOptions.map((status) => (
                            <MenuItem key={status.value} value={status.value}>
                              <Chip 
                                label={status.label} 
                                color={status.color} 
                                size="small" 
                                variant="outlined"
                              />
                            </MenuItem>
                          ))}
                        </Select>
                        {formik.touched.status && formik.errors.status && (
                          <FormHelperText>{formik.errors.status}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        id="estimatedCost"
                        name="estimatedCost"
                        label="Estimated Cost"
                        type="number"
                        value={formik.values.estimatedCost}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.estimatedCost && Boolean(formik.errors.estimatedCost)}
                        helperText={formik.touched.estimatedCost && formik.errors.estimatedCost}
                        disabled={isLoading}
                        inputProps={{
                          min: 0,
                          step: 0.01,
                        }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        id="estimatedHours"
                        name="estimatedHours"
                        label="Estimated Hours"
                        type="number"
                        value={formik.values.estimatedHours}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.estimatedHours && Boolean(formik.errors.estimatedHours)}
                        helperText={formik.touched.estimatedHours && formik.errors.estimatedHours}
                        disabled={isLoading}
                        inputProps={{
                          min: 0,
                          step: 0.5,
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            id="requiresInspection"
                            name="requiresInspection"
                            checked={formik.values.requiresInspection}
                            onChange={formik.handleChange}
                            disabled={isLoading}
                          />
                        }
                        label="Requires Inspection"
                      />
                    </Grid>
                    
                    {formik.values.requiresInspection && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          id="inspectionNotes"
                          name="inspectionNotes"
                          label="Inspection Notes"
                          multiline
                          rows={3}
                          value={formik.values.inspectionNotes}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={formik.touched.inspectionNotes && Boolean(formik.errors.inspectionNotes)}
                          helperText={formik.touched.inspectionNotes && formik.errors.inspectionNotes}
                          disabled={isLoading}
                        />
                      </Grid>
                    )}
                  </Grid>
                </Paper>
                
                <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Assigned Workers
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <FormControl 
                    fullWidth 
                    error={formik.touched.assignedTo && Boolean(formik.errors.assignedTo)}
                  >
                    <InputLabel id="assigned-to-label">Assign Workers</InputLabel>
                    <Select
                      labelId="assigned-to-label"
                      id="assignedTo"
                      name="assignedTo"
                      multiple
                      value={formik.values.assignedTo}
                      onChange={(e) => formik.setFieldValue('assignedTo', e.target.value)}
                      onBlur={formik.handleBlur}
                      label="Assign Workers"
                      disabled={isLoading}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((userId) => {
                            const worker = workers.find(w => w._id === userId);
                            return worker ? (
                              <Chip 
                                key={userId} 
                                label={worker.name} 
                                size="small" 
                                avatar={<Avatar src={worker.avatar} />}
                              />
                            ) : null;
                          })}
                        </Box>
                      )}
                    >
                      {workers.map((worker) => (
                        <MenuItem key={worker._id} value={worker._id}>
                          <ListItemAvatar>
                            <Avatar src={worker.avatar}>
                              {worker.name?.charAt(0) || '?'}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={worker.name} 
                            secondary={worker.role ? worker.role.charAt(0).toUpperCase() + worker.role.slice(1) : 'Worker'}
                          />
                        </MenuItem>
                      ))}
                    </Select>
                    {formik.touched.assignedTo && formik.errors.assignedTo && (
                      <FormHelperText>{formik.errors.assignedTo}</FormHelperText>
                    )}
                  </FormControl>
                </Paper>
              </Grid>
              
              {/* Right Column - Attachments & Actions */}
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Attachments
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <input
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    style={{ display: 'none' }}
                    id="raised-button-file"
                    multiple
                    type="file"
                    onChange={handleFileUpload}
                  />
                  
                  <label htmlFor="raised-button-file">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<AttachFileIcon />}
                      disabled={isLoading}
                    >
                      Add Files
                    </Button>
                  </label>
                  
                  {formik.values.attachments.length > 0 && (
                    <List dense sx={{ mt: 2 }}>
                      {formik.values.attachments.map((file, index) => (
                        <ListItem 
                          key={index}
                          sx={{
                            border: '1px solid rgba(0, 0, 0, 0.12)',
                            borderRadius: 1,
                            mb: 1,
                            '&:last-child': {
                              mb: 0,
                            },
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar>
                              <AttachFileIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={file.name}
                            secondary={`${(file.size / 1024).toFixed(1)} KB`}
                            primaryTypographyProps={{
                              noWrap: true,
                              style: { width: '200px' },
                            }}
                          />
                          <ListItemSecondaryAction>
                            <IconButton 
                              edge="end" 
                              aria-label="delete"
                              onClick={() => handleFileDelete(index)}
                              disabled={isLoading}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>
                
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Actions
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      fullWidth
                      startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                      disabled={isLoading || !formik.isValid || !formik.dirty}
                    >
                      {isLoading ? 'Saving...' : 'Save Work Order'}
                    </Button>
                    
                    <Button
                      variant="outlined"
                      color="inherit"
                      fullWidth
                      onClick={handleCancel}
                      disabled={isLoading}
                      startIcon={<CancelIcon />}
                    >
                      Cancel
                    </Button>
                    
                    {isEdit && hasPermission('delete:work-orders') && (
                      <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                        disabled={isLoading}
                        startIcon={<DeleteIcon />}
                        onClick={() => {}}
                      >
                        Delete Work Order
                      </Button>
                    )}
                  </Box>
                  
                  {formik.errors.submit && (
                    <Box sx={{ mt: 2, color: 'error.main' }}>
                      <Typography variant="body2">
                        {formik.errors.submit}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default WorkOrderForm;

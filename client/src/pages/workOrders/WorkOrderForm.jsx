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
  assignedTo: Yup.array().min(1, 'At least one worker must be assigned'),
  priority: Yup.string().required('Priority is required'),
  status: Yup.string().required('Status is required'),
  dueDate: Yup.date().required('Due date is required'),
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
  
  // API hooks
  const [createWorkOrder, { isLoading: isCreating }] = useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  
  // Fetch work order data if in edit mode
  const { data: workOrderData, isLoading: isLoadingWorkOrder } = useGetWorkOrderQuery(id, {
    skip: !isEdit,
  });
  
  // Fetch buildings and workers
  const { data: buildingsData } = useGetBuildingsQuery();
  const { data: workersData } = useGetWorkersQuery();
  
  const workOrder = workOrderData?.data || {};
  const buildings = buildingsData?.data || [];
  const workers = workersData?.data || [];
  
  const isLoading = isCreating || isUpdating || (isEdit && isLoadingWorkOrder);
  
  // Formik form
  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      building: '',
      assignedTo: [],
      priority: 'medium',
      status: 'pending',
      dueDate: new Date(),
      estimatedHours: 1,
      requiresInspection: false,
      inspectionNotes: '',
      attachments: [],
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        const formattedValues = {
          ...values,
          // Format date for API
          dueDate: values.dueDate.toISOString(),
        };
        
        if (isEdit) {
          await updateWorkOrder({ id, ...formattedValues }).unwrap();
        } else {
          await createWorkOrder(formattedValues).unwrap();
        }
        
        navigate(isEdit ? `/work-orders/${id}` : '/work-orders');
      } catch (error) {
        console.error('Error saving work order:', error);
        // Handle API validation errors
        if (error.data?.errors) {
          error.data.errors.forEach((err) => {
            setFieldError(err.param, err.msg);
          });
        } else {
          setFieldError('submit', error.data?.message || 'Failed to save work order');
        }
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
        assignedTo: workOrder.assignedTo?.map(user => user._id) || [],
        priority: workOrder.priority || 'medium',
        status: workOrder.status || 'pending',
        dueDate: workOrder.dueDate ? new Date(workOrder.dueDate) : new Date(),
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
    { value: 'on_hold', label: 'On Hold', color: 'default' },
    { value: 'completed', label: 'Completed', color: 'success' },
  ];
  
  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'success' },
    { value: 'medium', label: 'Medium', color: 'warning' },
    { value: 'high', label: 'High', color: 'error' },
  ];
  
  // Handle file upload
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    
    // In a real app, you would upload the files to a server here
    // For now, we'll just add them to the form state
    const newAttachments = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      // In a real app, you would have a URL to the uploaded file
      url: URL.createObjectURL(file),
    }));
    
    formik.setFieldValue('attachments', [...formik.values.attachments, ...newAttachments]);
  };
  
  // Handle file delete
  const handleFileDelete = (index) => {
    const newAttachments = [...formik.values.attachments];
    newAttachments.splice(index, 1);
    formik.setFieldValue('attachments', newAttachments);
  };
  
  // Handle cancel
  const handleCancel = () => {
    if (isEdit) {
      navigate(`/work-orders/${id}`);
    } else {
      navigate('/work-orders');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleCancel}
          sx={{ mb: 1 }}
        >
          Back
        </Button>
        
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/work-orders" color="inherit">
            Work Orders
          </Link>
          <Typography color="text.primary">
            {isEdit ? `Edit ${workOrder.workOrderNumber || 'Work Order'}` : 'Create Work Order'}
          </Typography>
        </Breadcrumbs>
        
        <Card variant="outlined">
          <CardHeader
            title={
              <Box display="flex" alignItems="center">
                <WorkOrderIcon sx={{ mr: 1 }} />
                <Typography variant="h5" component="h1">
                  {isEdit ? `Edit Work Order #${workOrder.workOrderNumber || workOrder._id?.slice(-6)}` : 'Create New Work Order'}
                </Typography>
              </Box>
            }
            titleTypographyProps={{ variant: 'h5' }}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          />
          
          <CardContent>
            <form onSubmit={formik.handleSubmit}>
              <Grid container spacing={3}>
                {/* Left Column - Work Order Details */}
                <Grid item xs={12} md={8}>
                  <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Work Order Details
                    </Typography>
                    <Divider sx={{ mb: 3 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          id="title"
                          name="title"
                          label="Title"
                          value={formik.values.title}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={formik.touched.title && Boolean(formik.errors.title)}
                          helperText={formik.touched.title && formik.errors.title}
                          disabled={isLoading}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <WorkOrderIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
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
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <DescriptionIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControl 
                          fullWidth 
                          error={formik.touched.building && Boolean(formik.errors.building)}
                        >
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
                            startAdornment={
                              <InputAdornment position="start">
                                <BuildingIcon color="action" />
                              </InputAdornment>
                            }
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
                            onChange={(date) => formik.setFieldValue('dueDate', date)}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                fullWidth
                                error={formik.touched.dueDate && Boolean(formik.errors.dueDate)}
                                helperText={formik.touched.dueDate && formik.errors.dueDate}
                                disabled={isLoading}
                                InputProps={{
                                  ...params.InputProps,
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <EventIcon color="action" />
                                    </InputAdornment>
                                  ),
                                }}
                              />
                            )}
                          />
                        </LocalizationProvider>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
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
                                  sx={{ textTransform: 'capitalize' }}
                                />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
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
                            startAdornment={
                              <InputAdornment position="start">
                                <PriorityHighIcon color="action" />
                              </InputAdornment>
                            }
                          >
                            {priorityOptions.map((priority) => (
                              <MenuItem key={priority.value} value={priority.value}>
                                <Chip 
                                  label={priority.label} 
                                  color={priority.color}
                                  size="small"
                                  variant="outlined"
                                  sx={{ textTransform: 'capitalize' }}
                                />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
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
                              checked={formik.values.requiresInspection}
                              onChange={(e) => {
                                formik.setFieldValue('requiresInspection', e.target.checked);
                                if (!e.target.checked) {
                                  formik.setFieldValue('inspectionNotes', '');
                                }
                              }}
                              name="requiresInspection"
                              color="primary"
                            />
                          }
                          label="Requires Inspection"
                        />
                        
                        {formik.values.requiresInspection && (
                          <Box mt={2}>
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
                          </Box>
                        )}
                      </Grid>
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
            </form>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default WorkOrderForm;

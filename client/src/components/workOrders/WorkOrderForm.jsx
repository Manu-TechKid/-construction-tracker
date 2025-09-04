import React, { useState, useEffect, useMemo } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Autocomplete,
  Chip,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import PhotoUpload from '../common/PhotoUpload';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const WorkOrderForm = ({
  initialValues: initialValuesProp,
  onSubmit,
  isSubmitting,
  onCancel,
  mode = 'create',
}) => {
  const { t } = useTranslation();
  const { data: buildingsData, isLoading: buildingsLoading, error: buildingsError } = useGetBuildingsQuery();
  const { data: workersData, isLoading: workersLoading, error: workersError } = useGetWorkersQuery();
  
  // Extract buildings and workers from API response
  const buildings = useMemo(() => {
    return buildingsData?.data?.buildings || buildingsData?.data || [];
  }, [buildingsData]);

  const workers = useMemo(() => {
    const allWorkers = workersData?.data?.workers || workersData?.data || [];
    // Filter to show only workers (exclude admin, manager, supervisor)
    return allWorkers.filter(worker => worker.role === 'worker');
  }, [workersData]);

  const [photos, setPhotos] = useState([]);
  const [assignedWorkers, setAssignedWorkers] = useState([]);
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [workerNotes, setWorkerNotes] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);

  // Effect to handle form errors
  useEffect(() => {
    if (formik.status?.error) {
      setFormError(formik.status.error);
    }
  }, [formik.status]);

  // Helper function to get field error
  const getFieldError = (fieldName) => {
    return formik.touched[fieldName] && formik.errors[fieldName];
  };

  // Work type options matching database model
  const workTypeOptions = [
    { value: 'painting', label: 'Painting' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'repairs', label: 'Repairs' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'hvac', label: 'HVAC' },
    { value: 'flooring', label: 'Flooring' },
    { value: 'roofing', label: 'Roofing' },
    { value: 'carpentry', label: 'Carpentry' },
    { value: 'other', label: 'Other' },
  ];

  // Work sub-type options based on work type
  const workSubTypeOptions = {
    cleaning: [
      '1 Bedroom Cleaning',
      '2 Bedroom Cleaning',
      '3 Bedroom Cleaning',
      'Studio Cleaning',
      'Deep Cleaning',
      'Move-in Cleaning',
      'Move-out Cleaning',
    ],
    painting: [
      'Interior Painting',
      'Exterior Painting',
      'Touch-up Painting',
      'Full Apartment Paint',
      'Ceiling Painting',
      'Trim Painting',
    ],
    repairs: [
      'Plumbing Repair',
      'Electrical Repair',
      'Drywall Repair',
      'Door Repair',
      'Window Repair',
      'Appliance Repair',
    ],
    maintenance: [
      'HVAC Maintenance',
      'Appliance Maintenance',
      'General Maintenance',
      'Preventive Maintenance',
    ],
    inspection: [
      'Move-in Inspection',
      'Move-out Inspection',
      'Routine Inspection',
      'Safety Inspection',
    ],
    other: ['Custom Work', 'Emergency Repair', 'Consultation'],
  };

  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'success' },
    { value: 'medium', label: 'Medium', color: 'warning' },
    { value: 'high', label: 'High', color: 'error' },
    { value: 'urgent', label: 'Urgent', color: 'error' },
  ];

  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  // Apartment status options
  const apartmentStatusOptions = [
    { value: 'vacant', label: 'Vacant' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'under_renovation', label: 'Under Renovation' },
    { value: 'reserved', label: 'Reserved' },
  ];

  // Base validation schema for create mode
  const createValidationSchema = Yup.object().shape({
    title: Yup.string()
      .required('Title is required')
      .min(5, 'Title must be at least 5 characters')
      .max(100, 'Title must be less than 100 characters'),
      
    building: Yup.mixed().required('Building is required'),
    
    apartmentNumber: Yup.string()
      .required('Apartment number is required')
      .max(20, 'Apartment number is too long'),
      
    block: Yup.string()
      .required('Block is required')
      .max(20, 'Block must be less than 20 characters'),
      
    apartmentStatus: Yup.string()
      .required('Apartment status is required')
      .oneOf(['vacant', 'occupied', 'under_renovation', 'reserved'], 'Invalid apartment status'),
      
    workType: Yup.string()
      .required('Work type is required')
      .oneOf(
        workTypeOptions.map(opt => opt.value),
        'Invalid work type selected'
      ),
      
    workSubType: Yup.string()
      .required('Work sub-type is required'),
      
    priority: Yup.string()
      .required('Priority is required')
      .oneOf(
        ['low', 'medium', 'high'],
        'Invalid priority level'
      ),
      
    status: Yup.string()
      .required('Status is required')
      .oneOf(
        ['pending', 'in_progress', 'completed', 'cancelled'],
        'Invalid status'
      ),
      
    description: Yup.string()
      .required('Description is required')
      .min(10, 'Description should be at least 10 characters')
      .max(2000, 'Description is too long'),
      
    scheduledDate: Yup.date()
      .typeError('Invalid date')
      .required('Scheduled date is required')
      .min(new Date(), 'Scheduled date cannot be in the past'),
      
    estimatedCompletionDate: Yup.date()
      .nullable()
      .min(
        Yup.ref('scheduledDate'),
        'Completion date must be after scheduled date'
      )
      .typeError('Invalid date format'),
      
    estimatedCost: Yup.number()
      .typeError('Must be a valid number')
      .min(0, 'Cost cannot be negative')
      .nullable(),
      
    actualCost: Yup.number()
      .min(0, 'Actual cost must be positive')
      .nullable()
      .typeError('Must be a valid number'),
      
    assignedTo: Yup.array()
      .of(Yup.string())
      .test(
        'at-least-one-worker',
        'At least one worker must be assigned',
        (value) => value && value.length > 0
      ),
      
    notes: Yup.string()
      .max(5000, 'Notes must be less than 5000 characters'),
      
    services: Yup.array().of(
      Yup.object().shape({
        type: Yup.string().required('Service type is required'),
        description: Yup.string().required('Service description is required'),
        status: Yup.string().required('Service status is required'),
        cost: Yup.number().min(0, 'Cost cannot be negative').required('Service cost is required'),
        estimatedHours: Yup.number().min(0, 'Hours must be positive').required('Estimated hours are required')
      })
    ),
    
    assignedWorkers: Yup.array().of(
      Yup.object().shape({
        worker: Yup.string().required('Worker is required'),
        status: Yup.string(),
        assignedAt: Yup.date(),
        assignedBy: Yup.string()
      })
    ),
    
    photos: Yup.array().of(
      Yup.object().shape({
        url: Yup.string().required('Photo URL is required'),
        description: Yup.string(),
        type: Yup.string(),
        uploadedAt: Yup.date()
      })
    )
  });

  // For edit mode, make all fields optional
  const validationSchema = mode === 'edit' 
    ? createValidationSchema.optional() 
    : createValidationSchema;

  const initialValues = {
    title: '',
    building: '',
    apartmentNumber: '',
    block: '',
    apartmentStatus: 'vacant',
    workType: 'repair', // Default work type
    workSubType: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    estimatedCost: 0,
    actualCost: 0,
    scheduledDate: new Date(), // Default to current date
    estimatedCompletionDate: null,
    assignedTo: [],
    photos: [],
    notes: '',
    services: [{
      type: 'other',
      description: '',
      laborCost: 0,
      materialCost: 0,
      status: 'pending'
    }],
    ...initialValuesProp,
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues,
    validationSchema,
    validateOnMount: true,
    validateOnChange: true,
    validateOnBlur: true,
    validate: (values) => {
      const errors = {};
      
      // Additional custom validation if needed
      if (values.scheduledDate && values.estimatedCompletionDate) {
        const start = new Date(values.scheduledDate);
        const end = new Date(values.estimatedCompletionDate);
        if (end < start) {
          errors.estimatedCompletionDate = 'Completion date must be after scheduled date';
        }
      }
      
      return errors;
    },
    onSubmit: async (values, { setSubmitting, setFieldError, setStatus, resetForm }) => {
      // Prevent default form submission
      if (typeof window !== 'undefined' && window.event) {
        window.event.preventDefault();
      }
      
      try {
        setStatus({ isSubmitting: true, error: null });
        
        // Validate required fields
        const requiredFields = [
          'title', 'building', 'apartmentNumber', 'block', 
          'apartmentStatus', 'workType', 'priority', 'status', 'description'
        ];
        
        const missingFields = requiredFields.filter(field => !values[field]);
        if (missingFields.length > 0) {
          missingFields.forEach(field => {
            setFieldError(field, 'This field is required');
          });
          throw new Error('Please fill in all required fields');
        }
        
        // Convert building object to ID if needed
        if (values.building && typeof values.building === 'object') {
          values.building = values.building._id || values.building;
        }
        
        // Ensure assignedTo is an array and has at least one worker
        if (!Array.isArray(values.assignedTo) || values.assignedTo.length === 0) {
          setFieldError('assignedTo', 'At least one worker must be assigned');
          throw new Error('At least one worker must be assigned');
        }
        
        // Format dates to ISO strings
        const formatDate = (date) => {
          if (!date) return null;
          try {
            const dateObj = new Date(date);
            return isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
          } catch (error) {
            console.error('Error formatting date:', { date, error });
            return null;
          }
        };
        
        // Format assigned workers
        const formatWorker = (worker) => {
          if (!worker) return null;
          if (typeof worker === 'string') return { 
            worker, 
            status: 'pending',
            assignedAt: new Date().toISOString(),
            assignedBy: 'system',
            notes: ''
          };
          return {
            worker: worker._id || worker.worker?._id || worker.worker,
            status: worker.status || 'pending',
            assignedAt: worker.assignedAt || new Date().toISOString(),
            assignedBy: worker.assignedBy || 'system',
            notes: worker.notes || ''
          };
        };

        // Process photos - convert to proper format for backend
        const processedPhotos = Array.isArray(photos) 
          ? photos
              .filter(photo => photo && (photo.url || (typeof photo === 'string' && photo.trim() !== '')))
              .map(photo => ({
                url: typeof photo === 'string' ? photo : (photo.url || ''),
                description: photo.description || photo.caption || '',
                type: photo.type || 'other',
                uploadedAt: photo.uploadedAt || new Date().toISOString()
              }))
          : [];

        // Prepare submission data
        const submissionData = {
          ...values,
          building: values.building?._id || values.building,
          assignedTo: values.assignedTo.map(formatWorker).filter(Boolean),
          photos: processedPhotos,
          scheduledDate: formatDate(values.scheduledDate) || new Date().toISOString(),
          estimatedCompletionDate: formatDate(values.estimatedCompletionDate),
          updatedAt: new Date().toISOString()
        };
        
        // Clean up the submission data by removing any undefined or null values
        Object.keys(submissionData).forEach(key => {
          if (submissionData[key] === undefined || submissionData[key] === null) {
            delete submissionData[key];
          }
        });
        
        // For edit mode, include the _id if it exists
        if (mode === 'edit' && values._id) {
          submissionData._id = values._id;
        }
        
        // Call the onSubmit prop with the formatted data
        try {
          const result = await onSubmit(submissionData, { setStatus, setFieldError });
          
          if (result?.success) {
            // Show success message
            toast.success(
              mode === 'edit' 
                ? 'Work order updated successfully!'
                : 'Work order created successfully!',
              { 
                position: 'top-center',
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true
              }
            );
            
            // If we have a successful result, reset the form if this is a create operation
            if (mode === 'create') {
              resetForm();
              // Reset photos after successful submission
              setPhotos([]);
            }
            
            return result;
          }
          
          // Handle API errors that don't throw exceptions
          if (result?.error) {
            throw new Error(result.error);
          }
          
          return result || { success: false };
          
        } catch (error) {
          console.error('Error in form submission:', error);
          
          // Handle API validation errors
          let hasFieldErrors = false;
          
          // Handle field-specific validation errors from fieldErrors
          if (error?.data?.fieldErrors) {
            Object.entries(error.data.fieldErrors).forEach(([apiField, messages]) => {
              const fieldParts = apiField.split('.');
              const formField = fieldParts[0];
              
              // Handle array fields like assignedTo[0].worker
              const arrayMatch = formField.match(/(\w+)\[(\d+)\]/);
              if (arrayMatch) {
                const arrayField = arrayMatch[1];
                const index = parseInt(arrayMatch[2], 10);
                const subField = fieldParts[1];
                
                if (Array.isArray(formik.values[arrayField]) && formik.values[arrayField][index]) {
                  const errorMessage = Array.isArray(messages) ? messages[0] : messages;
                  setFieldError(`${arrayField}[${index}].${subField}`, errorMessage);
                  hasFieldErrors = true;
                }
              } else if (formik.values[formField] !== undefined) {
                // Handle regular fields
                const errorMessage = Array.isArray(messages) ? messages[0] : messages;
                setFieldError(formField, errorMessage);
                hasFieldErrors = true;
              }
            });
          }
          
          // Handle legacy errors format
          if (error?.data?.errors && !hasFieldErrors) {
            Object.entries(error.data.errors).forEach(([apiField, messages]) => {
              const errorMessage = Array.isArray(messages) ? messages[0] : messages;
              if (formik.values[apiField] !== undefined) {
                setFieldError(apiField, errorMessage);
                hasFieldErrors = true;
              }
            });
          }
          
          // Set status and show error message
          const errorMessage = error?.data?.message || 
                             error?.errors?.[0]?.msg || 
                             error?.message || 
                             'An error occurred while submitting the form';
          
          // Update form status with error
          setStatus(prev => ({
            ...prev,
            isSubmitting: false,
            error: hasFieldErrors ? 'Please fix the validation errors below' : errorMessage,
            serverError: !hasFieldErrors ? errorMessage : null
          }));
          
          // Show error toast if no field-specific errors
          if (!hasFieldErrors) {
            toast.error(errorMessage, { 
              autoClose: 5000,
              position: 'top-center',
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true
            });
          }
          
          // Scroll to the first error or top of form
          setTimeout(() => {
            const firstError = document.querySelector('.Mui-error, [data-error="true"]');
            if (firstError) {
              firstError.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
              });
            }
          }, 100);
          
          // Re-throw the error to be caught by the outer catch block
          throw error;
        }
        
      } catch (error) {
        console.error('Error in form submission:', error);
        
        // Set submitting to false to re-enable the form
        setStatus(prev => ({
          ...prev,
          isSubmitting: false
        }));
        
        // If this is a validation error from the inner try-catch, don't show duplicate messages
        if (error?.handled) {
          return { success: false, error };
        }
        
        // Handle network errors
        if (error.message === 'Network Error' || error.message.includes('Network request failed')) {
          const networkError = 'Network error: Unable to connect to the server. Please check your connection and try again.';
          
          // Update form status
          setStatus(prev => ({
            ...prev,
            error: networkError,
            isSubmitting: false,
            serverError: networkError
          }));
          
          // Show toast
          toast.error(networkError, {
            position: 'top-center',
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
          });
          
          return { 
            success: false, 
            error: {
              ...error,
              message: networkError,
              handled: true
            } 
          };
        }
        
        // For other errors, show a generic error message
        let errorMessage = 'An unexpected error occurred. Please try again.';
        let errorDetails = null;
        let fieldErrors = {};
        
        // Handle different types of errors
        if (error?.response?.data) {
          const { message, errors, fieldErrors: apiFieldErrors } = error.response.data;
          
          // Handle API error messages
          if (message) {
            errorMessage = message;
          }
          
          // Handle validation errors
          if (errors) {
            errorDetails = Array.isArray(errors) ? errors.join(' ') : String(errors);
          }
          
          // Handle field-specific errors
          if (apiFieldErrors) {
            fieldErrors = apiFieldErrors;
            // Set field errors in formik
            Object.entries(fieldErrors).forEach(([field, messages]) => {
              if (Array.isArray(messages) && messages.length > 0) {
                formik.setFieldError(field, messages[0]);
              } else if (typeof messages === 'string') {
                formik.setFieldError(field, messages);
              }
            });
          }
        } else if (error?.message) {
          // Handle JavaScript/network errors
          errorMessage = error.message;
        }
        
        // Update form status with the error and details
        setStatus(prev => ({
          ...prev,
          error: errorMessage,
          details: errorDetails,
          fieldErrors,
          isSubmitting: false,
          serverError: errorMessage,
          hasErrors: true
        }));
        
        // Mark form as touched to show validation errors
        if (Object.keys(fieldErrors).length > 0) {
          const touched = {};
          Object.keys(fieldErrors).forEach(field => {
            touched[field] = true;
          });
          formik.setTouched(touched, false);
        }
        
        // Show error toast
        toast.error(errorMessage, {
          position: 'top-center',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true
        });
        
        // Scroll to the first error or top of the form
        setTimeout(() => {
          const firstError = document.querySelector('.Mui-error, [data-error="true"]');
          if (firstError) {
            firstError.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          } else {
            // If no specific error field, scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 100);
        
        return { 
          success: false, 
          error: {
            ...error,
            message: errorMessage,
            handled: true
          } 
        };
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Update available blocks when building changes
  useEffect(() => {
    if (formik.values.building) {
      const selectedBuilding = buildings.find(b => b._id === formik.values.building);
      if (selectedBuilding?.apartments) {
        const blocks = [...new Set(selectedBuilding.apartments.map(apt => apt.block))];
        setAvailableBlocks(blocks);
      }
    }
  }, [formik.values.building, buildings]);

  // Get available sub-types based on work type
  const availableSubTypes = workSubTypeOptions[formik.values.workType] || [];

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleWorkerAssignment = (event, newValue) => {
    setAssignedWorkers(newValue);
    // Initialize notes for new workers
    const newWorkerNotes = { ...workerNotes };
    newValue.forEach(worker => {
      if (!workerNotes[worker._id || worker]) {
        newWorkerNotes[worker._id || worker] = '';
      }
    });
    setWorkerNotes(newWorkerNotes);
    formik.setFieldValue('assignedTo', newValue);
  };

  const handleWorkerNotesChange = (workerId, notes) => {
    setWorkerNotes(prev => ({
      ...prev,
      [workerId]: notes
    }));
  };

  if (buildingsLoading || workersLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (buildingsError || workersError) {
    return (
      <Alert severity="error">
        Error loading form data: {buildingsError?.message || workersError?.message}
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {mode === 'edit' ? 'Edit Work Order' : 'Create New Work Order'}
          </Typography>

          {/* Show form-level errors */}
          {(formik.status?.error || formik.status?.serverError) && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2,
                '& .MuiAlert-message': {
                  width: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }
              }}
            >
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  {formik.status.error || formik.status.serverError}
                </Typography>
                {formik.status.details && (
                  <Typography variant="body2" component="div">
                    {formik.status.details}
                  </Typography>
                )}
              </Box>
            </Alert>
          )}
          
          {/* Show field-level validation errors */}
          {Object.keys(formik.errors).length > 0 && formik.submitCount > 0 && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2,
                '& .MuiAlert-message': {
                  width: '100%'
                }
              }}
            >
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Please fix the following errors:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {Object.entries(formik.errors).map(([field, error]) => (
                    formik.touched[field] && error && (
                      <li key={field}>
                        <Typography variant="body2">
                          <strong>{field}:</strong> {error}
                        </Typography>
                      </li>
                    )
                  ))}
                </Box>
              </Box>
            </Alert>
          )}

          <Box component="form" onSubmit={formik.handleSubmit} noValidate>
            <Grid container spacing={3}>
              {/* Title */}
              {mode === 'create' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="title"
                    name="title"
                    label="Title *"
                    value={formik.values.title}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.title && Boolean(formik.errors.title)}
                    helperText={formik.touched.title && formik.errors.title}
                    margin="normal"
                    variant="outlined"
                    inputProps={{
                      'data-testid': 'title-input',
                      'aria-invalid': formik.touched.title && Boolean(formik.errors.title),
                      'aria-describedby': formik.touched.title && formik.errors.title ? 'title-error' : undefined
                    }}
                    FormHelperTextProps={{
                      error: formik.touched.title && Boolean(formik.errors.title),
                      id: 'title-error'
                    }}
                  />
                </Grid>
              )}

              {/* Work Type */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth
                  error={formik.touched.workType && Boolean(formik.errors.workType)}
                  margin="normal"
                  variant="outlined"
                  required
                >
                  <InputLabel id="work-type-label">Work Type *</InputLabel>
                  <Select
                    id="workType"
                    name="workType"
                    value={formik.values.workType || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    labelId="work-type-label"
                    label="Work Type *"
                    inputProps={{
                      'aria-invalid': formik.touched.workType && Boolean(formik.errors.workType),
                      'aria-describedby': formik.touched.workType && formik.errors.workType ? 'work-type-error' : undefined
                    }}
                  >
                    <MenuItem value="" disabled>
                      <em>Select work type</em>
                    </MenuItem>
                    {workTypeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText 
                    id="work-type-error"
                    error={formik.touched.workType && Boolean(formik.errors.workType)}
                  >
                    {formik.touched.workType && formik.errors.workType}
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Status */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.status && Boolean(formik.errors.status)}
                  margin="normal"
                  variant="outlined"
                >
                  <InputLabel>Work Status *</InputLabel>
                  <Select
                    name="status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Work Status *"
                  >
                    {statusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText error>
                    {formik.touched.status && formik.errors.status}
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Scheduled Date */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.scheduledDate && Boolean(formik.errors.scheduledDate)}
                >
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Scheduled Date"
                      value={formik.values.scheduledDate}
                      onChange={(newValue) => {
                        formik.setFieldValue('scheduledDate', newValue);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} />
                      )}
                    />
                  </LocalizationProvider>
                  {formik.touched.scheduledDate && formik.errors.scheduledDate && (
                    <FormHelperText>{formik.errors.scheduledDate}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Estimated Completion Date */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={formik.touched.estimatedCompletionDate && Boolean(formik.errors.estimatedCompletionDate)}
                >
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Estimated Completion Date"
                      value={formik.values.estimatedCompletionDate}
                      onChange={(newValue) => {
                        formik.setFieldValue('estimatedCompletionDate', newValue);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} />
                      )}
                    />
                  </LocalizationProvider>
                  {formik.touched.estimatedCompletionDate && formik.errors.estimatedCompletionDate && (
                    <FormHelperText>{formik.errors.estimatedCompletionDate}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Assigned Workers */}
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={workers}
                  getOptionLabel={(option) => option.name || ''}
                  value={formik.values.assignedTo}
                  onChange={handleWorkerAssignment}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.name}
                        {...getTagProps({ index })}
                        key={option._id}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Assign Workers"
                      placeholder="Select workers"
                      error={formik.touched.assignedTo && Boolean(formik.errors.assignedTo)}
                      helperText={formik.touched.assignedTo && formik.errors.assignedTo}
                    />
                  )}
                />
                
                {/* Worker Notes */}
                {formik.values.assignedTo && formik.values.assignedTo.length > 0 && (
                  <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Notes for Assigned Workers
                    </Typography>
                    {formik.values.assignedTo.map((worker) => (
                      <TextField
                        key={worker._id || worker}
                        fullWidth
                        margin="normal"
                        size="small"
                        label={`Notes for ${worker.name || worker}`}
                        value={workerNotes[worker._id || worker] || ''}
                        onChange={(e) => handleWorkerNotesChange(worker._id || worker, e.target.value)}
                        multiline
                        rows={2}
                        variant="outlined"
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Box>
                )}
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  name="description"
                  label="Description *"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                />
              </Grid>

              {/* Estimated Cost */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  name="estimatedCost"
                  label="Estimated Cost"
                  value={formik.values.estimatedCost}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.estimatedCost && Boolean(formik.errors.estimatedCost)}
                  helperText={formik.touched.estimatedCost && formik.errors.estimatedCost}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Actual Cost */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  name="actualCost"
                  label="Actual Cost"
                  value={formik.values.actualCost}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.actualCost && Boolean(formik.errors.actualCost)}
                  helperText={formik.touched.actualCost && formik.errors.actualCost}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Photos */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Photos
                </Typography>
                <PhotoUpload
                  photos={photos}
                  onPhotosChange={setPhotos}
                  maxPhotos={10}
                />
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                  <div>
                    {mode === 'edit' && (
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        startIcon={<ArrowBackIcon />}
                      >
                        Back to List
                      </Button>
                    )}
                  </div>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={onCancel}
                      disabled={isSubmitting}
                    >
                      {mode === 'edit' ? 'Discard Changes' : 'Cancel'}
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={isSubmitting}
                      startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                    >
                      {isSubmitting 
                        ? 'Saving...' 
                        : mode === 'edit' 
                          ? 'Update Work Order' 
                          : 'Create Work Order'}
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
};

export default WorkOrderForm;

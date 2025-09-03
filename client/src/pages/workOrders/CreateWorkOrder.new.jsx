import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Container,
  Box,
  Button,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  FormHelperText,
  Paper
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

// Validation schema
const validationSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  description: Yup.string().required('Description is required'),
  priority: Yup.string().required('Priority is required'),
  status: Yup.string().required('Status is required'),
  scheduledDate: Yup.date().required('Scheduled date is required'),
  services: Yup.array()
    .min(1, 'At least one service is required')
    .of(
      Yup.object({
        type: Yup.string().required('Service type is required'),
        description: Yup.string().required('Description is required'),
        laborCost: Yup.number().min(0).required('Labor cost is required'),
        materialCost: Yup.number().min(0).required('Material cost is required'),
      })
    )
});

const serviceTypeOptions = [
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'painting', label: 'Painting' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'other', label: 'Other' },
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'success' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'high', label: 'High', color: 'error' },
];

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const CreateWorkOrder = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    initialValues: {
      title: `Work Order - ${format(new Date(), 'MM/dd/yyyy')}`,
      description: '',
      priority: 'medium',
      status: 'pending',
      scheduledDate: new Date(),
      services: [{
        type: '',
        description: '',
        laborCost: 0,
        materialCost: 0,
      }]
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);
        // TODO: Replace with actual API call
        console.log('Submitting work order:', values);
        toast.success('Work order created successfully');
        navigate('/work-orders');
      } catch (error) {
        console.error('Error creating work order:', error);
        toast.error(error.message || 'Failed to create work order');
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const addService = () => {
    formik.setFieldValue('services', [
      ...formik.values.services,
      {
        type: '',
        description: '',
        laborCost: 0,
        materialCost: 0,
      }
    ]);
  };

  const removeService = (index) => {
    const services = [...formik.values.services];
    services.splice(index, 1);
    formik.setFieldValue('services', services);
  };

  const updateService = (index, field, value) => {
    const services = [...formik.values.services];
    services[index] = {
      ...services[index],
      [field]: field === 'laborCost' || field === 'materialCost' ? Number(value) : value
    };
    formik.setFieldValue('services', services);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" gutterBottom>
            Create Work Order
          </Typography>
          
          <form onSubmit={formik.handleSubmit}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      id="title"
                      name="title"
                      label="Title"
                      value={formik.values.title}
                      onChange={formik.handleChange}
                      error={formik.touched.title && Boolean(formik.errors.title)}
                      helperText={formik.touched.title && formik.errors.title}
                      margin="normal"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel id="priority-label">Priority</InputLabel>
                      <Select
                        labelId="priority-label"
                        id="priority"
                        name="priority"
                        value={formik.values.priority}
                        onChange={formik.handleChange}
                        error={formik.touched.priority && Boolean(formik.errors.priority)}
                      >
                        {priorityOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            <Chip 
                              label={option.label} 
                              size="small" 
                              color={option.color}
                              sx={{ minWidth: 80 }}
                            />
                          </MenuItem>
                        ))}
                      </Select>
                      {formik.touched.priority && formik.errors.priority && (
                        <FormHelperText error>{formik.errors.priority}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel id="status-label">Status</InputLabel>
                      <Select
                        labelId="status-label"
                        id="status"
                        name="status"
                        value={formik.values.status}
                        onChange={formik.handleChange}
                        error={formik.touched.status && Boolean(formik.errors.status)}
                      >
                        {statusOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {formik.touched.status && formik.errors.status && (
                        <FormHelperText error>{formik.errors.status}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Scheduled Date"
                      value={formik.values.scheduledDate}
                      onChange={(date) => formik.setFieldValue('scheduledDate', date)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          margin="normal"
                          error={formik.touched.scheduledDate && Boolean(formik.errors.scheduledDate)}
                          helperText={formik.touched.scheduledDate && formik.errors.scheduledDate}
                        />
                      )}
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
                      error={formik.touched.description && Boolean(formik.errors.description)}
                      helperText={formik.touched.description && formik.errors.description}
                      margin="normal"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Services</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addService}
                  >
                    Add Service
                  </Button>
                </Box>

                {formik.values.services.map((service, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2} alignItems="flex-end">
                      <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth margin="normal">
                          <InputLabel>Service Type</InputLabel>
                          <Select
                            value={service.type || ''}
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
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="Description"
                          value={service.description || ''}
                          onChange={(e) => updateService(index, 'description', e.target.value)}
                          margin="normal"
                        />
                      </Grid>
                      
                      <Grid item xs={6} sm={3} md={2}>
                        <TextField
                          fullWidth
                          label="Labor Cost"
                          type="number"
                          value={service.laborCost || ''}
                          onChange={(e) => updateService(index, 'laborCost', e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          margin="normal"
                        />
                      </Grid>
                      
                      <Grid item xs={6} sm={3} md={2}>
                        <TextField
                          fullWidth
                          label="Material Cost"
                          type="number"
                          value={service.materialCost || ''}
                          onChange={(e) => updateService(index, 'materialCost', e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          margin="normal"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={1} sx={{ textAlign: 'center' }}>
                        <IconButton 
                          color="error" 
                          onClick={() => removeService(index)}
                          disabled={formik.values.services.length <= 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/work-orders')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Work Order'}
              </Button>
            </Box>
          </form>
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default CreateWorkOrder;

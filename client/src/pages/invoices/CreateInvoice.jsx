import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  CircularProgress,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Save as SaveIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetFilteredWorkOrdersQuery, useCreateInvoiceMutation } from '../../features/invoices/invoicesApiSlice';

const validationSchema = Yup.object({
  buildingId: Yup.string().required('Building is required'),
  invoiceNumber: Yup.string()
    .transform((value) => value.trim().toUpperCase())
    .matches(
      /^[A-Z0-9-]*$/,
      'Invoice number can only contain letters, numbers, and hyphens'
    )
    .max(20, 'Invoice number must be 20 characters or less'),
  invoiceDate: Yup.date().required('Invoice date is required'),
  dueDate: Yup.date().required('Due date is required').min(Yup.ref('invoiceDate'), 'Due date must be after invoice date'),
  notes: Yup.string(),
  workOrderIds: Yup.array().min(1, 'At least one work order must be selected')
});

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [selectedWorkOrders, setSelectedWorkOrders] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  
  // Enhanced filtering state
  const [filters, setFilters] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    workType: '',
    workSubType: '',
    status: '' // Show all work orders regardless of status
  });
  
  const { data: buildingsResponse, isLoading: isLoadingBuildings, error: buildingsError } = useGetBuildingsQuery();
  const buildings = buildingsResponse?.data?.buildings || [];
  
  // Work type options for filtering
  const workTypes = [
    { value: 'painting', label: 'Painting' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'repair', label: 'Repairs' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'installation', label: 'Installation' },
    { value: 'inspection', label: 'Inspection' }
  ];
  
  const workSubTypes = {
    painting: ['interior', 'exterior', 'touch-up', 'primer', 'doors', 'ceilings', 'cabinets'],
    cleaning: ['apartment', 'carpet', 'deep-clean', 'move-out', 'touch-up', 'gutter'],
    repair: ['plumbing', 'electrical', 'hvac', 'flooring', 'drywall', 'appliance'],
    maintenance: ['preventive', 'routine', 'seasonal', 'emergency'],
    installation: ['fixtures', 'appliances', 'flooring', 'electrical'],
    inspection: ['move-in', 'move-out', 'routine', 'damage-assessment']
  };

  // Fetch filtered work orders when a building is selected
  const {
    data: filteredWorkOrdersData,
    isLoading: isLoadingWorkOrders,
    error: workOrdersError
  } = useGetFilteredWorkOrdersQuery(
    {
      buildingId: selectedBuildingId,
      startDate: filters.startDate?.toISOString(),
      endDate: filters.endDate?.toISOString(),
      workType: filters.workType || undefined,
      workSubType: filters.workSubType || undefined,
      status: filters.status || undefined
    },
    {
      skip: !selectedBuildingId,
      // Remove refetchOnMountOrArgChange to prevent excessive refetching
      // refetchOnMountOrArgChange: true
    }
  );

  const workOrders = filteredWorkOrdersData?.data || [];

  // Debug logging - only run when major changes occur (less frequently)
  useEffect(() => {
    if (selectedBuildingId) {
      console.log('CreateInvoice Debug:', {
        selectedBuildingId,
        isLoadingWorkOrders,
        workOrdersError,
        workOrdersCount: workOrders.length,
        selectedWorkOrdersCount: selectedWorkOrders.length,
        filters: {
          startDate: filters.startDate?.toISOString(),
          endDate: filters.endDate?.toISOString(),
          workType: filters.workType,
          workSubType: filters.workSubType,
          status: filters.status
        }
      });
    }
  }, [selectedBuildingId, workOrders.length, filters.workType, filters.status, filters.endDate, filters.startDate, filters.workSubType, isLoadingWorkOrders, selectedWorkOrders.length, workOrdersError]);

  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();

  const calculateTotal = () => {
    return selectedWorkOrders.reduce((total, workOrder) => {
      const price = getWorkOrderCost(workOrder);
      return total + price;
    }, 0);
  };
  
  // Get individual work order cost for display
  const getWorkOrderCost = (workOrder) => {
    if (workOrder.services && workOrder.services.length > 0) {
      return workOrder.services.reduce((sum, service) => {
        return sum + (service.laborCost || 0) + (service.materialCost || 0);
      }, 0);
    }
    return workOrder.price || workOrder.actualCost || workOrder.estimatedCost || 0;
  };

  const formik = useFormik({
    initialValues: {
      buildingId: '',
      invoiceNumber: '',
      invoiceDate: new Date(), // Today's date as default
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from invoice date by default
      notes: '',
      workOrderIds: []
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        console.log('=== FORMIK ONSUBMIT CALLED ===');
        console.log('Submitting invoice with values:', values);
        console.log('Selected work orders:', selectedWorkOrders);

        if (selectedWorkOrders.length === 0) {
          toast.error('Please select at least one work order');
          return;
        }

        const invoiceData = {
          buildingId: values.buildingId,
          workOrderIds: values.workOrderIds,
          invoiceDate: values.invoiceDate,
          dueDate: values.dueDate,
          notes: values.notes,
          invoiceNumber: values.invoiceNumber?.trim() || undefined,
          totalAmount: calculateTotal()
        };

        console.log('Invoice data being sent to API:', invoiceData);

        console.log('About to call createInvoice mutation...');
        const result = await createInvoice(invoiceData).unwrap();
        console.log('API call successful! Result:', result);

        toast.success('Invoice created successfully!');
        navigate('/invoices');
      } catch (error) {
        console.error('=== INVOICE CREATION ERROR ===');
        console.error('Error details:', error);
        console.error('Error data:', error?.data);
        console.error('Error message:', error?.message);
        console.error('Error status:', error?.status);

        const errorMessage = error?.data?.message || error?.message || 'Failed to create invoice';
        console.log('Final error message:', errorMessage);
        toast.error(errorMessage);
      }
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Form already submitting, ignoring...');
      return;
    }

    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Selected work orders:', selectedWorkOrders);
    console.log('Formik values:', formik.values);

    if (formik.values.workOrderIds.length === 0) { // Use Formik values for validation
      toast.error('Please select at least one work order');
      return;
    }

    // Format invoice number to uppercase and trim
    if (formik.values.invoiceNumber) {
      formik.setFieldValue('invoiceNumber', formik.values.invoiceNumber.trim().toUpperCase());
    }

    console.log('About to submit form...');
    setIsSubmitting(true);

    // Submit the form using Formik's submitForm method
    try {
      await formik.submitForm();
      console.log('Form submitted successfully');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Form submission failed: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWorkOrderToggle = (workOrder) => {
    try {
      const isSelected = selectedWorkOrders.find(wo => wo._id === workOrder._id);
      if (isSelected) {
        const newSelectedWorkOrders = selectedWorkOrders.filter(wo => wo._id !== workOrder._id);
        setSelectedWorkOrders(newSelectedWorkOrders);
        formik.setFieldValue('workOrderIds', newSelectedWorkOrders.map(wo => wo._id));
      } else {
        const newSelectedWorkOrders = [...selectedWorkOrders, workOrder];
        setSelectedWorkOrders(newSelectedWorkOrders);
        formik.setFieldValue('workOrderIds', newSelectedWorkOrders.map(wo => wo._id));
      }
    } catch (error) {
      console.error('Error toggling work order:', error);
      toast.error('Error selecting work order');
    }
  };

  const handleBuildingChange = (event) => {
    try {
      const buildingId = event.target.value;
      formik.setFieldValue('buildingId', buildingId);
      formik.setFieldValue('workOrderIds', []);
      setSelectedWorkOrders([]);
      setSelectedBuildingId(buildingId);
    } catch (error) {
      console.error('Error changing building:', error);
      toast.error('Error selecting building');
    }
  };
  
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value,
      // Reset workSubType when workType changes
      ...(filterName === 'workType' && { workSubType: '' })
    }));
    // Clear selected work orders when filters change
    setSelectedWorkOrders([]);
    formik.setFieldValue('workOrderIds', []);
  };
  
  const resetFilters = () => {
    setFilters({
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
      workType: '',
      workSubType: '',
      status: 'completed'
    });
    setSelectedWorkOrders([]);
    formik.setFieldValue('workOrderIds', []);
  };
  
  const setMonthFilter = (monthsBack = 0) => {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() - monthsBack);
    
    setFilters(prev => ({
      ...prev,
      startDate: startOfMonth(targetDate),
      endDate: endOfMonth(targetDate)
    }));
    setSelectedWorkOrders([]);
    formik.setFieldValue('workOrderIds', []);
  };

  // Error boundary for the component
  if (buildingsError) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Error loading buildings: {buildingsError.message}
          </Alert>
        </Box>
      </Container>
    );
  }

  if (isLoadingBuildings) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/invoices')}
            sx={{ mb: 2 }}
          >
            Back to Invoices
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            Create New Invoice
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Invoice Details
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={formik.touched.buildingId && Boolean(formik.errors.buildingId)}>
                    <InputLabel id="building-label">Building</InputLabel>
                    <Select
                      labelId="building-label"
                      id="buildingId"
                      name="buildingId"
                      value={formik.values.buildingId}
                      onChange={handleBuildingChange}
                      onBlur={formik.handleBlur}
                      label="Building"
                      disabled={isLoadingBuildings}
                    >
                      {buildings.map((building) => (
                        <MenuItem key={building._id} value={building._id}>
                          {building.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {formik.touched.buildingId && formik.errors.buildingId && (
                      <FormHelperText>{formik.errors.buildingId}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="invoiceNumber"
                    name="invoiceNumber"
                    label="Invoice Number"
                    value={formik.values.invoiceNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.invoiceNumber && Boolean(formik.errors.invoiceNumber)}
                    helperText={formik.touched.invoiceNumber && formik.errors.invoiceNumber}
                    placeholder="e.g., INV-2025-001 (optional - leave blank for auto-generation)"
                    inputProps={{ style: { textTransform: 'uppercase' } }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Invoice Date"
                    value={formik.values.invoiceDate}
                    onChange={(date) => {
                      formik.setFieldValue('invoiceDate', date);
                      // Auto-calculate due date based on invoice date + 30 days (or building's payment terms)
                      if (date) {
                        const dueDate = new Date(date);
                        dueDate.setDate(dueDate.getDate() + 30); // Default 30 days
                        formik.setFieldValue('dueDate', dueDate);
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: formik.touched.invoiceDate && Boolean(formik.errors.invoiceDate),
                        helperText: formik.touched.invoiceDate && formik.errors.invoiceDate
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Due Date"
                    value={formik.values.dueDate}
                    onChange={(date) => formik.setFieldValue('dueDate', date)}
                    minDate={formik.values.invoiceDate || new Date()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: formik.touched.dueDate && Boolean(formik.errors.dueDate),
                        helperText: formik.touched.dueDate && formik.errors.dueDate
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    name="notes"
                    value={formik.values.notes}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    multiline
                    rows={3}
                    error={formik.touched.notes && Boolean(formik.errors.notes)}
                    helperText={formik.touched.notes && formik.errors.notes}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {selectedBuildingId && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Filter Work Orders
                </Typography>
                
                {/* Enhanced Filtering Section */}
                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FilterIcon />
                      <Typography variant="subtitle1">Advanced Filters</Typography>
                      <Chip 
                        label={`${format(filters.startDate, 'MMM yyyy')} - ${workOrders.length} orders`}
                        size="small" 
                        color="primary" 
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {/* Show All Work Orders Button */}
                      <Grid item xs={12}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setFilters({
                            startDate: startOfMonth(new Date()),
                            endDate: endOfMonth(new Date()),
                            workType: '',
                            workSubType: '',
                            status: ''
                          })}
                          sx={{ mr: 1 }}
                        >
                          Show All Work Orders
                        </Button>
                        <Typography variant="caption" color="textSecondary">
                          Click to view all unbilled work orders for this building before applying filters
                        </Typography>
                      </Grid>
                      {/* Quick Month Filters */}
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>Quick Month Selection:</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Button 
                            size="small" 
                            variant={filters.startDate.getMonth() === new Date().getMonth() ? 'contained' : 'outlined'}
                            onClick={() => setMonthFilter(0)}
                          >
                            This Month
                          </Button>
                          <Button 
                            size="small" 
                            variant={filters.startDate.getMonth() === new Date(new Date().setMonth(new Date().getMonth() - 1)).getMonth() ? 'contained' : 'outlined'}
                            onClick={() => setMonthFilter(1)}
                          >
                            Last Month
                          </Button>
                          <Button 
                            size="small" 
                            variant="outlined"
                            onClick={() => setMonthFilter(2)}
                          >
                            2 Months Ago
                          </Button>
                          <Button 
                            size="small" 
                            variant="outlined"
                            onClick={() => setMonthFilter(3)}
                          >
                            3 Months Ago
                          </Button>
                        </Stack>
                      </Grid>
                      
                      {/* Date Range */}
                      <Grid item xs={12} md={6}>
                        <DatePicker
                          label="Start Date"
                          value={filters.startDate}
                          onChange={(date) => handleFilterChange('startDate', date)}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: 'small'
                            }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <DatePicker
                          label="End Date"
                          value={filters.endDate}
                          onChange={(date) => handleFilterChange('endDate', date)}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: 'small'
                            }
                          }}
                        />
                      </Grid>
                      
                      {/* Work Type Filter */}
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Work Type</InputLabel>
                          <Select
                            value={filters.workType}
                            onChange={(e) => handleFilterChange('workType', e.target.value)}
                            label="Work Type"
                          >
                            <MenuItem value="">All Types</MenuItem>
                            {workTypes.map((type) => (
                              <MenuItem key={type.value} value={type.value}>
                                {type.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      {/* Work Sub Type Filter */}
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small" disabled={!filters.workType}>
                          <InputLabel>Sub Type</InputLabel>
                          <Select
                            value={filters.workSubType}
                            onChange={(e) => handleFilterChange('workSubType', e.target.value)}
                            label="Sub Type"
                          >
                            <MenuItem value="">All Sub Types</MenuItem>
                            {filters.workType && workSubTypes[filters.workType]?.map((subType) => (
                              <MenuItem key={subType} value={subType}>
                                {subType.charAt(0).toUpperCase() + subType.slice(1).replace('-', ' ')}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      {/* Status Filter */}
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            label="Status"
                          >
                            <MenuItem value="">All Statuses</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                            <MenuItem value="in_progress">In Progress</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      {/* Reset Button */}
                      <Grid item xs={12}>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          onClick={resetFilters}
                          sx={{ mt: 1, mr: 1 }}
                        >
                          Reset Filters
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            // Force refresh the work orders query
                            window.location.reload();
                          }}
                          sx={{ mt: 1 }}
                        >
                          Refresh Data
                        </Button>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                {/* Filter Summary */}
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Filter Results:</Typography>
                  <Typography variant="body2">
                    Period: {format(filters.startDate, 'MMM dd, yyyy')} - {format(filters.endDate, 'MMM dd, yyyy')}
                  </Typography>
                  <Typography variant="body2">
                    Type: {filters.workType ? workTypes.find(t => t.value === filters.workType)?.label : 'All'}
                    {filters.workSubType && ` > ${filters.workSubType}`}
                  </Typography>
                  <Typography variant="body2">
                    Status: {filters.status || 'All'} | Found: {workOrders.length} work orders | Selected: {selectedWorkOrders.length}
                  </Typography>
                </Alert>

                {isLoadingWorkOrders ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : workOrdersError ? (
                  <Alert severity="error">
                    <Typography variant="subtitle2" gutterBottom>
                      Error loading work orders
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      {workOrdersError?.data?.message || workOrdersError?.message || 'Unable to load work orders for this building'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" gutterBottom>
                      Building ID: {selectedBuildingId}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="textSecondary">
                      This might be due to:
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                      <li>No unbilled work orders found for this building</li>
                      <li>Network connectivity issues</li>
                      <li>Building may not exist or you don't have permission to view it</li>
                    </ul>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        // Force refresh the work orders query
                        window.location.reload();
                      }}
                      sx={{ mt: 1 }}
                    >
                      Retry
                    </Button>
                  </Alert>
                ) : workOrders.length === 0 ? (
                  <Alert severity="info">
                    No unbilled work orders found for this building.
                    <br />
                    <small>Building ID: {selectedBuildingId}</small>
                    <br />
                    <small>Make sure you have work orders with pending billing status for this building.</small>
                    <br />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setSelectedBuildingId('')}
                      sx={{ mt: 1 }}
                    >
                      Select Different Building
                    </Button>
                  </Alert>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">Select</TableCell>
                          <TableCell>Title</TableCell>
                          <TableCell>Type & Date</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Cost</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {workOrders.map((workOrder) => (
                          <TableRow key={workOrder._id} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedWorkOrders.some(wo => wo._id === workOrder._id)}
                                onChange={() => handleWorkOrderToggle(workOrder)}
                              />
                            </TableCell>
                            <TableCell>
                              {workOrder.title || 'Untitled Work Order'}
                              <br />
                              <small style={{ color: '#666' }}>ID: {workOrder._id}</small>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {workOrder.workType?.name || 'Unknown Type'}
                                {workOrder.workSubType?.name && ` - ${workOrder.workSubType.name}`}
                              </Typography>
                              <small style={{ color: '#666' }}>
                                Apt: {workOrder.apartmentNumber || 'N/A'} | 
                                {workOrder.scheduledDate ? format(new Date(workOrder.scheduledDate), 'MMM dd, yyyy') : 'No date'}
                              </small>
                            </TableCell>
                            <TableCell>
                              {workOrder.status || 'Unknown'}
                              <br />
                              <small style={{ color: '#666' }}>Billing: {workOrder.billingStatus || 'pending'}</small>
                            </TableCell>
                            <TableCell align="right">
                              ${getWorkOrderCost(workOrder).toFixed(2)}
                              <br />
                              <small style={{ color: '#666' }}>
                                {workOrder.services?.length > 0 ? (
                                  `Services: ${workOrder.services.length}`
                                ) : (
                                  `Price: $${workOrder.price || 0} | Cost: $${workOrder.actualCost || 0}`
                                )}
                              </small>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          )}

          {formik.values.workOrderIds.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Invoice Summary
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>
                    Selected Work Orders: {formik.values.workOrderIds.length}
                  </Typography>
                  <Typography variant="h6">
                    Total: ${calculateTotal().toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/invoices')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={isCreating || formik.values.workOrderIds.length === 0 || isSubmitting}
            >
              {isCreating || isSubmitting ? 'Creating...' : 'Create Invoice'}
            </Button>
          </Box>
        </form>
      </Container>
    </LocalizationProvider>
  );
};

export default CreateInvoice;

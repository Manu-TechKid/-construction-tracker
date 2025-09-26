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
  FormControlLabel,
  Divider,
  CircularProgress
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetUnbilledWorkOrdersQuery, useCreateInvoiceMutation } from '../../features/invoices/invoicesApiSlice';

const validationSchema = Yup.object({
  buildingId: Yup.string().required('Building is required'),
  invoiceNumber: Yup.string()
    .transform((value) => value.trim().toUpperCase())
    .matches(
      /^[A-Z0-9-]*$/,
      'Invoice number can only contain letters, numbers, and hyphens'
    )
    .max(20, 'Invoice number must be 20 characters or less'),
  dueDate: Yup.date().required('Due date is required').min(new Date(), 'Due date must be in the future'),
  notes: Yup.string(),
  workOrderIds: Yup.array().min(1, 'At least one work order must be selected')
});

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [selectedWorkOrders, setSelectedWorkOrders] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  
  const { data: buildingsResponse, isLoading: isLoadingBuildings, error: buildingsError } = useGetBuildingsQuery();
  const buildings = buildingsResponse?.data?.buildings || [];

  // Fetch unbilled work orders when a building is selected
  const {
    data: unbilledWorkOrdersData,
    isLoading: isLoadingWorkOrders,
    error: workOrdersError
  } = useGetUnbilledWorkOrdersQuery(
    selectedBuildingId || '',
    {
      skip: !selectedBuildingId,
      refetchOnMountOrArgChange: true
    }
  );

  const workOrders = unbilledWorkOrdersData?.data || [];

  // Debug logging - only run when values actually change
  useEffect(() => {
    if (selectedBuildingId || workOrders.length > 0) {
      console.log('CreateInvoice Debug:', {
        selectedBuildingId,
        isLoadingWorkOrders,
        workOrdersError,
        workOrdersCount: workOrders.length,
        selectedWorkOrdersCount: selectedWorkOrders.length
      });
    }
  }, [selectedBuildingId, isLoadingWorkOrders, workOrders.length, selectedWorkOrders.length]);

  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();

  // Calculate total amount from selected work orders
  const calculateTotal = () => {
    return selectedWorkOrders.reduce((total, workOrder) => {
      // Use the price field (what customer pays) instead of cost fields
      return total + (workOrder.price || workOrder.estimatedCost || workOrder.actualCost || 0);
    }, 0);
  };

  const formik = useFormik({
    initialValues: {
      buildingId: '',
      invoiceNumber: '',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
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
          dueDate: values.dueDate instanceof Date ? values.dueDate.toISOString() : new Date(values.dueDate).toISOString(),
          notes: values.notes,
          invoiceNumber: values.invoiceNumber?.trim() || undefined
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
                    label="Due Date"
                    value={formik.values.dueDate}
                    onChange={(date) => formik.setFieldValue('dueDate', date)}
                    minDate={new Date()}
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
                  Select Work Orders
                </Typography>

                {/* Debug Information */}
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Debug Information:</Typography>
                  <Typography variant="body2">Selected Building ID: {selectedBuildingId}</Typography>
                  <Typography variant="body2">Loading: {isLoadingWorkOrders ? 'Yes' : 'No'}</Typography>
                  <Typography variant="body2">Error: {workOrdersError ? 'Yes' : 'No'}</Typography>
                  <Typography variant="body2">Work Orders Count: {workOrders.length}</Typography>
                  <Typography variant="body2">Selected Work Orders: {selectedWorkOrders.length}</Typography>
                </Alert>

                {isLoadingWorkOrders ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : workOrdersError ? (
                  <Alert severity="error">
                    Error loading work orders: {workOrdersError?.message || 'Unknown error'}
                    <br />
                    <small>Building ID: {selectedBuildingId}</small>
                    <br />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => window.location.reload()}
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
                          <TableCell>Description</TableCell>
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
                              {workOrder.description || 'No description'}
                              <br />
                              <small style={{ color: '#666' }}>Apt: {workOrder.apartmentNumber || 'N/A'}</small>
                            </TableCell>
                            <TableCell>
                              {workOrder.status || 'Unknown'}
                              <br />
                              <small style={{ color: '#666' }}>Billing: {workOrder.billingStatus || 'pending'}</small>
                            </TableCell>
                            <TableCell align="right">
                              ${((workOrder.price || workOrder.estimatedCost || workOrder.actualCost || 0)).toFixed(2)}
                              <br />
                              <small style={{ color: '#666' }}>
                                Price: ${workOrder.price || 0} | Cost: ${workOrder.cost || workOrder.actualCost || 0}
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

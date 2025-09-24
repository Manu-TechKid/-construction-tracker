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
  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();

  // Calculate total amount from selected work orders
  const calculateTotal = () => {
    return selectedWorkOrders.reduce((total, workOrder) => {
      return total + (workOrder.actualCost || workOrder.estimatedCost || 0);
    }, 0);
  };

  const formik = useFormik({
    initialValues: {
      buildingId: '',
      invoiceNumber: '',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: '',
      workOrderIds: []
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const invoiceData = {
          buildingId: values.buildingId,
          workOrderIds: selectedWorkOrders.map(wo => wo._id),
          dueDate: values.dueDate,
          notes: values.notes,
          invoiceNumber: values.invoiceNumber || undefined // Only send if not empty
        };

        await createInvoice(invoiceData).unwrap();
        toast.success('Invoice created successfully!');
        navigate('/invoices');
      } catch (error) {
        console.error('Invoice creation error:', error);
        toast.error(error?.data?.message || 'Failed to create invoice');
      }
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedWorkOrders.length === 0) {
      toast.error('Please select at least one work order');
      return;
    }

    // Format invoice number to uppercase and trim
    if (formik.values.invoiceNumber) {
      formik.setFieldValue('invoiceNumber', formik.values.invoiceNumber.trim().toUpperCase());
    }

    await formik.submitForm();
  };

  const handleWorkOrderToggle = (workOrder) => {
    const isSelected = selectedWorkOrders.find(wo => wo._id === workOrder._id);
    if (isSelected) {
      setSelectedWorkOrders(selectedWorkOrders.filter(wo => wo._id !== workOrder._id));
    } else {
      setSelectedWorkOrders([...selectedWorkOrders, workOrder]);
    }
  };

  const handleBuildingChange = (event) => {
    const buildingId = event.target.value;
    formik.setFieldValue('buildingId', buildingId);
    formik.setFieldValue('workOrderIds', []);
    setSelectedWorkOrders([]);
  };

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
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Due Date"
                      value={formik.values.dueDate}
                      onChange={(date) => formik.setFieldValue('dueDate', date)}
                      minDate={new Date()}
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
                
                {isLoadingWorkOrders ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : workOrdersError ? (
                  <Alert severity="error">
                    Error loading work orders: {workOrdersError.message}
                  </Alert>
                ) : workOrders.length === 0 ? (
                  <Alert severity="info">
                    No unbilled work orders found for this building.
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
                          <TableRow key={workOrder._id}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedWorkOrders.some(wo => wo._id === workOrder._id)}
                                onChange={() => handleWorkOrderToggle(workOrder)}
                              />
                            </TableCell>
                            <TableCell>{workOrder.title}</TableCell>
                            <TableCell>{workOrder.description}</TableCell>
                            <TableCell>{workOrder.status}</TableCell>
                            <TableCell align="right">
                              ${(workOrder.actualCost || workOrder.estimatedCost || 0).toFixed(2)}
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

          {selectedWorkOrders.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Invoice Summary
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>
                    Selected Work Orders: {selectedWorkOrders.length}
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
              disabled={isCreating || selectedWorkOrders.length === 0}
            >
              {isCreating ? 'Creating...' : 'Create Invoice'}
            </Button>
          </Box>
        </form>
      </Container>
    </LocalizationProvider>
  );
};

export default CreateInvoice;

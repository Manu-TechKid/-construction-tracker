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
  dueDate: Yup.date().required('Due date is required').min(new Date(), 'Due date must be in the future'),
  notes: Yup.string(),
  workOrderIds: Yup.array().min(1, 'At least one work order must be selected')
});

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [selectedWorkOrders, setSelectedWorkOrders] = useState([]);
  const { data: buildings = [], isLoading: isLoadingBuildings } = useGetBuildingsQuery();
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  
  // Fetch unbilled work orders when a building is selected
  const { 
    data: unbilledWorkOrdersData, 
    isLoading: isLoadingWorkOrders,
    error: workOrdersError 
  } = useGetUnbilledWorkOrdersQuery(
    selectedBuildingId || '',
    { skip: !selectedBuildingId }
  );
  
  // Debug logs
  useEffect(() => {
    console.log('Selected building ID:', selectedBuildingId);
    if (workOrdersError) {
      console.error('Error fetching work orders:', workOrdersError);
    }
    if (unbilledWorkOrdersData) {
      console.log('Fetched work orders:', unbilledWorkOrdersData);
    }
  }, [selectedBuildingId, workOrdersError, unbilledWorkOrdersData]);
  
  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();

  const formik = useFormik({
    initialValues: {
      buildingId: '',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      notes: '',
      workOrderIds: []
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        const result = await createInvoice({
          buildingId: values.buildingId,
          workOrderIds: values.workOrderIds,
          dueDate: values.dueDate,
          notes: values.notes
        }).unwrap();

        if (result.success) {
          toast.success('Invoice created successfully!');
          navigate('/invoices');
        }
      } catch (error) {
        console.error('Failed to create invoice:', error);
        toast.error(error?.data?.message || 'Failed to create invoice');
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Handle building selection change
  const handleBuildingChange = (event) => {
    const buildingId = event.target.value;
    console.log('Building changed to:', buildingId);
    formik.setFieldValue('buildingId', buildingId);
    setSelectedBuildingId(buildingId);
    setSelectedWorkOrders([]);
    formik.setFieldValue('workOrderIds', []);
  };

  const handleWorkOrderSelect = (workOrderId, isSelected) => {
    let newSelected = [...(formik.values.workOrderIds || [])];
    
    if (isSelected) {
      newSelected.push(workOrderId);
    } else {
      newSelected = newSelected.filter(id => id !== workOrderId);
    }
    
    formik.setFieldValue('workOrderIds', newSelected);
  };

  const calculateTotal = () => {
    if (!unbilledWorkOrdersData?.data) return 0;
    
    return unbilledWorkOrdersData.data
      .filter(wo => formik.values.workOrderIds.includes(wo._id))
      .reduce((sum, wo) => {
        const workOrderTotal = wo.services?.reduce((workOrderSum, service) => {
          return workOrderSum + (service.laborCost || 0) + (service.materialCost || 0);
        }, 0) || 0;
        return sum + workOrderTotal;
      }, 0);
  };

  const taxRate = 0.1; // 10% tax
  const subtotal = calculateTotal();
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  if (isLoadingBuildings) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/invoices')}
          disabled={formik.isSubmitting}
        >
          Back to Invoices
        </Button>
        <Typography variant="h4" component="h1">
          Create New Invoice
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <form onSubmit={formik.handleSubmit}>
            <Box display="grid" gap={3}>
              <FormControl fullWidth error={formik.touched.buildingId && Boolean(formik.errors.buildingId)}>
                <InputLabel id="building-label">Building *</InputLabel>
                <Select
                  labelId="building-label"
                  id="buildingId"
                  name="buildingId"
                  value={formik.values.buildingId}
                  onChange={handleBuildingChange}
                  onBlur={formik.handleBlur}
                  label="Building *"
                >
                  {buildings?.data?.map((building) => (
                    <MenuItem key={building._id} value={building._id}>
                      {building.name} - {building.address}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.buildingId && formik.errors.buildingId && (
                  <Typography color="error" variant="caption">
                    {formik.errors.buildingId}
                  </Typography>
                )}
              </FormControl>

              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Due Date *"
                  value={formik.values.dueDate}
                  onChange={(date) => formik.setFieldValue('dueDate', date)}
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

              <TextField
                fullWidth
                id="notes"
                name="notes"
                label="Notes"
                multiline
                rows={3}
                value={formik.values.notes}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.notes && Boolean(formik.errors.notes)}
                helperText={formik.touched.notes && formik.errors.notes}
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Select Work Orders to Invoice
              </Typography>

              {formik.values.buildingId ? (
                isLoadingWorkOrders ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : workOrdersError ? (
                  <Alert severity="error">
                    Error loading work orders: {workOrdersError?.data?.message || 'Unknown error'}
                  </Alert>
                ) : unbilledWorkOrdersData?.data?.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={
                                formik.values.workOrderIds.length > 0 &&
                                formik.values.workOrderIds.length < unbilledWorkOrdersData.data?.length
                              }
                              checked={
                                unbilledWorkOrdersData.data?.length > 0 &&
                                formik.values.workOrderIds.length === unbilledWorkOrdersData.data.length
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  formik.setFieldValue(
                                    'workOrderIds',
                                    unbilledWorkOrdersData.data.map(wo => wo._id)
                                  );
                                } else {
                                  formik.setFieldValue('workOrderIds', []);
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>Work Order</TableCell>
                          <TableCell>Apartment</TableCell>
                          <TableCell align="right">Total Cost</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {unbilledWorkOrdersData.data.map((workOrder) => {
                          const workOrderTotal = workOrder.services?.reduce((sum, service) => {
                            return sum + (service.laborCost || 0) + (service.materialCost || 0);
                          }, 0) || 0;

                          return (
                            <TableRow key={workOrder._id} hover>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={formik.values.workOrderIds.includes(workOrder._id)}
                                  onChange={(e) => handleWorkOrderSelect(workOrder._id, e.target.checked)}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {workOrder.title || `Work Order #${workOrder.workOrderNumber || workOrder._id.substring(18, 24)}`}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {workOrder.description?.substring(0, 50)}{workOrder.description?.length > 50 ? '...' : ''}
                                </Typography>
                              </TableCell>
                              <TableCell>{workOrder.apartmentNumber || 'N/A'}</TableCell>
                              <TableCell align="right">
                                ${workOrderTotal.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    {unbilledWorkOrdersData?.data?.length === 0 
                      ? 'No unbilled work orders found for this building.'
                      : 'Select a building to view available work orders.'}
                  </Alert>
                )
              ) : (
                <Alert severity="info">
                  Please select a building to view available work orders.
                </Alert>
              )}

              {formik.values.workOrderIds.length > 0 && (
                <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
                  <Typography variant="h6" gutterBottom>
                        Invoice Summary
                      </Typography>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>Subtotal:</Typography>
                        <Typography>${subtotal.toFixed(2)}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography>Tax ({(taxRate * 100)}%):</Typography>
                        <Typography>${tax.toFixed(2)}</Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box display="flex" justifyContent="space-between" fontWeight="bold">
                        <Typography>Total:</Typography>
                        <Typography>${total.toFixed(2)}</Typography>
                      </Box>
                    </Box>
                  )}

                  {formik.touched.workOrderIds && formik.errors.workOrderIds && (
                    <Typography color="error" variant="caption">
                      {formik.errors.workOrderIds}
                    </Typography>
                  )}

                  <Box display="flex" justifyContent="flex-end" mt={3} gap={2}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/invoices')}
                      disabled={formik.isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      startIcon={isCreating ? <CircularProgress size={20} /> : <SaveIcon />}
                      disabled={isCreating || formik.values.workOrderIds.length === 0}
                    >
                      {isCreating ? 'Creating...' : 'Create Invoice'}
                    </Button>
                  </Box>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Container>
      );
    };

export default CreateInvoice;

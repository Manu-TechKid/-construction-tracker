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
  const { data: buildingsResponse = {}, isLoading: isLoadingBuildings, error: buildingsError } = useGetBuildingsQuery();
  const buildings = buildingsResponse.data?.buildings || [];
  
  // Debug logging
  console.log('Buildings response:', buildingsResponse);
  console.log('Buildings data:', buildings);
  console.log('Buildings loading:', isLoadingBuildings);
  console.log('Buildings error:', buildingsError);
  
  // Debug log buildings data
  useEffect(() => {
    console.log('Buildings response:', buildingsResponse);
    console.log('Buildings array:', buildings);
  }, [buildingsResponse, buildings]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  
  // Fetch unbilled work orders when a building is selected
  const { 
    data: unbilledWorkOrdersData = { data: [] }, 
    isLoading: isLoadingWorkOrders,
    error: workOrdersError,
    refetch: refetchWorkOrders,
    isError: isWorkOrdersError
  } = useGetUnbilledWorkOrdersQuery(
    selectedBuildingId || '',
    { 
      skip: !selectedBuildingId,
      refetchOnMountOrArgChange: true
    }
  );
  
  // Log work orders data for debugging
  useEffect(() => {
    if (unbilledWorkOrdersData) {
      console.log('Unbilled work orders data:', unbilledWorkOrdersData);
    }
    if (workOrdersError) {
      console.error('Error fetching work orders:', workOrdersError);
    }
  }, [unbilledWorkOrdersData, workOrdersError]);

  // Debug logging for work orders
  useEffect(() => {
    console.log('Selected Building ID:', selectedBuildingId);
    console.log('Unbilled Work Orders Data:', unbilledWorkOrdersData);
    console.log('Work Orders Loading:', isLoadingWorkOrders);
    console.log('Work Orders Error:', workOrdersError);
  }, [selectedBuildingId, unbilledWorkOrdersData, isLoadingWorkOrders, workOrdersError]);

  // Ensure workOrders is always an array and handle potential null/undefined
  const workOrders = (() => {
    try {
      if (!unbilledWorkOrdersData) return [];
      
      // Handle different possible response structures
      if (Array.isArray(unbilledWorkOrdersData)) {
        return unbilledWorkOrdersData;
      } 
      
      if (unbilledWorkOrdersData.data) {
        return Array.isArray(unbilledWorkOrdersData.data) 
          ? unbilledWorkOrdersData.data 
          : [unbilledWorkOrdersData.data].filter(Boolean);
      }
      
      return [];
    } catch (error) {
      console.error('Error processing work orders data:', error);
      return [];
    }
  })();
  
  // Debug logs
  useEffect(() => {
    console.log('=== DEBUG ===');
    console.log('Selected building ID:', selectedBuildingId);
    console.log('Buildings loaded:', buildings.length > 0);
    console.log('Loading buildings:', isLoadingBuildings);
    console.log('Work orders data:', workOrders);
    console.log('Loading work orders:', isLoadingWorkOrders);
    console.log('Work orders error:', workOrdersError);
    console.log('Form values:', formik.values);
    
    if (workOrdersError) {
      console.error('Error fetching work orders:', workOrdersError);
    }
  }, [selectedBuildingId, workOrdersError, unbilledWorkOrdersData, buildings, isLoadingBuildings, workOrders, isLoadingWorkOrders, formik.values]);
  
  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();

  const formik = useFormik({
    initialValues: {
      buildingId: '',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: '',
      workOrderIds: []
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values, { setSubmitting, setStatus, setFieldError }) => {
      try {
        // Validate work orders
        if (!values.workOrderIds || values.workOrderIds.length === 0) {
          setFieldError('workOrderIds', 'Please select at least one work order');
          return;
        }

        const result = await createInvoice({
          ...values,
          dueDate: values.dueDate?.toISOString?.() || new Date().toISOString()
        }).unwrap();

        if (result?.data?._id) {
          toast.success('Invoice created successfully!');
          navigate(`/invoices/${result.data._id}`);
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (err) {
        console.error('Error creating invoice:', err);
        const errorMessage = err?.data?.message || err?.message || 'Failed to create invoice';
        toast.error(errorMessage);
        setStatus({ error: errorMessage });
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Handle building selection change with error handling
  const handleBuildingChange = (event) => {
    try {
      const buildingId = event?.target?.value;
      if (!buildingId) return;
      
      console.log('Building selected:', buildingId);
      setSelectedBuildingId(buildingId);
      formik.setFieldValue('buildingId', buildingId);
      formik.setFieldValue('workOrderIds', []); // Reset work order selections
      
      // Force refetch of work orders when building changes
      if (buildingId) {
        console.log('Refetching work orders for building:', buildingId);
        refetchWorkOrders().then(() => {
          console.log('Work orders refetched successfully');
        }).catch(err => {
          console.error('Error refetching work orders:', err);
        });
      }
    } catch (error) {
      console.error('Error handling building change:', error);
      toast.error('Failed to load work orders for selected building');
    }
  };

  const handleWorkOrderSelect = (workOrderId, isSelected) => {
    try {
      let newSelected = [...(formik.values.workOrderIds || [])];
      
      if (isSelected) {
        newSelected.push(workOrderId);
      } else {
        newSelected = newSelected.filter(id => id !== workOrderId);
      }
      
      formik.setFieldValue('workOrderIds', newSelected);
    } catch (error) {
      console.error('Error handling work order selection:', error);
    }
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
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading buildings...</Typography>
        </Box>
      </Container>
    );
  }

  if (buildingsError) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mt: 2 }}>
          Error loading buildings: {buildingsError?.data?.message || 'Unknown error'}
          <Box mt={1}>
            <Button variant="outlined" onClick={() => window.location.reload()} sx={{ mt: 1 }}>
              Retry
            </Button>
          </Box>
        </Alert>
      </Container>
    );
  }

  if (!buildings || buildings.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning" sx={{ mt: 2 }}>
          No buildings found. Please add a building first.
          <Box mt={1}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => navigate('/buildings/new')}
              sx={{ mt: 1 }}
            >
              Add Building
            </Button>
          </Box>
        </Alert>
      </Container>
    );
  }
  
  // Debug: Log the current state
  console.log('Rendering with state:', {
    buildings,
    selectedBuildingId,
    formikValues: formik.values,
    formikErrors: formik.errors,
    formikTouched: formik.touched
  });

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
                  disabled={isLoadingBuildings}
                >
                  {buildings?.map((building) => (
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
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: formik.touched.dueDate && Boolean(formik.errors.dueDate),
                      helperText: formik.touched.dueDate && formik.errors.dueDate
                    }
                  }}
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
              
              {isLoadingWorkOrders && selectedBuildingId && (
                <Box display="flex" alignItems="center" sx={{ my: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" sx={{ ml: 1 }}>Loading work orders...</Typography>
                </Box>
              )}
              
              {isWorkOrdersError && (
                <Alert severity="error" sx={{ my: 2 }}>
                  Error loading work orders: {workOrdersError?.data?.message || 'Unknown error'}
                  <Box mt={1}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => refetchWorkOrders()}
                      sx={{ mt: 1 }}
                    >
                      Retry
                    </Button>
                  </Box>
                </Alert>
              )}

              {(() => {
                if (!formik.values.buildingId) {
                  return (
                    <Alert severity="info">
                      Please select a building to view available work orders.
                    </Alert>
                  );
                }
                
                if (isLoadingWorkOrders) {
                  return (
                    <Box display="flex" justifyContent="center" p={3}>
                      <CircularProgress />
                    </Box>
                  );
                }
                
                if (workOrdersError) {
                  return (
                    <Alert severity="error">
                      Error loading work orders: {workOrdersError?.data?.message || 'Unknown error'}
                    </Alert>
                  );
                }
                
                if (workOrders.length === 0) {
                  return (
                    <Alert severity="info">
                      No unbilled work orders found for this building.
                    </Alert>
                  );
                }
                
                return (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={
                                formik.values.workOrderIds.length > 0 &&
                                formik.values.workOrderIds.length < workOrders.length
                              }
                              checked={
                                workOrders.length > 0 &&
                                formik.values.workOrderIds.length === workOrders.length
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  formik.setFieldValue(
                                    'workOrderIds',
                                    workOrders.map(wo => wo?._id).filter(Boolean)
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
                        {workOrders.map((workOrder) => {
                          if (!workOrder) return null;
                          const workOrderTotal = workOrder?.services?.reduce((sum, service) => {
                            if (!service) return sum;
                            return sum + (Number(service.laborCost) || 0) + (Number(service.materialCost) || 0);
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
                );
              })()}

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

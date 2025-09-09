import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Divider,
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useCreateInvoiceMutation } from '../../features/invoices/invoicesApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';
import { toast } from 'react-toastify';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  building: Yup.string().required('Building is required'),
  workOrders: Yup.array().min(1, 'At least one work order is required'),
  dueDate: Yup.date().required('Due date is required'),
  notes: Yup.string(),
});

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();
  const { data: buildingsData, isLoading: buildingsLoading } = useGetBuildingsQuery();
  const { data: workOrdersData, isLoading: workOrdersLoading } = useGetWorkOrdersQuery();

  const buildings = buildingsData?.data?.buildings || [];
  const workOrders = workOrdersData?.data?.workOrders || [];

  const formik = useFormik({
    initialValues: {
      building: '',
      workOrders: [],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: '',
      tax: 0,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        // Calculate totals
        const subtotal = values.workOrders.reduce((sum, wo) => sum + (wo.totalPrice || 0), 0);
        const total = subtotal + (values.tax || 0);

        const invoiceData = {
          buildingId: values.building,
          workOrderIds: values.workOrders.map(wo => wo.workOrder).filter(id => id),
          dueDate: values.dueDate,
          notes: values.notes,
        };

        await createInvoice(invoiceData).unwrap();
        toast.success('Invoice created successfully!');
        navigate('/invoices');
      } catch (error) {
        console.error('Failed to create invoice:', error);
        const errorMessage = error?.data?.message || error?.message || 'Failed to create invoice';
        toast.error(errorMessage);
      }
    },
  });

  const addWorkOrderLine = () => {
    formik.setFieldValue('workOrders', [
      ...formik.values.workOrders,
      {
        workOrder: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      }
    ]);
  };

  const removeWorkOrderLine = (index) => {
    const newWorkOrders = formik.values.workOrders.filter((_, i) => i !== index);
    formik.setFieldValue('workOrders', newWorkOrders);
  };

  const updateWorkOrderLine = (index, field, value) => {
    const newWorkOrders = [...formik.values.workOrders];
    newWorkOrders[index] = { ...newWorkOrders[index], [field]: value };
    
    // Auto-calculate total price
    if (field === 'quantity' || field === 'unitPrice') {
      newWorkOrders[index].totalPrice = newWorkOrders[index].quantity * newWorkOrders[index].unitPrice;
    }
    
    formik.setFieldValue('workOrders', newWorkOrders);
  };

  const subtotal = formik.values.workOrders.reduce((sum, wo) => sum + (wo.totalPrice || 0), 0);
  const total = subtotal + (formik.values.tax || 0);

  const availableWorkOrders = workOrders.filter(wo => 
    wo.building === formik.values.building && wo.status === 'completed'
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/invoices')}
            sx={{ mr: 2 }}
          >
            Back to Invoices
          </Button>
          <Typography variant="h4" component="h1">
            Create New Invoice
          </Typography>
        </Box>

        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Invoice Details
                  </Typography>

                  <FormControl 
                    fullWidth 
                    margin="normal"
                    error={formik.touched.building && Boolean(formik.errors.building)}
                  >
                    <InputLabel>Building</InputLabel>
                    <Select
                      name="building"
                      value={formik.values.building}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="Building"
                    >
                      {buildings.map((building) => (
                        <MenuItem key={building._id} value={building._id}>
                          {building.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {formik.touched.building && formik.errors.building}
                    </FormHelperText>
                  </FormControl>

                  <DatePicker
                    label="Due Date"
                    value={formik.values.dueDate}
                    onChange={(newValue) => formik.setFieldValue('dueDate', newValue)}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        fullWidth 
                        margin="normal"
                        error={formik.touched.dueDate && Boolean(formik.errors.dueDate)}
                        helperText={formik.touched.dueDate && formik.errors.dueDate}
                      />
                    )}
                  />

                  <TextField
                    fullWidth
                    name="tax"
                    label="Tax Amount ($)"
                    type="number"
                    value={formik.values.tax}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    margin="normal"
                    inputProps={{ min: 0, step: 0.01 }}
                  />

                  <TextField
                    fullWidth
                    name="notes"
                    label="Notes"
                    multiline
                    rows={3}
                    value={formik.values.notes}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    margin="normal"
                  />

                  <Divider sx={{ my: 2 }} />
                  
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Invoice Summary
                    </Typography>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Subtotal:</Typography>
                      <Typography>${subtotal.toFixed(2)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Tax:</Typography>
                      <Typography>${(formik.values.tax || 0).toFixed(2)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" sx={{ fontWeight: 'bold', mt: 1 }}>
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6">${total.toFixed(2)}</Typography>
                    </Box>
                  </Box>

                  <Box mt={3} display="flex" flexDirection="column" gap={1}>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={creating || formik.values.workOrders.length === 0}
                      size="large"
                      startIcon={creating ? <CircularProgress size={16} /> : null}
                    >
                      {creating ? 'Creating Invoice...' : 'Create Invoice'}
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate('/invoices')}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Work Orders
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={addWorkOrderLine}
                      disabled={!formik.values.building}
                    >
                      Add Line Item
                    </Button>
                  </Box>

                  {formik.values.workOrders.length === 0 ? (
                    <Typography color="text.secondary" align="center" py={4}>
                      {!formik.values.building 
                        ? 'Select a building to add work orders'
                        : 'No work order line items added yet'
                      }
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Work Order</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell width={100}>Qty</TableCell>
                            <TableCell width={120}>Unit Price</TableCell>
                            <TableCell width={120}>Total</TableCell>
                            <TableCell width={50}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {formik.values.workOrders.map((workOrderLine, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={workOrderLine.workOrder}
                                    onChange={(e) => updateWorkOrderLine(index, 'workOrder', e.target.value)}
                                    displayEmpty
                                  >
                                    <MenuItem value="">Select Work Order</MenuItem>
                                    {availableWorkOrders.map((wo) => (
                                      <MenuItem key={wo._id} value={wo._id}>
                                        {wo.title || 'Work Order'}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  fullWidth
                                  size="small"
                                  value={workOrderLine.description}
                                  onChange={(e) => updateWorkOrderLine(index, 'description', e.target.value)}
                                  placeholder="Description"
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="number"
                                  value={workOrderLine.quantity}
                                  onChange={(e) => updateWorkOrderLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  inputProps={{ min: 0, step: 1 }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="number"
                                  value={workOrderLine.unitPrice}
                                  onChange={(e) => updateWorkOrderLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  inputProps={{ min: 0, step: 0.01 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  ${(workOrderLine.totalPrice || 0).toFixed(2)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => removeWorkOrderLine(index)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </form>
      </Container>
    </LocalizationProvider>
  );
};

export default CreateInvoice;

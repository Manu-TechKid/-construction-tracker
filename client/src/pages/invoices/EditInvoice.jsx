import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  Typography,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  Switch,
  FormControlLabel,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Assignment as WorkOrderIcon,
  AttachMoney as MoneyIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

import {
  useGetInvoiceQuery,
  useUpdateInvoiceMutation
} from '../../features/invoices/invoicesApiSlice';

const validationSchema = Yup.object({
  // Basic invoice info
  invoiceNumber: Yup.string().required('Invoice number is required'),
  dueDate: Yup.date().required('Due date is required'),
  notes: Yup.string(),

  // Tax settings
  taxType: Yup.string().oneOf(['none', 'commercial', 'residential']),
  customTaxRate: Yup.number().when('taxType', {
    is: 'custom',
    then: (schema) => schema.min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%'),
    otherwise: (schema) => schema.optional()
  }),

  // Manual overrides
  manualSubtotal: Yup.number().min(0, 'Subtotal cannot be negative'),
  manualTax: Yup.number().min(0, 'Tax cannot be negative'),
  manualTotal: Yup.number().min(0, 'Total cannot be negative'),
  discountAmount: Yup.number().min(0, 'Discount cannot be negative'),
  additionalFees: Yup.number().min(0, 'Additional fees cannot be negative'),
});

const EditInvoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: invoiceData, isLoading, error } = useGetInvoiceQuery(id);
  const [updateInvoice, { isLoading: isUpdating }] = useUpdateInvoiceMutation();

  const [lineItems, setLineItems] = useState([]);
  const [useManualAmounts, setUseManualAmounts] = useState(false);
  const [taxSettings, setTaxSettings] = useState({
    taxType: 'commercial', // commercial = no tax, residential = with tax
    customTaxRate: 10,
  });

  const formik = useFormik({
    initialValues: {
      invoiceNumber: '',
      dueDate: new Date(),
      notes: '',
      status: 'draft',
      taxType: 'commercial',
      customTaxRate: 10,
      manualSubtotal: 0,
      manualTax: 0,
      manualTotal: 0,
      discountAmount: 0,
      additionalFees: 0,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        // Calculate final amounts
        let subtotal = useManualAmounts ? values.manualSubtotal : lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        const discount = values.discountAmount || 0;
        const additionalFees = values.additionalFees || 0;

        // Apply discount
        subtotal = Math.max(0, subtotal - discount);

        // Add additional fees
        subtotal += additionalFees;

        // Calculate tax
        let tax = 0;
        if (values.taxType === 'residential') {
          tax = subtotal * 0.10; // 10% for residential
        } else if (values.taxType === 'custom') {
          tax = subtotal * (values.customTaxRate / 100);
        }
        // commercial = no tax

        // Use manual tax if provided
        if (useManualAmounts && values.manualTax > 0) {
          tax = values.manualTax;
        }

        const total = subtotal + tax;

        // Use manual total if provided and manual amounts are enabled
        const finalTotal = useManualAmounts && values.manualTotal > 0 ? values.manualTotal : total;

        const updateData = {
          invoiceNumber: values.invoiceNumber,
          dueDate: values.dueDate instanceof Date ? values.dueDate.toISOString() : new Date(values.dueDate).toISOString(),
          notes: values.notes,
          status: values.status,
          subtotal: subtotal,
          tax: tax,
          total: finalTotal,
          workOrders: lineItems.map(item => ({
            workOrder: item.workOrder,
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.totalPrice || 0,
            totalPrice: item.totalPrice || 0
          })),
          // Store tax settings for future reference
          taxSettings: {
            taxType: values.taxType,
            customTaxRate: values.customTaxRate,
          }
        };

        await updateInvoice({ id, ...updateData }).unwrap();
        toast.success('Invoice updated successfully');
        navigate('/invoices');
      } catch (error) {
        console.error('Failed to update invoice:', error);
        const errorMessage = error?.data?.message || error?.message || 'Failed to update invoice';
        toast.error(errorMessage);
      }
    },
  });

  // Load invoice data when available
  useEffect(() => {
    if (invoiceData?.data) {
      const invoice = invoiceData.data;

      // Set basic form values
      formik.setValues({
        invoiceNumber: invoice.invoiceNumber || '',
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : new Date(),
        notes: invoice.notes || '',
        status: invoice.status || 'draft',
        taxType: invoice.taxSettings?.taxType || 'commercial',
        customTaxRate: invoice.taxSettings?.customTaxRate || 10,
        manualSubtotal: invoice.subtotal || 0,
        manualTax: invoice.tax || 0,
        manualTotal: invoice.total || 0,
        discountAmount: 0, // Will be calculated from difference
        additionalFees: 0, // Will be calculated from difference
      });

      // Load line items
      if (invoice.workOrders && invoice.workOrders.length > 0) {
        setLineItems(invoice.workOrders.map(item => ({
          workOrder: item.workOrder?._id || item.workOrder,
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.totalPrice || 0,
          totalPrice: item.totalPrice || 0,
        })));
      }

      // Check if manual amounts are being used (if stored amounts differ significantly from calculated)
      const calculatedSubtotal = invoice.workOrders?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0;
      const storedSubtotal = invoice.subtotal || 0;
      if (Math.abs(calculatedSubtotal - storedSubtotal) > 0.01) {
        setUseManualAmounts(true);
      }
    }
  }, [invoiceData, formik]);

  const addLineItem = () => {
    setLineItems([...lineItems, {
      workOrder: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    }]);
  };

  const updateLineItem = (index, field, value) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-calculate total price if quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = (updatedItems[index].quantity || 0) * (updatedItems[index].unitPrice || 0);
    }

    setLineItems(updatedItems);
  };

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    if (useManualAmounts) {
      return formik.values.manualSubtotal || 0;
    }
    return lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const discount = formik.values.discountAmount || 0;
    const additionalFees = formik.values.additionalFees || 0;
    const adjustedSubtotal = Math.max(0, subtotal - discount) + additionalFees;

    if (formik.values.taxType === 'residential') {
      return adjustedSubtotal * 0.10;
    } else if (formik.values.taxType === 'custom') {
      return adjustedSubtotal * (formik.values.customTaxRate / 100);
    }
    return 0; // commercial or none
  };

  const calculateTotal = () => {
    if (useManualAmounts && formik.values.manualTotal > 0) {
      return formik.values.manualTotal;
    }

    const subtotal = calculateSubtotal();
    const discount = formik.values.discountAmount || 0;
    const additionalFees = formik.values.additionalFees || 0;
    const adjustedSubtotal = Math.max(0, subtotal - discount) + additionalFees;
    const tax = useManualAmounts && formik.values.manualTax > 0 ? formik.values.manualTax : calculateTax();

    return adjustedSubtotal + tax;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">Error loading invoice: {error?.data?.message || 'Unknown error'}</Typography>
      </Box>
    );
  }

  const invoice = invoiceData?.data;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          {/* Header */}
          <Box display="flex" alignItems="center" mb={3}>
            <IconButton onClick={() => navigate('/invoices')} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              Edit Invoice {invoice?.invoiceNumber}
            </Typography>
          </Box>

          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={3}>
              {/* Basic Invoice Information */}
              <Grid item xs={12} md={8}>
                <Card>
                  <CardHeader title="Invoice Information" />
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Invoice Number"
                          value={formik.values.invoiceNumber}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          name="invoiceNumber"
                          error={formik.touched.invoiceNumber && Boolean(formik.errors.invoiceNumber)}
                          helperText={formik.touched.invoiceNumber && formik.errors.invoiceNumber}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
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
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="Notes"
                          value={formik.values.notes}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          name="notes"
                          error={formik.touched.notes && Boolean(formik.errors.notes)}
                          helperText={formik.touched.notes && formik.errors.notes}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Line Items */}
                <Card sx={{ mt: 3 }}>
                  <CardHeader
                    title="Line Items"
                    action={
                      <Button startIcon={<AddIcon />} onClick={addLineItem}>
                        Add Item
                      </Button>
                    }
                  />
                  <CardContent>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell align="right">Unit Price</TableCell>
                            <TableCell align="right">Total</TableCell>
                            <TableCell align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {lineItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <TextField
                                  fullWidth
                                  size="small"
                                  value={item.description}
                                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                  placeholder="Item description"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <TextField
                                  size="small"
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  inputProps={{ min: 0, step: 1 }}
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <TextField
                                  size="small"
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  inputProps={{ min: 0, step: 0.01 }}
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                  }}
                                  sx={{ width: 100 }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="medium">
                                  ${item.totalPrice?.toFixed(2) || '0.00'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => removeLineItem(index)}
                                >
                                  <RemoveIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                          {lineItems.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                <Typography color="text.secondary">
                                  No line items. Click "Add Item" to add work orders or services.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Invoice Summary & Tax Settings */}
              <Grid item xs={12} md={4}>
                {/* Manual Amount Override */}
                <Card sx={{ mb: 3 }}>
                  <CardHeader title="Amount Override" />
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={useManualAmounts}
                          onChange={(e) => setUseManualAmounts(e.target.checked)}
                        />
                      }
                      label="Use Manual Amounts"
                    />
                    {useManualAmounts && (
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Manual Subtotal"
                            type="number"
                            value={formik.values.manualSubtotal}
                            onChange={formik.handleChange}
                            name="manualSubtotal"
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Manual Tax"
                            type="number"
                            value={formik.values.manualTax}
                            onChange={formik.handleChange}
                            name="manualTax"
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Manual Total"
                            type="number"
                            value={formik.values.manualTotal}
                            onChange={formik.handleChange}
                            name="manualTotal"
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        </Grid>
                      </Grid>
                    )}
                  </CardContent>
                </Card>

                {/* Tax Settings */}
                <Card sx={{ mb: 3 }}>
                  <CardHeader title="Tax Settings" />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Tax Type</InputLabel>
                          <Select
                            value={formik.values.taxType}
                            onChange={formik.handleChange}
                            name="taxType"
                            label="Tax Type"
                          >
                            <MenuItem value="none">No Tax</MenuItem>
                            <MenuItem value="commercial">Commercial (No Tax)</MenuItem>
                            <MenuItem value="residential">Residential (10% Tax)</MenuItem>
                            <MenuItem value="custom">Custom Rate</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      {formik.values.taxType === 'custom' && (
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Custom Tax Rate (%)"
                            type="number"
                            value={formik.values.customTaxRate}
                            onChange={formik.handleChange}
                            name="customTaxRate"
                            inputProps={{ min: 0, max: 100, step: 0.01 }}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                          />
                        </Grid>
                      )}

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Discount Amount"
                          type="number"
                          value={formik.values.discountAmount}
                          onChange={formik.handleChange}
                          name="discountAmount"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          inputProps={{ min: 0, step: 0.01 }}
                          helperText="Subtract from subtotal"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Additional Fees"
                          type="number"
                          value={formik.values.additionalFees}
                          onChange={formik.handleChange}
                          name="additionalFees"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          inputProps={{ min: 0, step: 0.01 }}
                          helperText="Add to subtotal"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Invoice Summary */}
                <Card>
                  <CardHeader title="Invoice Summary" />
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography>Subtotal:</Typography>
                      <Typography>${calculateSubtotal().toFixed(2)}</Typography>
                    </Box>

                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography>Tax ({formik.values.taxType === 'residential' ? '10%' : formik.values.taxType === 'custom' ? `${formik.values.customTaxRate}%` : '0%'}):</Typography>
                      <Typography>${calculateTax().toFixed(2)}</Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6" color="primary">${calculateTotal().toFixed(2)}</Typography>
                    </Box>

                    <Box mt={3}>
                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        startIcon={isUpdating ? <CircularProgress size={20} /> : <SaveIcon />}
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Saving...' : 'Save Invoice'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default EditInvoice;

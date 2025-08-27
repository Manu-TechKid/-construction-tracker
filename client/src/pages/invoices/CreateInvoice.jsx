import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Alert,
  Divider,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetUnbilledWorkOrdersQuery, useCreateInvoiceMutation } from '../../features/invoices/invoicesApiSlice';

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedWorkOrders, setSelectedWorkOrders] = useState([]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { data: buildingsData } = useGetBuildingsQuery();
  const { data: workOrdersData, isLoading: workOrdersLoading } = useGetUnbilledWorkOrdersQuery(
    selectedBuilding,
    { skip: !selectedBuilding }
  );
  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();

  const buildings = buildingsData?.data?.buildings || [];
  const workOrders = workOrdersData?.data?.workOrders || [];

  const handleWorkOrderToggle = (workOrderId) => {
    setSelectedWorkOrders(prev => 
      prev.includes(workOrderId)
        ? prev.filter(id => id !== workOrderId)
        : [...prev, workOrderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedWorkOrders.length === workOrders.length) {
      setSelectedWorkOrders([]);
    } else {
      setSelectedWorkOrders(workOrders.map(wo => wo._id));
    }
  };

  const calculateTotals = () => {
    const selectedWOs = workOrders.filter(wo => selectedWorkOrders.includes(wo._id));
    const subtotal = selectedWOs.reduce((sum, wo) => {
      return sum + (wo.totalCost || wo.laborCost + wo.materialsCost || 0);
    }, 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const handleSubmit = async () => {
    if (!selectedBuilding) {
      setError('Please select a building');
      return;
    }
    
    if (selectedWorkOrders.length === 0) {
      setError('Please select at least one work order');
      return;
    }

    try {
      const invoiceData = {
        buildingId: selectedBuilding,
        workOrderIds: selectedWorkOrders,
        dueDate: dueDate.toISOString(),
        notes,
      };

      await createInvoice(invoiceData).unwrap();
      navigate('/invoices');
    } catch (error) {
      setError('Failed to create invoice: ' + (error.data?.message || error.message));
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
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

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Invoice Details */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Invoice Details
                </Typography>
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>Building *</InputLabel>
                  <Select
                    value={selectedBuilding}
                    onChange={(e) => {
                      setSelectedBuilding(e.target.value);
                      setSelectedWorkOrders([]);
                    }}
                    label="Building *"
                  >
                    {buildings.map((building) => (
                      <MenuItem key={building._id} value={building._id}>
                        {building.name} - {building.address}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <DatePicker
                  label="Due Date"
                  value={dueDate}
                  onChange={(newValue) => setDueDate(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth margin="normal" />
                  )}
                />

                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  margin="normal"
                />

                {/* Invoice Summary */}
                {selectedWorkOrders.length > 0 && (
                  <Box mt={3}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Invoice Summary
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography>Subtotal:</Typography>
                      <Typography>${subtotal.toFixed(2)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography>Tax (10%):</Typography>
                      <Typography>${tax.toFixed(2)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6">${total.toFixed(2)}</Typography>
                    </Box>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleSubmit}
                      disabled={creating}
                      size="large"
                    >
                      {creating ? 'Creating Invoice...' : 'Save Invoice'}
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate('/invoices')}
                      disabled={creating}
                      sx={{ mt: 1 }}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Work Orders Selection */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Unbilled Work Orders
                  </Typography>
                  {workOrders.length > 0 && (
                    <Button onClick={handleSelectAll} size="small">
                      {selectedWorkOrders.length === workOrders.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </Box>

                {!selectedBuilding ? (
                  <Typography color="text.secondary" align="center" py={4}>
                    Please select a building to view unbilled work orders
                  </Typography>
                ) : workOrdersLoading ? (
                  <Typography align="center" py={4}>
                    Loading work orders...
                  </Typography>
                ) : workOrders.length === 0 ? (
                  <Typography color="text.secondary" align="center" py={4}>
                    No unbilled work orders found for this building
                  </Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedWorkOrders.length === workOrders.length}
                              indeterminate={
                                selectedWorkOrders.length > 0 && 
                                selectedWorkOrders.length < workOrders.length
                              }
                              onChange={handleSelectAll}
                            />
                          </TableCell>
                          <TableCell>Work Order</TableCell>
                          <TableCell>Apartment</TableCell>
                          <TableCell>Service</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Cost</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {workOrders.map((workOrder) => (
                          <TableRow key={workOrder._id} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedWorkOrders.includes(workOrder._id)}
                                onChange={() => handleWorkOrderToggle(workOrder._id)}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {workOrder.workType} - {workOrder.workSubType}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(workOrder.createdAt).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {workOrder.apartmentNumber || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {workOrder.workType}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {workOrder.workSubType}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="success.main">
                                {workOrder.status}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                ${(workOrder.totalCost || workOrder.laborCost + workOrder.materialsCost || 0).toFixed(2)}
                              </Typography>
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
      </Box>
    </LocalizationProvider>
  );
};

export default CreateInvoice;

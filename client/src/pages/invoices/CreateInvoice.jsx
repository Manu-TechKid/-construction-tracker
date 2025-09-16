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

  const formik = useFormik({
    initialValues: {
      buildingId: '',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: '',
      workOrderIds: []
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const invoiceData = {
          ...values,
          workOrderIds: selectedWorkOrders.map(wo => wo._id),
          totalAmount: calculateTotal()
        };
        
        await createInvoice(invoiceData).unwrap();
        toast.success('Invoice created successfully!');
        navigate('/invoices');
      } catch (error) {
        console.error('Error creating invoice:', error);
        toast.error('Failed to create invoice');
      }
    }
  });

  const calculateTotal = () => {
    return selectedWorkOrders.reduce((total, wo) => {
      return total + (wo.actualCost || wo.estimatedCost || 0);
    }, 0);
  };

  const handleWorkOrderToggle = (workOrder) => {
    const isSelected = selectedWorkOrders.find(wo => wo._id === workOrder._id);
    if (isSelected) {
      setSelectedWorkOrders(selectedWorkOrders.filter(wo => wo._id !== workOrder._id));
    } else {
      setSelectedWorkOrders([...selectedWorkOrders, workOrder]);
    }
  };

  const handleBuildingChange = (buildingId) => {
    setSelectedBuildingId(buildingId);
    formik.setFieldValue('buildingId', buildingId);
    setSelectedWorkOrders([]);
  };

  if (isLoadingBuildings) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (buildingsError) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          Error loading buildings: {buildingsError.message}
        </Alert>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/invoices')}
            variant="outlined"
          >
            Back to Invoices
          </Button>
          <Typography variant="h4">Create Invoice</Typography>
        </Box>

        <form onSubmit={formik.handleSubmit}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Invoice Details
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
                <FormControl fullWidth error={formik.touched.buildingId && Boolean(formik.errors.buildingId)}>
                  <InputLabel>Building</InputLabel>
                  <Select
                    name="buildingId"
                    value={formik.values.buildingId}
                    onChange={(e) => handleBuildingChange(e.target.value)}
                    onBlur={formik.handleBlur}
                    label="Building"
                  >
                    {buildings.map((building) => (
                      <MenuItem key={building._id} value={building._id}>
                        {building.name} - {building.address}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.buildingId && formik.errors.buildingId && (
                    <Typography variant="caption" color="error">
                      {formik.errors.buildingId}
                    </Typography>
                  )}
                </FormControl>

                <DatePicker
                  label="Due Date"
                  value={formik.values.dueDate}
                  onChange={(value) => formik.setFieldValue('dueDate', value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      error={formik.touched.dueDate && Boolean(formik.errors.dueDate)}
                      helperText={formik.touched.dueDate && formik.errors.dueDate}
                    />
                  )}
                />
              </Box>

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

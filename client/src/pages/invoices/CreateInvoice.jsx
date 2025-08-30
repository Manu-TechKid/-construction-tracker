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
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useCreateInvoiceMutation } from '../../features/invoices/invoicesApiSlice';
import { toast } from 'react-toastify';

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [notes, setNotes] = useState('');
  
  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();

  const handleSubmit = async () => {
    try {
      const invoiceData = {
        dueDate,
        notes
      };

      await createInvoice(invoiceData).unwrap();
      toast.success('Invoice created successfully!');
      navigate('/invoices');
    } catch (error) {
      console.error('Failed to create invoice:', error);
      const errorMessage = error?.data?.message || error?.message || 'Failed to create invoice';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    navigate('/invoices');
  };

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

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Invoice Details
                </Typography>

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

                <Box mt={3} display="flex" flexDirection="column" gap={1}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSubmit}
                    disabled={creating}
                    size="large"
                    startIcon={creating ? <CircularProgress size={16} /> : null}
                  >
                    {creating ? 'Creating Invoice...' : 'Save Invoice'}
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleCancel}
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
                <Typography variant="h6">
                  Invoice Preview
                </Typography>
                <Typography color="text.secondary" align="center" py={4}>
                  Invoice functionality will be implemented based on requirements
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default CreateInvoice;

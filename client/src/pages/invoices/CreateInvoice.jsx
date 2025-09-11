import React from 'react';
import {
  Box,
  Container,
  Typography,
  Alert,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const CreateInvoice = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/invoices')}
        >
          Back to Invoices
        </Button>
        <Typography variant="h4" component="h1">
          Create Invoice
        </Typography>
      </Box>

      <Alert severity="info">
        <Typography variant="h6" gutterBottom>
          This feature is temporarily unavailable.
        </Typography>
        <Typography>
          The work order module is currently under maintenance. Please check back later to create invoices from work orders.
        </Typography>
      </Alert>
    </Container>
  );
};

export default CreateInvoice;

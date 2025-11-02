import React, { forwardRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar
} from '@mui/material';
import {
  Business as BuildingIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Receipt as InvoiceIcon,
  QrCode as QrCodeIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

const ProfessionalInvoiceTemplate = forwardRef(({ invoice, companyInfo }, ref) => {
  const defaultCompanyInfo = {
    name: 'DSJ Construction & Services LLC',
    address: '651 Pullman Pl',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20877',
    phone: '(301) 123-4567',
    email: 'info@servicesdsj.com',
    website: 'www.servicesdsj.com',
    logo: 'https://res.cloudinary.com/dwqxiigpd/image/upload/v1756186310/dsj-logo_mb3npa.jpg'
  };

  const company = { ...defaultCompanyInfo, ...companyInfo };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'sent': return 'info';
      case 'accepted': return 'primary';
      case 'overdue': return 'error';
      case 'draft': return 'default';
      default: return 'warning';
    }
  };

  const calculateSubtotal = () => {
    return invoice.lineItems?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || invoice.subtotal || 0;
  };

  const calculateTotalDiscount = () => {
    return invoice.totalDiscount || 0;
  };

  const calculateTax = () => {
    return invoice.tax || 0;
  };

  const calculateTotal = () => {
    return invoice.total || (calculateSubtotal() - calculateTotalDiscount() + calculateTax() + (invoice.shippingCharge || 0));
  };

  return (
    <Paper 
      ref={ref}
      sx={{ 
        p: 4, 
        maxWidth: '900px', 
        margin: '0 auto',
        backgroundColor: '#ffffff',
        boxShadow: 'none',
        border: '1px solid #e0e0e0',
        fontFamily: 'Arial, sans-serif',
        '@media print': {
          boxShadow: 'none',
          border: 'none',
          p: 2
        }
      }}
    >
      {/* Header with Logo and Company Info */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          {/* Left: Logo and Company Info */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
              <Box
                component="img"
                src={company.logo}
                alt="DSJ Logo"
                sx={{ 
                  width: 60, 
                  height: 60,
                  objectFit: 'contain'
                }}
              />
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ color: '#4A90E2', mb: 0.5, fontSize: '1.5rem' }}>
                  {company.name}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
                  Professional Construction & Renovation Services
                </Typography>
              </Box>
            </Box>
            <Box sx={{ mt: 2, fontSize: '0.875rem', color: '#333' }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                Phone: {company.phone} | Email: {company.email}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                {company.address}, {company.city}, {company.state} {company.zipCode}
              </Typography>
            </Box>
          </Grid>
          
          {/* Right: Invoice Title */}
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography 
                variant="h3" 
                fontWeight="bold" 
                sx={{ 
                  fontSize: '2rem',
                  mb: 2,
                  color: '#333'
                }}
              >
                INVOICE
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Invoice Details Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, pb: 1, borderBottom: '2px solid #4A90E2' }}>
          Invoice Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Invoice Number:</Typography>
            <Typography variant="body2" fontWeight="bold">{invoice.invoiceNumber || '5733'}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Invoice Date:</Typography>
            <Typography variant="body2" fontWeight="bold">
              {format(new Date(invoice.invoiceDate || invoice.createdAt), 'MMMM dd, yyyy')}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Due Date:</Typography>
            <Typography variant="body2" fontWeight="bold">
              {format(new Date(invoice.dueDate), 'MMMM dd, yyyy')}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Status:</Typography>
            <Chip 
              label={invoice.status?.toUpperCase() || 'SENT'} 
              color={getStatusColor(invoice.status)}
              size="small"
              sx={{ fontWeight: 'bold', height: '24px' }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Bill To Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, pb: 1, borderBottom: '2px solid #4A90E2' }}>
          Bill To
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
              {invoice.client?.companyName || invoice.building?.name || 'Client Name'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#666' }}>
              {invoice.building?.address || invoice.client?.address?.street || 'Address'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#666' }}>
              {invoice.building?.city || invoice.client?.address?.city || 'City'}, {invoice.client?.address?.state || 'MD'} {invoice.client?.address?.zipCode || ''}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Services Performed Table */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, pb: 1, borderBottom: '2px solid #4A90E2' }}>
          Services Performed
        </Typography>
        <TableContainer sx={{ border: '1px solid #e0e0e0' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#2C3E50' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.813rem', py: 1.5 }}>Description</TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.813rem', py: 1.5 }}>Quantity</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.813rem', py: 1.5 }}>Unit Price</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.813rem', py: 1.5 }}>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.lineItems && invoice.lineItems.length > 0 ? (
                invoice.lineItems.map((item, index) => (
                  <TableRow key={index} sx={{ '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' } }}>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.875rem' }}>
                        {item.description}
                      </Typography>
                      {item.serviceCategory && item.serviceSubcategory && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {item.serviceCategory} - {item.serviceSubcategory}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{item.quantity}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{formatCurrency(item.unitPrice)}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
                        {formatCurrency(item.totalPrice)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' } }}>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.875rem' }}>
                      General Building - Replacement (Act. General Building)
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>1</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{formatCurrency(invoice.subtotal || invoice.total)}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.5 }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
                      {formatCurrency(invoice.subtotal || invoice.total)}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Financial Summary */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Box sx={{ width: { xs: '100%', md: '300px' } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, pb: 1, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Subtotal:</Typography>
            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
              {formatCurrency(calculateSubtotal())}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, pb: 1, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Tax:</Typography>
            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
              {formatCurrency(calculateTax())}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, bgcolor: '#f5f5f5', px: 2, borderRadius: 1 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>TOTAL AMOUNT DUE:</Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.1rem', color: '#4A90E2' }}>
              {formatCurrency(calculateTotal())}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Payment Terms */}
      <Box sx={{ mb: 3, bgcolor: '#FFF9E6', p: 2, borderRadius: 1, border: '1px solid #FFE082' }}>
        <Typography variant="body2" fontWeight="bold" sx={{ mb: 1, fontSize: '0.875rem' }}>
          Payment Terms:
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.813rem' }}>
          Payment is due within 30 days of the invoice date. Thank you for your business!
        </Typography>
        {invoice.notes && (
          <Typography variant="body2" sx={{ fontSize: '0.813rem', mt: 1 }}>
            {invoice.notes}
          </Typography>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ textAlign: 'center', pt: 3, borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
          This invoice was generated electronically and is valid without signature.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
          For questions about this invoice, please contact DSJ Construction & Services LLC at {company.phone} | November 1, 2025
        </Typography>
      </Box>
    </Paper>
  );
});

ProfessionalInvoiceTemplate.displayName = 'ProfessionalInvoiceTemplate';

export default ProfessionalInvoiceTemplate;

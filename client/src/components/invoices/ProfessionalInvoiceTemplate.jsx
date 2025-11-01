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
      {/* Header with Logo */}
      <Box sx={{ mb: 3, pb: 2, borderBottom: '2px solid #4A90E2' }}>
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
              <Box
                component="img"
                src={company.logo}
                alt="DSJ Logo"
                sx={{ 
                  width: 80, 
                  height: 'auto',
                  objectFit: 'contain'
                }}
              />
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ color: '#4A90E2', mb: 0.5 }}>
                  {company.name}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                  Professional Construction & Renovation Services
                </Typography>
              </Box>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                {company.address}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                {company.city}, {company.state} {company.zipCode} USA
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                Phone: {company.phone}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                Email: {company.email}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography 
                variant="h3" 
                fontWeight="bold" 
                sx={{ 
                  color: '#4A90E2',
                  fontSize: '2.5rem',
                  letterSpacing: '0.05em',
                  mb: 2
                }}
              >
                INVOICE
              </Typography>
              
              {/* Client Information */}
              <Box sx={{ mb: 3, textAlign: { xs: 'left', md: 'right' } }}>
                <Typography variant="body2" color="text.secondary"><strong>To:</strong></Typography>
                <Typography variant="h6" fontWeight="bold">
                  {invoice.client?.companyName || invoice.building?.name || 'Client'}
                </Typography>
                {invoice.client?.contactName && (
                  <Typography variant="body2">{invoice.client.contactName}</Typography>
                )}
                {invoice.client?.email && (
                  <Typography variant="body2">{invoice.client.email}</Typography>
                )}
                {invoice.client?.phone && (
                  <Typography variant="body2">{invoice.client.phone}</Typography>
                )}
                {invoice.client?.address && (
                  <Box>
                    {invoice.client.address.street && (
                      <Typography variant="body2">{invoice.client.address.street}</Typography>
                    )}
                    {(invoice.client.address.city || invoice.client.address.state || invoice.client.address.zipCode) && (
                      <Typography variant="body2">
                        {[invoice.client.address.city, invoice.client.address.state, invoice.client.address.zipCode]
                          .filter(Boolean).join(', ')}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
              
              {/* Invoice Details Boxes */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ 
                  bgcolor: '#E8F4FD', 
                  p: 2, 
                  borderRadius: 1,
                  mb: 1,
                  border: '1px solid #4A90E2'
                }}>
                  <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem' }}>
                    Invoice Number
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{ color: '#4A90E2' }}>
                    {invoice.invoiceNumber || '5469'}
                  </Typography>
                </Box>
                <Box sx={{ 
                  bgcolor: '#E8F4FD', 
                  p: 2, 
                  borderRadius: 1,
                  mb: 1,
                  border: '1px solid #4A90E2'
                }}>
                  <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem' }}>
                    Invoice Date
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {format(new Date(invoice.invoiceDate || invoice.createdAt), 'MMMM dd, yyyy')}
                  </Typography>
                </Box>
                <Box sx={{ 
                  bgcolor: '#E8F4FD', 
                  p: 2, 
                  borderRadius: 1,
                  border: '1px solid #4A90E2'
                }}>
                  <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem' }}>
                    Due Date
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {format(new Date(invoice.dueDate), 'MMMM dd, yyyy')}
                  </Typography>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    label={invoice.status?.toUpperCase() || 'PAID'} 
                    color={getStatusColor(invoice.status)}
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Bill To Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Box sx={{ bgcolor: '#E8F4FD', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#4A90E2', mb: 1 }}>
              BILL TO:
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {invoice.client?.companyName || invoice.building?.name || 'Client Name'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {invoice.client?.address?.street || invoice.building?.address || 'Address'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {invoice.client?.address?.city || invoice.building?.city || 'City'}, {invoice.client?.address?.state || 'State'} {invoice.client?.address?.zipCode || ''}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Services Performed Table */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#333' }}>
          Services Performed
        </Typography>
        <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0', boxShadow: 'none' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#37474F' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>Description</TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>Quantity</TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>Unit Price</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.lineItems && invoice.lineItems.length > 0 ? (
                invoice.lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {item.description}
                      </Typography>
                      {item.serviceCategory && item.serviceSubcategory && (
                        <Typography variant="caption" color="text.secondary">
                          {item.serviceCategory} - {item.serviceSubcategory}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {item.quantity}
                    </TableCell>
                    <TableCell align="center">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(item.totalPrice)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      Apt 336 - Grab bar install (Apt. 336)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Professional construction services
                    </Typography>
                  </TableCell>
                  <TableCell align="center">1</TableCell>
                  <TableCell align="center">
                    {formatCurrency(invoice.subtotal || invoice.total)}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(invoice.subtotal || invoice.total)}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              
              {/* Subtotal Row */}
              <TableRow>
                <TableCell colSpan={3} sx={{ borderTop: '2px solid #e0e0e0', pt: 2, textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    SUBTOTAL:
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ borderTop: '2px solid #e0e0e0', pt: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(calculateSubtotal())}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} sx={{ borderBottom: 'none', textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    TAX:
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ borderBottom: 'none' }}>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(calculateTax())}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} sx={{ borderBottom: 'none', textAlign: 'right' }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ color: '#4A90E2' }}>
                    TOTAL:
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ borderBottom: 'none' }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ color: '#4A90E2' }}>
                    {formatCurrency(calculateTotal())}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Summary Section */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            {/* Terms & Conditions */}
            <Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Terms & Condition:
              </Typography>
              <Typography variant="body2" paragraph>
                1. Bills should be pay within 30 days
              </Typography>
              <Typography variant="body2" paragraph>
                2. no exchange policy
              </Typography>
              {invoice.termsAndConditions && (
                <Typography variant="body2" paragraph>
                  {invoice.termsAndConditions}
                </Typography>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            {/* Financial Summary */}
            <Box sx={{ textAlign: 'right' }}>
              <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1">Estimated Discount</Typography>
                <Typography variant="body1">
                  - {formatCurrency(calculateTotalDiscount())}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1">Shipping Charge</Typography>
                <Typography variant="body1">
                  + {formatCurrency(invoice.shippingCharge || 0)}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1">Received Amount</Typography>
                <Typography variant="body1">
                  - {formatCurrency(invoice.amountPaid || 0)}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1">Due Amount</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatCurrency(calculateTotal() - (invoice.amountPaid || 0))}
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h5" fontWeight="bold">
                  Total
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {formatCurrency(calculateTotal())}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Payment Information */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            {invoice.notes && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Notes:
                </Typography>
                <Typography variant="body2">
                  {invoice.notes}
                </Typography>
              </Box>
            )}
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Pay Using UPI:
              </Typography>
              <Box sx={{ 
                width: 120, 
                height: 120, 
                bgcolor: 'grey.200', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto',
                borderRadius: 1
              }}>
                <QrCodeIcon sx={{ fontSize: 80, color: 'grey.600' }} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Scan to pay via UPI
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Footer */}
      <Divider sx={{ mb: 3 }} />
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Thank you for choosing {company.name} for your construction needs.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          For questions about this invoice, please contact us at {company.phone} or {company.email}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Invoice generated on {format(new Date(), 'MMM dd, yyyy')}
        </Typography>
      </Box>
    </Paper>
  );
});

ProfessionalInvoiceTemplate.displayName = 'ProfessionalInvoiceTemplate';

export default ProfessionalInvoiceTemplate;

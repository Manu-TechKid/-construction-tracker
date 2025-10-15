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
    name: 'LKC HOME SERVICES LLC',
    address: '350 K ST NW',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22304',
    phone: '(571) 409-2313',
    email: 'lkchomeservices21@gmail.com',
    website: 'https://lkchomeserviceslkchomeservices.com',
    logo: '/api/placeholder/120/80'
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
        maxWidth: '800px', 
        margin: '0 auto',
        backgroundColor: 'white',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        '@media print': {
          boxShadow: 'none',
          p: 2
        }
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar
                src={company.logo}
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: 'primary.main',
                  fontSize: '2rem',
                  fontWeight: 'bold'
                }}
              >
                {company.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {company.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Professional Construction Services
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant="body2"><strong>From:</strong></Typography>
              <Typography variant="body2">{company.name}</Typography>
              <Typography variant="body2">{company.address}</Typography>
              <Typography variant="body2">{company.city}, {company.state} {company.zipCode}</Typography>
              <Typography variant="body2">📞 {company.phone}</Typography>
              <Typography variant="body2">✉️ {company.email}</Typography>
              {company.website && (
                <Typography variant="body2">🌐 {company.website}</Typography>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography variant="h2" fontWeight="bold" color="primary" gutterBottom>
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
              
              {/* Invoice Details */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Invoice #:</strong> {invoice.invoiceNumber || 'DRAFT'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Date of Invoice:</strong> {format(new Date(invoice.invoiceDate || invoice.createdAt), 'MMM dd, yyyy')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Due Date:</strong> {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
                <Chip 
                  label={invoice.status?.toUpperCase() || 'DRAFT'} 
                  color={getStatusColor(invoice.status)}
                  size="small"
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Line Items Table */}
      <Box sx={{ mb: 4 }}>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>Sr.No</strong></TableCell>
                <TableCell><strong>Product Name</strong></TableCell>
                <TableCell align="center"><strong>Rate/Unit</strong></TableCell>
                <TableCell align="center"><strong>Discount</strong></TableCell>
                <TableCell align="center"><strong>Qty.</strong></TableCell>
                <TableCell align="center"><strong>Tax</strong></TableCell>
                <TableCell align="right"><strong>Amount</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.lineItems && invoice.lineItems.length > 0 ? (
                invoice.lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {item.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.serviceCategory && item.serviceSubcategory && 
                          `${item.serviceCategory} - ${item.serviceSubcategory}`}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell align="center">
                      {item.discount > 0 ? (
                        item.discountType === 'percentage' ? 
                          `${item.discount}%` : 
                          formatCurrency(item.discount)
                      ) : '0.0%'}
                    </TableCell>
                    <TableCell align="center">
                      {item.quantity}
                    </TableCell>
                    <TableCell align="center">
                      {item.taxable && item.taxRate > 0 ? `${item.taxRate}%` : '0.0%'}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(item.totalPrice)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell>1</TableCell>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      Professional Service
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Construction and maintenance services
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {formatCurrency(invoice.subtotal || invoice.total)}
                  </TableCell>
                  <TableCell align="center">0.0%</TableCell>
                  <TableCell align="center">1</TableCell>
                  <TableCell align="center">0.0%</TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" fontWeight="bold">
                      {formatCurrency(invoice.subtotal || invoice.total)}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              
              {/* Subtotal Row */}
              <TableRow>
                <TableCell colSpan={4} sx={{ borderBottom: 'none', pt: 2 }}>
                  <Typography variant="body1" fontWeight="bold">
                    Sub-total Amount
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ borderBottom: 'none', pt: 2 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(calculateSubtotal())}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ borderBottom: 'none', pt: 2 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {calculateTotalDiscount() > 0 ? formatCurrency(calculateTotalDiscount()) : '$ 0.00'}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ borderBottom: 'none', pt: 2 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {invoice.lineItems?.length || 1}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ borderBottom: 'none', pt: 2 }}>
                  <Typography variant="body1" fontWeight="bold">
                    0.0%
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ borderBottom: 'none', pt: 2 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(calculateSubtotal())}
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

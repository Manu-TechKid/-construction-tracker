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
  Schedule as DurationIcon,
  Assignment as ProjectIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

const EstimateInvoiceView = forwardRef(({ estimate, companyInfo }, ref) => {
  const defaultCompanyInfo = {
    name: 'DSJ Construction & Services LLC',
    address: '803 Palmetto St',
    city: 'McLean',
    state: 'VA',
    zipCode: '22101',
    phone: '(571) 409-2313',
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
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'draft': return 'default';
      default: return 'info';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
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
      <Box sx={{ mb: 3, pb: 2, borderBottom: '2px solid #4A90E2' }}>
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box
                component="img"
                src={company.logo}
                alt="DSJ Logo"
                sx={{ 
                  width: 120, 
                  height: 'auto',
                  objectFit: 'contain'
                }}
              />
              <Box>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {company.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Professional Construction Services
                </Typography>
              </Box>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                {company.address}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                {company.city}, {company.state} {company.zipCode} / USA
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                {company.phone}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                {company.email}
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
                  letterSpacing: '0.05em'
                }}
                gutterBottom
              >
                INVOICE
              </Typography>
              <Box sx={{ 
                bgcolor: '#4A90E2', 
                color: 'white', 
                p: 2, 
                borderRadius: 1,
                display: 'inline-block',
                minWidth: '200px'
              }}>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  INVOICE NUMBER
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {estimate._id?.slice(-6).toUpperCase() || '5736'}
                </Typography>
              </Box>
              <Box sx={{ 
                bgcolor: '#5BA3F5', 
                color: 'white', 
                p: 2, 
                borderRadius: 1,
                display: 'inline-block',
                minWidth: '200px',
                mt: 1
              }}>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  DUE DATE
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {format(new Date(estimate.proposedStartDate || estimate.visitDate || estimate.createdAt), 'MM/dd/yyyy')}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* BILL TO and SHIP TO Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Box sx={{ bgcolor: '#E8F4FD', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#4A90E2', mb: 1 }}>
              BILL TO:
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {estimate.building?.name || 'Client Name'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {estimate.building?.address || 'Address'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {estimate.building?.city || 'McLean'}, VA {estimate.building?.zipCode || '22101'}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ bgcolor: '#E8F4FD', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#4A90E2', mb: 1 }}>
              SHIP TO:
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {estimate.building?.name || 'Client Name'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {estimate.building?.address || 'Address'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {estimate.building?.city || 'McLean'}, VA {estimate.building?.zipCode || '22101'}
            </Typography>
            {estimate.apartmentNumber && (
              <Typography variant="body2" sx={{ fontSize: '0.875rem', mt: 0.5 }}>
                Unit: {estimate.apartmentNumber}
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Cost Breakdown */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon color="primary" />
          Cost Breakdown
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ 
                bgcolor: 'grey.100', 
                color: 'primary.main', 
                fontWeight: 'bold', 
                fontSize: '1rem', 
                textTransform: 'uppercase' 
              }}>
                {estimate.lineItems && estimate.lineItems.length > 0 ? (
                  <>
                    <TableCell><strong>Service Date</strong></TableCell>
                    <TableCell><strong>Product/Service</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell align="right"><strong>Qty</strong></TableCell>
                    <TableCell align="right"><strong>Rate</strong></TableCell>
                    <TableCell align="right"><strong>Amount</strong></TableCell>
                    <TableCell align="right"><strong>Tax</strong></TableCell>
                    <TableCell align="right"><strong>Total</strong></TableCell>
                  </>
                ) : (
                  <>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell align="right"><strong>Amount</strong></TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {estimate.lineItems && estimate.lineItems.length > 0 ? (
                <>
                  {estimate.lineItems.map((item, index) => {
                    const itemAmount = parseFloat(item.amount) || 0;
                    const tax = parseFloat(item.tax) || 0;
                    const taxAmount = item.taxType === 'percentage' ? (itemAmount * tax / 100) : tax;
                    const itemTotal = itemAmount + taxAmount;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          {format(new Date(item.serviceDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.productService}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {item.description}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{item.qty}</TableCell>
                        <TableCell align="right">{formatCurrency(item.rate)}</TableCell>
                        <TableCell align="right">{formatCurrency(itemAmount)}</TableCell>
                        <TableCell align="right">
                          {tax > 0 ? (
                            <Typography variant="body2">
                              {tax}{item.taxType === 'percentage' ? '%' : '$'}
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                ({formatCurrency(taxAmount)})
                              </Typography>
                            </Typography>
                          ) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(itemTotal)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Subtotal */}
                  <TableRow>
                    <TableCell colSpan={5} />
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="medium">
                        Subtotal
                      </Typography>
                    </TableCell>
                    <TableCell align="right" colSpan={2}>
                      <Typography variant="body1">
                        {formatCurrency(estimate.lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0))}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  
                  {/* Tax */}
                  <TableRow>
                    <TableCell colSpan={5} />
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="medium">
                        Total Tax
                      </Typography>
                    </TableCell>
                    <TableCell align="right" colSpan={2}>
                      <Typography variant="body1">
                        {formatCurrency(estimate.lineItems.reduce((sum, item) => {
                          const amount = parseFloat(item.amount) || 0;
                          const tax = parseFloat(item.tax) || 0;
                          return sum + (item.taxType === 'percentage' ? (amount * tax / 100) : tax);
                        }, 0))}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  
                  {/* Total */}
                  <TableRow>
                    <TableCell colSpan={5} />
                    <TableCell align="right" sx={{ borderTop: '2px solid', borderColor: 'primary.main', pt: 2 }}>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        TOTAL ESTIMATE
                      </Typography>
                    </TableCell>
                    <TableCell align="right" colSpan={2} sx={{ borderTop: '2px solid', borderColor: 'primary.main', pt: 2 }}>
                      <Typography variant="h5" fontWeight="bold" color="primary">
                        {formatCurrency(estimate.lineItems.reduce((sum, item) => {
                          const amount = parseFloat(item.amount) || 0;
                          const tax = parseFloat(item.tax) || 0;
                          const taxAmount = item.taxType === 'percentage' ? (amount * tax / 100) : tax;
                          return sum + amount + taxAmount;
                        }, 0))}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </>
              ) : (
                <>
                  <TableRow>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {estimate.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Professional service including materials and labor
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" fontWeight="bold">
                        {formatCurrency(estimate.estimatedPrice)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  
                  {/* Subtotal */}
                  <TableRow>
                    <TableCell sx={{ borderBottom: 'none', pt: 2 }}>
                      <Typography variant="body1" fontWeight="medium">
                        Subtotal
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ borderBottom: 'none', pt: 2 }}>
                      <Typography variant="body1">
                        {formatCurrency(estimate.estimatedPrice)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  
                  {/* Tax (if applicable) */}
                  <TableRow>
                    <TableCell sx={{ borderBottom: 'none' }}>
                      <Typography variant="body2" color="text.secondary">
                        Tax (if applicable)
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ borderBottom: 'none' }}>
                      <Typography variant="body2" color="text.secondary">
                        Included
                      </Typography>
                    </TableCell>
                  </TableRow>
                  
                  {/* Total */}
                  <TableRow>
                    <TableCell sx={{ borderTop: '2px solid', borderColor: 'primary.main', pt: 2 }}>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        TOTAL ESTIMATE
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ borderTop: '2px solid', borderColor: 'primary.main', pt: 2 }}>
                      <Typography variant="h5" fontWeight="bold" color="primary">
                        {formatCurrency(estimate.estimatedPrice)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Terms and Conditions */}
      <Box sx={{ mb: 4, p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Terms & Conditions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" paragraph>
              • This estimate is valid for 30 days from the date issued
            </Typography>
            <Typography variant="body2" paragraph>
              • Final pricing may vary based on actual conditions found during work
            </Typography>
            <Typography variant="body2" paragraph>
              • All work will be performed according to industry standards
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" paragraph>
              • Client must provide access to work areas as scheduled
            </Typography>
            <Typography variant="body2" paragraph>
              • Payment terms: Net 30 days from completion
            </Typography>
            <Typography variant="body2" paragraph>
              • Additional work requires separate authorization
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Footer */}
      <Divider sx={{ mb: 3 }} />
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Thank you for considering {company.name} for your construction needs.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          For questions about this estimate, please contact us at {company.phone} or {company.email}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Estimate generated on {format(new Date(), 'MMM dd, yyyy')} • Valid until {format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'MMM dd, yyyy')}
        </Typography>
      </Box>
    </Paper>
  );
});

EstimateInvoiceView.displayName = 'EstimateInvoiceView';

export default EstimateInvoiceView;

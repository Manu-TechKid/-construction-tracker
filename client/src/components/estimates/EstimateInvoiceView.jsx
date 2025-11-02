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
          
          {/* Right: Project Estimate Title */}
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
                Project Estimate
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Project Information Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, pb: 1, borderBottom: '2px solid #4A90E2' }}>
          Project Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Estimate Number:</Typography>
            <Typography variant="body2" fontWeight="bold">{estimate._id?.slice(-8).toUpperCase() || 'PROJ1234567890'}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Project Title:</Typography>
            <Typography variant="body2" fontWeight="bold">{estimate.title || 'Construction Project'}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Building:</Typography>
            <Typography variant="body2" fontWeight="bold">{estimate.building?.name || 'Building Name'}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Created By:</Typography>
            <Typography variant="body2" fontWeight="bold">{estimate.createdBy?.name || 'DSJ Admin'}</Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Project Description */}
      {estimate.description && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, pb: 1, borderBottom: '2px solid #4A90E2' }}>
            Project Description
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#333', whiteSpace: 'pre-wrap' }}>
            {estimate.description}
          </Typography>
        </Box>
      )}

      {/* Financial Summary */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, pb: 1, borderBottom: '2px solid #4A90E2' }}>
          Financial Summary
        </Typography>
        
        <TableContainer sx={{ border: '1px solid #e0e0e0' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#2C3E50' }}>
                {estimate.lineItems && estimate.lineItems.length > 0 ? (
                  <>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.813rem', py: 1.5 }}>Service Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.813rem', py: 1.5 }}>Product/Service</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.813rem', py: 1.5 }}>Description</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.813rem', py: 1.5 }}>Qty</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.813rem', py: 1.5 }}>Rate</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.813rem', py: 1.5 }}>Amount</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.813rem', py: 1.5 }}>Description</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.813rem', py: 1.5 }}>Amount</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {estimate.lineItems && estimate.lineItems.length > 0 ? (
                estimate.lineItems.map((item, index) => {
                  const itemAmount = parseFloat(item.amount) || 0;
                  
                  return (
                    <TableRow key={index} sx={{ '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' } }}>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {format(new Date(item.serviceDate), 'MM/dd/yyyy')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.875rem' }}>
                          {item.productService}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#666' }}>
                          {item.description}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{item.qty}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{formatCurrency(item.rate)}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
                          {formatCurrency(itemAmount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' } }}>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.875rem' }}>
                      {estimate.title || 'Construction Services'}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#666' }}>
                      Professional service including materials and labor
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.5 }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
                      {formatCurrency(estimate.estimatedPrice)}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Total Cost Summary */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Box sx={{ width: { xs: '100%', md: '300px' } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, pb: 1, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Estimated Cost:</Typography>
            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
              {formatCurrency(
                estimate.lineItems && estimate.lineItems.length > 0
                  ? estimate.lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                  : estimate.estimatedPrice
              )}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Additional Notes */}
      {(estimate.clientNotes || estimate.internalNotes) && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, pb: 1, borderBottom: '2px solid #4A90E2' }}>
            Additional Notes
          </Typography>
          {estimate.clientNotes && (
            <Box sx={{ mb: 2, bgcolor: '#FFF9E6', p: 2, borderRadius: 1, border: '1px solid #FFE082' }}>
              <Typography variant="body2" sx={{ fontSize: '0.813rem', whiteSpace: 'pre-wrap' }}>
                {estimate.clientNotes}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ textAlign: 'center', pt: 3, borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
          No written or oral intent may be available for this estimate.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
          For questions about this estimate, please contact DSJ Construction & Services LLC at {company.phone}
        </Typography>
      </Box>
    </Paper>
  );
});

EstimateInvoiceView.displayName = 'EstimateInvoiceView';

export default EstimateInvoiceView;

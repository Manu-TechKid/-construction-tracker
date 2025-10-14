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
          <Grid item xs={12} md={8}>
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
              <Typography variant="body2">{company.address}</Typography>
              <Typography variant="body2">{company.city}, {company.state} {company.zipCode}</Typography>
              <Typography variant="body2">📞 {company.phone}</Typography>
              <Typography variant="body2">✉️ {company.email}</Typography>
              {company.website && (
                <Typography variant="body2">🌐 {company.website}</Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography variant="h3" fontWeight="bold" color="primary" gutterBottom>
                PROJECT ESTIMATE
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" color="text.secondary">
                  Estimate #{estimate._id?.slice(-6).toUpperCase() || 'DRAFT'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Date: {format(new Date(estimate.visitDate || estimate.createdAt), 'MMM dd, yyyy')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
                <Chip 
                  label={estimate.status?.toUpperCase() || 'DRAFT'} 
                  color={getStatusColor(estimate.status)}
                  size="small"
                />
                <Chip 
                  label={`${estimate.priority?.toUpperCase() || 'MEDIUM'} PRIORITY`} 
                  color={getPriorityColor(estimate.priority)}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Project Information */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ProjectIcon color="primary" />
          Project Details
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {estimate.title}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, lineHeight: 1.6 }}>
                {estimate.description}
              </Typography>
            </Box>
            
            {estimate.clientNotes && (
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Special Requirements:
                </Typography>
                <Typography variant="body2">
                  {estimate.clientNotes}
                </Typography>
              </Box>
            )}
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1, color: 'primary.contrastText' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Project Information
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BuildingIcon fontSize="small" />
                <Box>
                  <Typography variant="body2" fontWeight="bold">Building:</Typography>
                  <Typography variant="body2">{estimate.building?.name || 'N/A'}</Typography>
                </Box>
              </Box>
              
              {estimate.apartmentNumber && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" fontWeight="bold">Unit:</Typography>
                  <Typography variant="body2">{estimate.apartmentNumber}</Typography>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CalendarIcon fontSize="small" />
                <Box>
                  <Typography variant="body2" fontWeight="bold">Visit Date:</Typography>
                  <Typography variant="body2">
                    {format(new Date(estimate.visitDate || estimate.createdAt), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DurationIcon fontSize="small" />
                <Box>
                  <Typography variant="body2" fontWeight="bold">Duration:</Typography>
                  <Typography variant="body2">{estimate.estimatedDuration || 1} day(s)</Typography>
                </Box>
              </Box>
              
              {estimate.proposedStartDate && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight="bold">Start Date:</Typography>
                  <Typography variant="body2">
                    {format(new Date(estimate.proposedStartDate), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Cost Breakdown */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon color="primary" />
          Cost Breakdown
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell align="right"><strong>Amount</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
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

import { forwardRef } from 'react';
import { Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
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



  return (
    <Paper 
      ref={ref}
      sx={{ 
        p: 3, 
        maxWidth: '850px', 
        margin: '0 auto',
        backgroundColor: '#ffffff',
        boxShadow: 'none',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '12px',
        '@media print': {
          boxShadow: 'none',
          p: 2
        }
      }}
    >
      {/* Header */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Box
              component="img"
              src={company.logo}
              alt="DSJ Logo"
              sx={{ width: 80, height: 80, mb: 1 }}
            />
            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '18px', color: '#4A90E2', mb: 0.5 }}>
              {company.name}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', color: '#666', mb: 1 }}>
              {company.address}, {company.city}, {company.state} {company.zipCode} / USA
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', color: '#666' }}>
              {company.phone} | Email: {company.email}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Estimate Title */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: '24px', mb: 1 }}>
          Project Estimate
        </Typography>
      </Box>

      {/* Project Info */}
      <Box sx={{ mb: 3, bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ fontSize: '10px', color: '#666' }}>Estimate Number:</Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
              {estimate._id?.slice(-8).toUpperCase() || 'PROJ1234567890'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ fontSize: '10px', color: '#666' }}>Project Title:</Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
              {estimate.title || 'Construction Project'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ fontSize: '10px', color: '#666' }}>Building:</Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
              {estimate.building?.name || 'Building Name'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ fontSize: '10px', color: '#666' }}>Created By:</Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
              {estimate.createdBy?.name || 'DSJ Admin'}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {estimate.description && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#FFF9E6', borderRadius: 1, border: '1px solid #FFE082' }}>
          <Typography variant="subtitle2" sx={{ fontSize: '11px', fontWeight: 'bold', mb: 1 }}>Project Description:</Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {estimate.description}
          </Typography>
        </Box>
      )}

      {/* Services Table */}
      <Table sx={{ mb: 3, border: '1px solid #ddd' }} size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#2C3E50' }}>
            {estimate.lineItems && estimate.lineItems.length > 0 ? (
              <>
                <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>DATE</TableCell>
                <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>SERVICE</TableCell>
                <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>DESCRIPTION</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>QTY</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>RATE</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>AMOUNT</TableCell>
              </>
            ) : (
              <>
                <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>DESCRIPTION</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>ESTIMATED COST</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {estimate.lineItems && estimate.lineItems.length > 0 ? (
            estimate.lineItems.map((item, index) => (
              <TableRow key={index} sx={{ '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' } }}>
                <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {format(new Date(item.serviceDate), 'MM/dd/yyyy')}
                </TableCell>
                <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {item.productService}
                </TableCell>
                <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {item.description}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {item.qty}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {formatCurrency(item.rate)}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>
                  {formatCurrency(parseFloat(item.amount) || 0)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' } }}>
              <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                {estimate.title || 'Construction Services'}
                <Typography variant="caption" sx={{ display: 'block', fontSize: '9px', color: '#666', mt: 0.5 }}>
                  Professional service including materials and labor
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>
                {formatCurrency(estimate.estimatedPrice)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Total */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Box sx={{ width: '250px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, bgcolor: '#1976D2', color: 'white', px: 2 }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>ESTIMATED COST:</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>
              {formatCurrency(
                estimate.lineItems && estimate.lineItems.length > 0
                  ? estimate.lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                  : estimate.estimatedPrice
              )}
            </Typography>
          </Box>
        </Box>
      </Box>

      {estimate.clientNotes && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#FFF9E6', borderRadius: 1, border: '1px solid #FFE082' }}>
          <Typography variant="subtitle2" sx={{ fontSize: '11px', fontWeight: 'bold', mb: 1 }}>Additional Notes:</Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', whiteSpace: 'pre-wrap' }}>
            {estimate.clientNotes}
          </Typography>
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ textAlign: 'center', mt: 4, pt: 2, borderTop: '1px solid #ddd' }}>
        <Typography sx={{ fontSize: '9px', color: '#666' }}>
          No written or oral intent may be available for this estimate. For questions, please contact DSJ Construction & Services LLC at {company.phone}
        </Typography>
      </Box>
    </Paper>
  );
});

EstimateInvoiceView.displayName = 'EstimateInvoiceView';

export default EstimateInvoiceView;

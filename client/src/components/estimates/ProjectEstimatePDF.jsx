import React, { forwardRef } from 'react';
import { Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { format } from 'date-fns';

const ProjectEstimatePDF = forwardRef(({ estimate, companyInfo }, ref) => {
  const company = {
    name: 'DSJ Construction & Services LLC',
    address: '651 Pullman Pl',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20877',
    phone: '(301) 123-4567',
    email: 'info@dsjconstruction.com',
    logo: 'https://res.cloudinary.com/dwqxiigpd/image/upload/v1756186310/dsj-logo_mb3npa.jpg',
    ...companyInfo
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const totalCost = estimate.lineItems && estimate.lineItems.length > 0
    ? estimate.lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
    : estimate.estimatedPrice || 0;

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
        '@media print': {
          boxShadow: 'none',
          p: 2
        }
      }}
    >
      {/* Header with Logo */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box
          component="img"
          src={company.logo}
          alt="DSJ Logo"
          sx={{ width: 100, height: 100, mb: 1.5 }}
        />
        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '20px', color: '#4A90E2', mb: 0.5 }}>
          {company.name}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '11px', color: '#666', mb: 0.5 }}>
          Professional Construction & Renovation Services
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '11px', color: '#666' }}>
          {company.address}, {company.city}, {company.state} {company.zipCode}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '11px', color: '#666' }}>
          Phone: {company.phone} | Email: {company.email}
        </Typography>
      </Box>

      {/* Estimate Title */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: '28px', mb: 1 }}>
          Project Estimate
        </Typography>
      </Box>

      {/* Project Information */}
      <Box sx={{ mb: 3, bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ fontSize: '10px', color: '#666', display: 'block' }}>Estimate Number:</Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
              {estimate._id?.slice(-8).toUpperCase() || 'EST-' + Date.now().toString().slice(-8)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ fontSize: '10px', color: '#666', display: 'block' }}>Date:</Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
              {format(new Date(estimate.createdAt || Date.now()), 'MM/dd/yyyy')}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ fontSize: '10px', color: '#666', display: 'block' }}>Project Title:</Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
              {estimate.title || 'Construction Project'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ fontSize: '10px', color: '#666', display: 'block' }}>Building:</Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
              {estimate.building?.name || 'N/A'}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Project Description */}
      {estimate.description && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#FFF9E6', borderRadius: 1, border: '1px solid #FFE082' }}>
          <Typography variant="subtitle2" sx={{ fontSize: '11px', fontWeight: 'bold', mb: 1, color: '#856404' }}>
            Project Description:
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#333' }}>
            {estimate.description}
          </Typography>
        </Box>
      )}

      {/* Services/Items Table */}
      <Table sx={{ mb: 3, border: '1px solid #ddd' }} size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#2C3E50' }}>
            {estimate.lineItems && estimate.lineItems.length > 0 ? (
              <>
                <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>DATE</TableCell>
                <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>SERVICE</TableCell>
                <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>DESCRIPTION</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>QTY</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>RATE</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>AMOUNT</TableCell>
              </>
            ) : (
              <>
                <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>DESCRIPTION</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>ESTIMATED COST</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {estimate.lineItems && estimate.lineItems.length > 0 ? (
            estimate.lineItems.map((item, index) => (
              <TableRow key={index} sx={{ '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' } }}>
                <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {format(new Date(item.serviceDate || estimate.createdAt), 'MM/dd/yyyy')}
                </TableCell>
                <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {item.productService || 'Service'}
                </TableCell>
                <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {item.description}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {item.qty || 1}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {formatCurrency(item.rate || 0)}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>
                  {formatCurrency(parseFloat(item.amount) || 0)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' } }}>
              <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                <Typography variant="body2" sx={{ fontSize: '10px', fontWeight: 'medium' }}>
                  {estimate.title || 'Construction Services'}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '9px', color: '#666', display: 'block', mt: 0.5 }}>
                  Professional service including materials and labor
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>
                {formatCurrency(estimate.estimatedPrice || 0)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Total Cost */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Box sx={{ width: '280px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, bgcolor: '#1976D2', color: 'white', px: 2, borderRadius: 1 }}>
            <Typography sx={{ fontSize: '15px', fontWeight: 'bold' }}>ESTIMATED COST:</Typography>
            <Typography sx={{ fontSize: '15px', fontWeight: 'bold' }}>
              {formatCurrency(totalCost)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Additional Notes */}
      {estimate.clientNotes && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#FFF9E6', borderRadius: 1, border: '1px solid #FFE082' }}>
          <Typography variant="subtitle2" sx={{ fontSize: '11px', fontWeight: 'bold', mb: 1, color: '#856404' }}>
            Additional Notes:
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', whiteSpace: 'pre-wrap', color: '#333' }}>
            {estimate.clientNotes}
          </Typography>
        </Box>
      )}

      {/* Terms */}
      <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ fontSize: '11px', fontWeight: 'bold', mb: 1 }}>
          Terms & Conditions:
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '9px', color: '#666', lineHeight: 1.5 }}>
          • This estimate is valid for 30 days from the date issued<br />
          • Final pricing may vary based on actual conditions found during work<br />
          • All work will be performed according to industry standards<br />
          • Payment terms: Net 30 days from completion
        </Typography>
      </Box>

      {/* Footer */}
      <Box sx={{ textAlign: 'center', mt: 4, pt: 2, borderTop: '1px solid #ddd' }}>
        <Typography sx={{ fontSize: '9px', color: '#666' }}>
          No written or oral intent may be available for this estimate. For questions, please contact {company.name} at {company.phone}
        </Typography>
      </Box>
    </Paper>
  );
});

ProjectEstimatePDF.displayName = 'ProjectEstimatePDF';

export default ProjectEstimatePDF;

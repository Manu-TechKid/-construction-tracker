import React, { forwardRef } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { format } from 'date-fns';

/**
 * CLEAN PROFESSIONAL PROJECT ESTIMATE PDF
 * Matches the style from image 3 with:
 * - DSJ logo in TOP RIGHT corner
 * - Company info on TOP LEFT (text only, no box)
 * - Clean table layout
 * - Professional estimate sections
 */

const CleanEstimatePDF = forwardRef(({ estimate, companyInfo }, ref) => {
  // Default company info
  const company = companyInfo || {
    name: 'DSJ Construction & Services LLC',
    address: '123 Main Street',
    city: 'McLean',
    state: 'VA',
    zip: '22102',
    phone: '(555) 123-4567',
    email: 'info@dsjconstruction.com'
  };

  // Calculate totals
  const subtotal = estimate?.items?.reduce((sum, item) => {
    const itemTotal = (item.quantity || 0) * (item.unitPrice || item.price || item.estimatedCost || 0);
    return sum + itemTotal;
  }, 0) || estimate?.estimatedCost || estimate?.totalCost || 0;

  const tax = estimate?.tax || 0;
  const total = estimate?.totalAmount || (subtotal + tax);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'MMMM dd, yyyy');
    } catch (error) {
      return 'N/A';
    }
  };

  return (
    <Box
      ref={ref}
      sx={{
        width: '100%',
        maxWidth: '850px',
        margin: '0 auto',
        padding: '40px',
        backgroundColor: '#ffffff',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        '@media print': {
          padding: '20px',
          maxWidth: '100%'
        }
      }}
    >
      {/* HEADER: Company Info LEFT + Logo RIGHT */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        {/* LEFT: Company Info (Text Only) */}
        <Box>
          <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#333', mb: 0.5 }}>
            {company.name}
          </Typography>
          <Typography sx={{ fontSize: '9px', color: '#666', lineHeight: 1.4 }}>
            {company.address}
          </Typography>
          <Typography sx={{ fontSize: '9px', color: '#666', lineHeight: 1.4 }}>
            {company.city}, {company.state} {company.zip}
          </Typography>
          <Typography sx={{ fontSize: '9px', color: '#666', lineHeight: 1.4, mt: 0.5 }}>
            Phone: {company.phone}
          </Typography>
          <Typography sx={{ fontSize: '9px', color: '#666', lineHeight: 1.4 }}>
            Email: {company.email}
          </Typography>
        </Box>

        {/* RIGHT: DSJ Logo */}
        <Box sx={{ textAlign: 'right' }}>
          <img
            src="https://res.cloudinary.com/dwqxiigpd/image/upload/v1756186310/dsj-logo_mb3npa.jpg"
            alt="DSJ Logo"
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'contain'
            }}
            onError={(e) => {
              // Fallback if Cloudinary fails
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<div style="width:80px;height:80px;background:#1976d2;color:white;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;border-radius:4px;">DSJ</div>';
            }}
          />
        </Box>
      </Box>

      {/* ESTIMATE TITLE */}
      <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#333', mb: 3 }}>
        PROJECT ESTIMATE
      </Typography>

      {/* ESTIMATE INFO */}
      <Box sx={{ mb: 3, pb: 2, borderBottom: '2px solid #1976d2' }}>
        <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: '9px', color: '#666', mb: 0.5 }}>Estimate Number:</Typography>
            <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#333' }}>
              {estimate?.estimateNumber || 'N/A'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '9px', color: '#666', mb: 0.5 }}>Status:</Typography>
            <Typography sx={{ 
              fontSize: '10px', 
              fontWeight: 600, 
              color: estimate?.status === 'approved' ? '#4caf50' : '#ff9800',
              textTransform: 'uppercase'
            }}>
              {estimate?.status || 'DRAFT'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '9px', color: '#666', mb: 0.5 }}>Created Date:</Typography>
            <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#333' }}>
              {formatDate(estimate?.createdAt || estimate?.date)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: '9px', color: '#666', mb: 0.5 }}>Project Title:</Typography>
          <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#333' }}>
            {estimate?.title || estimate?.projectTitle || 'N/A'}
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ fontSize: '9px', color: '#666', mb: 0.5 }}>Building:</Typography>
          <Typography sx={{ fontSize: '10px', color: '#333' }}>
            {estimate?.building?.name || 'N/A'}
          </Typography>
          {estimate?.building?.address && (
            <Typography sx={{ fontSize: '9px', color: '#666' }}>
              {estimate.building.address}
            </Typography>
          )}
        </Box>

        {estimate?.apartment && (
          <Box sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: '9px', color: '#666', mb: 0.5 }}>Apartment:</Typography>
            <Typography sx={{ fontSize: '10px', color: '#333' }}>
              {estimate.apartment}
            </Typography>
          </Box>
        )}

        {estimate?.createdBy && (
          <Box sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: '9px', color: '#666', mb: 0.5 }}>Created By:</Typography>
            <Typography sx={{ fontSize: '10px', color: '#333' }}>
              {estimate.createdBy.name || estimate.createdBy.email || 'N/A'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* PROJECT DESCRIPTION */}
      {estimate?.description && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#1976d2', mb: 1 }}>
            Project Description
          </Typography>
          <Box sx={{ 
            backgroundColor: '#FFF9E6', 
            padding: '12px', 
            borderRadius: '4px',
            border: '1px solid #FFE082'
          }}>
            <Typography sx={{ fontSize: '9px', color: '#666', lineHeight: 1.6 }}>
              {estimate.description}
            </Typography>
          </Box>
        </Box>
      )}

      {/* COST BREAKDOWN TABLE */}
      <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#1976d2', mb: 1 }}>
        Financial Summary
      </Typography>
      
      <TableContainer component={Paper} elevation={0} sx={{ mb: 3, border: '1px solid #e0e0e0' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#2C3E50' }}>
              <TableCell sx={{ color: '#ffffff', fontSize: '10px', fontWeight: 600, py: 1.5 }}>
                ITEM
              </TableCell>
              <TableCell sx={{ color: '#ffffff', fontSize: '10px', fontWeight: 600 }}>
                DESCRIPTION
              </TableCell>
              <TableCell align="center" sx={{ color: '#ffffff', fontSize: '10px', fontWeight: 600 }}>
                QTY
              </TableCell>
              <TableCell align="right" sx={{ color: '#ffffff', fontSize: '10px', fontWeight: 600 }}>
                UNIT PRICE
              </TableCell>
              <TableCell align="right" sx={{ color: '#ffffff', fontSize: '10px', fontWeight: 600 }}>
                TOTAL
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {estimate?.items?.map((item, index) => {
              const itemTotal = (item.quantity || 0) * (item.unitPrice || item.price || item.estimatedCost || 0);
              return (
                <TableRow key={index} sx={{ '&:nth-of-type(even)': { backgroundColor: '#f9f9f9' } }}>
                  <TableCell sx={{ fontSize: '9px', color: '#333', py: 1.5 }}>
                    {item.name || item.item || `Item ${index + 1}`}
                  </TableCell>
                  <TableCell sx={{ fontSize: '9px', color: '#666', maxWidth: '250px' }}>
                    {item.description || item.details || ''}
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: '9px', color: '#333' }}>
                    {item.quantity || 1}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '9px', color: '#333' }}>
                    {formatCurrency(item.unitPrice || item.price || item.estimatedCost || 0)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '9px', fontWeight: 600, color: '#333' }}>
                    {formatCurrency(itemTotal)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* TOTALS */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Box sx={{ minWidth: '250px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: '10px', color: '#666' }}>Estimated Cost:</Typography>
            <Typography sx={{ fontSize: '10px', color: '#333' }}>{formatCurrency(subtotal)}</Typography>
          </Box>
          {estimate?.estimatedPrice && estimate.estimatedPrice !== subtotal && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '10px', color: '#666' }}>Estimated Price:</Typography>
              <Typography sx={{ fontSize: '10px', color: '#333' }}>{formatCurrency(estimate.estimatedPrice)}</Typography>
            </Box>
          )}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            pt: 1, 
            borderTop: '2px solid #2C3E50',
            backgroundColor: '#E8F5E9',
            padding: '8px',
            borderRadius: '4px',
            mt: 1
          }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#333' }}>
              Total Amount:
            </Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#2e7d32' }}>
              {formatCurrency(total)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ADDITIONAL NOTES */}
      {estimate?.notes && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#1976d2', mb: 1 }}>
            Additional Notes
          </Typography>
          <Box sx={{ 
            backgroundColor: '#FFF9E6', 
            padding: '12px', 
            borderRadius: '4px',
            border: '1px solid #FFE082'
          }}>
            <Typography sx={{ fontSize: '9px', color: '#666', lineHeight: 1.6 }}>
              {estimate.notes}
            </Typography>
          </Box>
        </Box>
      )}

      {/* PROJECT TIMELINE */}
      {(estimate?.estimatedDuration || estimate?.targetYear) && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#1976d2', mb: 1 }}>
            Project Timeline
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            {estimate?.estimatedDuration && (
              <Box>
                <Typography sx={{ fontSize: '9px', color: '#666', mb: 0.5 }}>Estimated Duration:</Typography>
                <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#333' }}>
                  {estimate.estimatedDuration}
                </Typography>
              </Box>
            )}
            {estimate?.targetYear && (
              <Box>
                <Typography sx={{ fontSize: '9px', color: '#666', mb: 0.5 }}>Target Year:</Typography>
                <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#333' }}>
                  {estimate.targetYear}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* TERMS & CONDITIONS */}
      <Box sx={{ 
        backgroundColor: '#f5f5f5', 
        padding: '12px', 
        borderRadius: '4px',
        mb: 2
      }}>
        <Typography sx={{ fontSize: '9px', fontWeight: 600, color: '#333', mb: 1 }}>
          Terms & Conditions:
        </Typography>
        <Typography sx={{ fontSize: '8px', color: '#666', lineHeight: 1.6 }}>
          This estimate is valid for 30 days from the date of issue. Actual costs may vary based on site conditions and material availability. A 50% deposit is required to begin work. Final payment is due upon project completion. All work will be performed in accordance with local building codes and regulations.
        </Typography>
      </Box>

      {/* FOOTER */}
      <Box sx={{ textAlign: 'center', mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
        <Typography sx={{ fontSize: '8px', color: '#999', mb: 0.5 }}>
          This estimate is valid for 30 days from the date of issue
        </Typography>
        <Typography sx={{ fontSize: '8px', color: '#999' }}>
          For questions or concerns, please contact {company.name} at {company.email}
        </Typography>
        <Typography sx={{ fontSize: '8px', color: '#999', mt: 1 }}>
          Generated on {formatDate(new Date())}
        </Typography>
      </Box>
    </Box>
  );
});

CleanEstimatePDF.displayName = 'CleanEstimatePDF';

export default CleanEstimatePDF;

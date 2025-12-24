import { forwardRef } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { format } from 'date-fns';

/**
 * CLEAN PROFESSIONAL INVOICE PDF
 * Matches the style from image 3 with:
 * - DSJ logo in TOP RIGHT corner
 * - Company info on TOP LEFT (text only, no box)
 * - Clean table layout
 * - Blue accent boxes for payment info
 */

const CleanInvoicePDF = forwardRef(({ invoice, companyInfo }, ref) => {
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
  const subtotal = invoice?.lineItems?.reduce((sum, item) => {
    const itemTotal = (item.quantity || 0) * (item.unitPrice || item.price || 0);
    return sum + itemTotal;
  }, 0) || invoice?.subtotal || 0;

  const tax = invoice?.tax || 0;
  const total = invoice?.total || invoice?.totalAmount || (subtotal + tax);

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

      {/* INVOICE TITLE */}
      <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#333', mb: 3 }}>
        INVOICE {invoice?.invoiceNumber || 'N/A'}
      </Typography>

      {/* BILL TO / SHIP TO + PAYMENT BOXES */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {/* LEFT: Bill To / Ship To */}
        <Box sx={{ flex: 1 }}>
          {/* Bill To */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#1976d2', mb: 0.5 }}>
              BILL TO
            </Typography>
            <Typography sx={{ fontSize: '10px', color: '#333', fontWeight: 600 }}>
              {invoice?.building?.name || invoice?.clientName || 'N/A'}
            </Typography>
            <Typography sx={{ fontSize: '9px', color: '#666', lineHeight: 1.4 }}>
              {invoice?.building?.address || invoice?.clientAddress || ''}
            </Typography>
            <Typography sx={{ fontSize: '9px', color: '#666', lineHeight: 1.4 }}>
              {invoice?.building?.city ? `${invoice.building.city}, ${invoice.building.state} ${invoice.building.zipCode}` : ''}
            </Typography>
          </Box>

          {/* Ship To (if different) */}
          {invoice?.shipTo && (
            <Box>
              <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#1976d2', mb: 0.5 }}>
                SHIP TO
              </Typography>
              <Typography sx={{ fontSize: '9px', color: '#666', lineHeight: 1.4 }}>
                {invoice.shipTo}
              </Typography>
            </Box>
          )}
        </Box>

        {/* RIGHT: Payment Info Boxes */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Date Issued */}
          <Box sx={{ 
            backgroundColor: '#E3F2FD', 
            padding: '12px', 
            borderRadius: '4px',
            minWidth: '100px',
            textAlign: 'center'
          }}>
            <Typography sx={{ fontSize: '8px', color: '#666', mb: 0.5 }}>
              DATE ISSUED
            </Typography>
            <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#333' }}>
              {formatDate(invoice?.invoiceDate || invoice?.issueDate)}
            </Typography>
          </Box>

          {/* Please Pay By */}
          <Box sx={{ 
            backgroundColor: '#1976d2', 
            padding: '12px', 
            borderRadius: '4px',
            minWidth: '100px',
            textAlign: 'center'
          }}>
            <Typography sx={{ fontSize: '8px', color: '#ffffff', mb: 0.5 }}>
              PLEASE PAY BY
            </Typography>
            <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#ffffff' }}>
              {formatCurrency(total)}
            </Typography>
          </Box>

          {/* Due Date */}
          <Box sx={{ 
            backgroundColor: '#E3F2FD', 
            padding: '12px', 
            borderRadius: '4px',
            minWidth: '100px',
            textAlign: 'center'
          }}>
            <Typography sx={{ fontSize: '8px', color: '#666', mb: 0.5 }}>
              DUE DATE
            </Typography>
            <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#333' }}>
              {formatDate(invoice?.dueDate)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* SERVICES TABLE */}
      <TableContainer component={Paper} elevation={0} sx={{ mb: 3, border: '1px solid #e0e0e0' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#2C3E50' }}>
              <TableCell sx={{ color: '#ffffff', fontSize: '10px', fontWeight: 600, py: 1.5 }}>
                DATE
              </TableCell>
              <TableCell sx={{ color: '#ffffff', fontSize: '10px', fontWeight: 600 }}>
                ACTIVITY
              </TableCell>
              <TableCell sx={{ color: '#ffffff', fontSize: '10px', fontWeight: 600 }}>
                DESCRIPTION
              </TableCell>
              <TableCell align="center" sx={{ color: '#ffffff', fontSize: '10px', fontWeight: 600 }}>
                QTY
              </TableCell>
              <TableCell align="right" sx={{ color: '#ffffff', fontSize: '10px', fontWeight: 600 }}>
                RATE
              </TableCell>
              <TableCell align="right" sx={{ color: '#ffffff', fontSize: '10px', fontWeight: 600 }}>
                AMOUNT
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoice?.lineItems?.map((item, index) => {
              const itemTotal = (item.quantity || 0) * (item.unitPrice || item.price || 0);
              return (
                <TableRow key={index} sx={{ '&:nth-of-type(even)': { backgroundColor: '#f9f9f9' } }}>
                  <TableCell sx={{ fontSize: '9px', color: '#333', py: 1.5 }}>
                    {formatDate(item.date || invoice?.invoiceDate)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '9px', color: '#333' }}>
                    {item.activity || item.service || 'Service'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '9px', color: '#666', maxWidth: '200px' }}>
                    {item.description || item.details || ''}
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: '9px', color: '#333' }}>
                    {item.quantity || 1}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '9px', color: '#333' }}>
                    {formatCurrency(item.unitPrice || item.price || 0)}
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
            <Typography sx={{ fontSize: '10px', color: '#666' }}>SUBTOTAL</Typography>
            <Typography sx={{ fontSize: '10px', color: '#333' }}>{formatCurrency(subtotal)}</Typography>
          </Box>
          {tax > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '10px', color: '#666' }}>TAX</Typography>
              <Typography sx={{ fontSize: '10px', color: '#333' }}>{formatCurrency(tax)}</Typography>
            </Box>
          )}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            pt: 1, 
            borderTop: '2px solid #2C3E50'
          }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#333' }}>
              TOTAL DUE
            </Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#1976d2' }}>
              {formatCurrency(total)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* PAYMENT TERMS */}
      {invoice?.paymentTerms && (
        <Box sx={{ 
          backgroundColor: '#FFF9E6', 
          padding: '12px', 
          borderRadius: '4px',
          border: '1px solid #FFE082',
          mb: 2
        }}>
          <Typography sx={{ fontSize: '9px', color: '#666', fontWeight: 600, mb: 0.5 }}>
            Payment Terms:
          </Typography>
          <Typography sx={{ fontSize: '9px', color: '#666', lineHeight: 1.4 }}>
            {invoice.paymentTerms}
          </Typography>
        </Box>
      )}

      {/* THANK YOU */}
      <Box sx={{ textAlign: 'center', mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#1976d2', mb: 0.5 }}>
          THANK YOU FOR YOUR BUSINESS!
        </Typography>
        <Typography sx={{ fontSize: '8px', color: '#999' }}>
          For questions about this invoice, please contact {company.email}
        </Typography>
      </Box>
    </Box>
  );
});

CleanInvoicePDF.displayName = 'CleanInvoicePDF';

export default CleanInvoicePDF;

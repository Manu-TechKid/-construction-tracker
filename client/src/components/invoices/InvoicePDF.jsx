import { forwardRef } from 'react';
import { Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { format } from 'date-fns';

const InvoicePDF = forwardRef(({ invoice, companyInfo }, ref) => {
  const company = {
    name: 'DSJ Construction & Services LLC',
    address: '651 Pullman Pl',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20877',
    phone: '(555) 123-4567',
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

  const subtotal = invoice.lineItems?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || invoice.subtotal || 0;
  const tax = invoice.tax || 0;
  const total = invoice.total || (subtotal + tax);

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

      {/* Invoice Title */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: '28px', mb: 1 }}>
          INVOICE {invoice.invoiceNumber || '5736'}
        </Typography>
      </Box>

      {/* Bill To and Ship To */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Box sx={{ bgcolor: '#E3F2FD', p: 2, borderRadius: 1, minHeight: '110px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '11px', color: '#1976D2', mb: 1 }}>
              BILL TO:
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold', mb: 0.5 }}>
              {invoice.client?.companyName || invoice.building?.name || 'Client Name'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '10px', color: '#666' }}>
              {invoice.building?.address || invoice.client?.address?.street || 'Address'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '10px', color: '#666' }}>
              {invoice.building?.city || invoice.client?.address?.city || 'City'}, {invoice.client?.address?.state || 'MD'} {invoice.client?.address?.zipCode || ''}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ bgcolor: '#E3F2FD', p: 2, borderRadius: 1, minHeight: '110px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '11px', color: '#1976D2', mb: 1 }}>
              SHIP TO:
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold', mb: 0.5 }}>
              {invoice.client?.companyName || invoice.building?.name || 'Client Name'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '10px', color: '#666' }}>
              {invoice.building?.address || invoice.client?.address?.street || 'Address'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '10px', color: '#666' }}>
              {invoice.building?.city || invoice.client?.address?.city || 'City'}, {invoice.client?.address?.state || 'MD'} {invoice.client?.address?.zipCode || ''}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Date Boxes */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Box sx={{ bgcolor: '#1976D2', color: 'white', p: 1.5, borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '9px', display: 'block', mb: 0.5 }}>DATE ISSUED</Typography>
            <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 'bold' }}>
              {format(new Date(invoice.invoiceDate || invoice.createdAt), 'MM/dd/yyyy')}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box sx={{ bgcolor: '#42A5F5', color: 'white', p: 1.5, borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '9px', display: 'block', mb: 0.5 }}>PLEASE PAY BY</Typography>
            <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 'bold' }}>
              {format(new Date(invoice.dueDate), 'MM/dd/yyyy')}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box sx={{ bgcolor: '#64B5F6', color: 'white', p: 1.5, borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '9px', display: 'block', mb: 0.5 }}>DUE DATE</Typography>
            <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 'bold' }}>
              {format(new Date(invoice.dueDate), 'MM/dd/yyyy')}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Services Table */}
      <Table sx={{ mb: 3, border: '1px solid #ddd' }} size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#2C3E50' }}>
            <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>DATE</TableCell>
            <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>ACTIVITY</TableCell>
            <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>DESCRIPTION</TableCell>
            <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>QTY</TableCell>
            <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>RATE</TableCell>
            <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1.2, px: 1.5 }}>AMOUNT</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoice.lineItems && invoice.lineItems.length > 0 ? (
            invoice.lineItems.map((item, index) => (
              <TableRow key={index} sx={{ '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' } }}>
                <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {format(new Date(item.createdAt || invoice.createdAt), 'MM/dd/yyyy')}
                </TableCell>
                <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {item.serviceCategory || 'Services'}
                </TableCell>
                <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {item.description}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {item.quantity || 1}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                  {formatCurrency(item.unitPrice || item.totalPrice)}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>
                  {formatCurrency(item.totalPrice)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' } }}>
              <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                {format(new Date(invoice.createdAt), 'MM/dd/yyyy')}
              </TableCell>
              <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>Services</TableCell>
              <TableCell sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                Professional construction services
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>1</TableCell>
              <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                {formatCurrency(subtotal)}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>
                {formatCurrency(subtotal)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Totals */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Box sx={{ width: '280px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #ddd' }}>
            <Typography sx={{ fontSize: '11px' }}>SUBTOTAL:</Typography>
            <Typography sx={{ fontSize: '11px', fontWeight: 'bold' }}>{formatCurrency(subtotal)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #ddd' }}>
            <Typography sx={{ fontSize: '11px' }}>TAX:</Typography>
            <Typography sx={{ fontSize: '11px', fontWeight: 'bold' }}>{formatCurrency(tax)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderTop: '2px solid #333', mt: 1 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 'bold' }}>TOTAL:</Typography>
            <Typography sx={{ fontSize: '13px', fontWeight: 'bold' }}>{formatCurrency(total)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, bgcolor: '#1976D2', color: 'white', px: 2, mt: 1, borderRadius: 1 }}>
            <Typography sx={{ fontSize: '15px', fontWeight: 'bold' }}>TOTAL DUE:</Typography>
            <Typography sx={{ fontSize: '15px', fontWeight: 'bold' }}>{formatCurrency(total)}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Notes */}
      {invoice.notes && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#FFF9E6', borderRadius: 1, border: '1px solid #FFE082' }}>
          <Typography variant="subtitle2" sx={{ fontSize: '11px', fontWeight: 'bold', mb: 1 }}>Notes:</Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', whiteSpace: 'pre-wrap' }}>
            {invoice.notes}
          </Typography>
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ textAlign: 'center', mt: 4, pt: 2, borderTop: '1px solid #ddd' }}>
        <Typography sx={{ fontSize: '18px', fontWeight: 'bold', color: '#42A5F5', mb: 1 }}>THANK YOU</Typography>
        <Typography sx={{ fontSize: '9px', color: '#666' }}>
          This invoice was generated electronically and is valid without signature. For questions, please contact {company.name}.
        </Typography>
      </Box>
    </Paper>
  );
});

InvoicePDF.displayName = 'InvoicePDF';

export default InvoicePDF;

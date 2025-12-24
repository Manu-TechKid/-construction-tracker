import { forwardRef } from 'react';
import { Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { format } from 'date-fns';

const ProfessionalInvoiceTemplate = forwardRef(({ invoice, companyInfo }, ref) => {
  const defaultCompanyInfo = {
    name: 'DSJ Construction & Services LLC',
    address: '651 Pullman Pl',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20877',
    phone: '(555) 123-4567',
    email: 'info@dsjconstruction.com',
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

      {/* Invoice Title and Number */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: '24px', mb: 1 }}>
          INVOICE {invoice.invoiceNumber || '5736'}
        </Typography>
      </Box>

      {/* Bill To and Ship To */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Box sx={{ bgcolor: '#E3F2FD', p: 2, borderRadius: 1, minHeight: '120px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '11px', color: '#1976D2', mb: 1 }}>
              BILL TO:
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold', mb: 0.5 }}>
              {invoice.client?.companyName || invoice.building?.name || 'Chattan at Park Crest'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '10px', color: '#666' }}>
              {invoice.building?.address || '15256 Siesta Key Way'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '10px', color: '#666' }}>
              {invoice.building?.city || 'Rockville'}, {invoice.client?.address?.state || 'MD'} {invoice.client?.address?.zipCode || '20877'}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ bgcolor: '#E3F2FD', p: 2, borderRadius: 1, minHeight: '120px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '11px', color: '#1976D2', mb: 1 }}>
              SHIP TO:
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold', mb: 0.5 }}>
              {invoice.client?.companyName || invoice.building?.name || 'Chattan at Park Crest'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '10px', color: '#666' }}>
              {invoice.building?.address || '15256 Siesta Key Way'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '10px', color: '#666' }}>
              {invoice.building?.city || 'Rockville'}, {invoice.client?.address?.state || 'MD'} {invoice.client?.address?.zipCode || '20877'}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Date and Invoice Info */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Box sx={{ bgcolor: '#1976D2', color: 'white', p: 1.5, borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '9px', display: 'block', mb: 0.5 }}>DATE ISSUED</Typography>
            <Typography variant="body2" sx={{ fontSize: '12px', fontWeight: 'bold' }}>
              {format(new Date(invoice.invoiceDate || invoice.createdAt), 'MM/dd/yyyy')}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box sx={{ bgcolor: '#42A5F5', color: 'white', p: 1.5, borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '9px', display: 'block', mb: 0.5 }}>PLEASE PAY BY</Typography>
            <Typography variant="body2" sx={{ fontSize: '12px', fontWeight: 'bold' }}>
              {format(new Date(invoice.dueDate), 'MM/dd/yyyy')}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box sx={{ bgcolor: '#64B5F6', color: 'white', p: 1.5, borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '9px', display: 'block', mb: 0.5 }}>DUE DATE</Typography>
            <Typography variant="body2" sx={{ fontSize: '12px', fontWeight: 'bold' }}>
              {format(new Date(invoice.dueDate), 'MM/dd/yyyy')}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Services Table */}
      <Table sx={{ mb: 3, border: '1px solid #ddd' }} size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#2C3E50' }}>
            <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>DATE</TableCell>
            <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>ACTIVITY</TableCell>
            <TableCell sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>DESCRIPTION</TableCell>
            <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>QTY</TableCell>
            <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>RATE</TableCell>
            <TableCell align="right" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', py: 1, px: 1.5 }}>AMOUNT</TableCell>
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
                Coding Wallcovering Repair - Lobby Area. Description of work performed.
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>1</TableCell>
              <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd' }}>
                {formatCurrency(invoice.subtotal || invoice.total)}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '10px', py: 1, px: 1.5, borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>
                {formatCurrency(invoice.subtotal || invoice.total)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Totals */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Box sx={{ width: '250px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
            <Typography sx={{ fontSize: '11px' }}>SUBTOTAL:</Typography>
            <Typography sx={{ fontSize: '11px', fontWeight: 'bold' }}>{formatCurrency(calculateSubtotal())}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
            <Typography sx={{ fontSize: '11px' }}>TAX:</Typography>
            <Typography sx={{ fontSize: '11px', fontWeight: 'bold' }}>{formatCurrency(calculateTax())}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderTop: '2px solid #333', mt: 1 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 'bold' }}>TOTAL:</Typography>
            <Typography sx={{ fontSize: '13px', fontWeight: 'bold' }}>{formatCurrency(calculateTotal())}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, bgcolor: '#1976D2', color: 'white', px: 2, mt: 1 }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>TOTAL DUE:</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>{formatCurrency(calculateTotal())}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Thank You */}
      <Box sx={{ textAlign: 'center', mt: 4, pt: 2, borderTop: '1px solid #ddd' }}>
        <Typography sx={{ fontSize: '16px', fontWeight: 'bold', color: '#42A5F5', mb: 1 }}>THANK YOU</Typography>
        <Typography sx={{ fontSize: '9px', color: '#666' }}>
          This invoice was generated electronically and is valid without signature. For questions, please contact DSJ Construction & Services LLC.
        </Typography>
      </Box>
    </Paper>
  );
});

ProfessionalInvoiceTemplate.displayName = 'ProfessionalInvoiceTemplate';

export default ProfessionalInvoiceTemplate;

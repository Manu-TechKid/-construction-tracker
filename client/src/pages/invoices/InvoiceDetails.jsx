import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  Typography,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Print as PrintIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

import { 
  useGetInvoiceQuery,
  useMarkInvoiceAsPaidMutation,
  useDeleteInvoiceMutation
} from '../../features/invoices/invoicesApiSlice';
import { useAuth } from '../../hooks/useAuth';

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const { data: invoiceData, isLoading, error } = useGetInvoiceQuery(id);
  const [markAsPaid, { isLoading: isMarkingPaid }] = useMarkInvoiceAsPaidMutation();
  const [deleteInvoice, { isLoading: isDeleting }] = useDeleteInvoiceMutation();
  
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load invoice details: {error?.data?.message || error.message}
        </Alert>
      </Container>
    );
  }
  
  const invoice = invoiceData?.data?.invoice;
  
  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('InvoiceDetails: Full invoice data:', invoiceData);
    console.log('InvoiceDetails: Invoice object:', invoice);
  }
  
  if (!invoice) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">Invoice not found</Alert>
      </Container>
    );
  }

  // Validate invoice data structure
  if (typeof invoice !== 'object') {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Invalid invoice data structure</Alert>
      </Container>
    );
  }
  
  const handleMarkAsPaid = async () => {
    try {
      await markAsPaid(id).unwrap();
      toast.success('Invoice marked as paid successfully');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to mark invoice as paid');
    }
  };
  
  const handleDelete = async () => {
    try {
      await deleteInvoice(id).unwrap();
      toast.success('Invoice deleted successfully');
      navigate('/invoices');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to delete invoice');
    }
    setDeleteDialogOpen(false);
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'sent': return 'info';
      case 'overdue': return 'error';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/invoices')} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1">
              {(() => {
                try {
                  return `Invoice ${invoice.invoiceNumber || 'N/A'}`;
                } catch (error) {
                  console.warn('Error rendering invoice number:', error);
                  return 'Invoice N/A';
                }
              })()}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {(() => {
                try {
                  return invoice.building?.name || 'Unknown Building';
                } catch (error) {
                  console.warn('Error rendering building name:', error);
                  return 'Unknown Building';
                }
              })()}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip 
            label={(() => {
              try {
                return invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1) || 'Open';
              } catch (error) {
                console.warn('Error rendering status:', error);
                return 'Open';
              }
            })()}
            color={getStatusColor(invoice.status)}
            size="large"
          />
          {hasPermission('update:invoices') && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/invoices/${id}/edit`)}
            >
              Edit
            </Button>
          )}
          {hasPermission('delete:invoices') && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          )}
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Invoice Details */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title="Invoice Information"
              avatar={<ReceiptIcon />}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Building
                  </Typography>
                  <Typography variant="body1">
                    {(() => {
                      try {
                        return invoice.building?.name || 'Unknown Building';
                      } catch (error) {
                        console.warn('Error rendering building name:', error);
                        return 'Unknown Building';
                      }
                    })()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {(() => {
                      try {
                        return invoice.building?.address || 'No address available';
                      } catch (error) {
                        console.warn('Error rendering building address:', error);
                        return 'No address available';
                      }
                    })()}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Issue Date
                  </Typography>
                  <Typography variant="body1">
                    {(() => {
                      try {
                        if (!invoice.issueDate) return 'Not set';
                        const date = new Date(invoice.issueDate);
                        if (isNaN(date.getTime())) return 'Invalid date';
                        return format(date, 'MMM dd, yyyy');
                      } catch (error) {
                        console.warn('Error formatting issue date:', error);
                        return 'Error';
                      }
                    })()}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Due Date
                  </Typography>
                  <Typography variant="body1">
                    {(() => {
                      try {
                        if (!invoice.dueDate) return 'Not set';
                        const date = new Date(invoice.dueDate);
                        if (isNaN(date.getTime())) return 'Invalid date';
                        return format(date, 'MMM dd, yyyy');
                      } catch (error) {
                        console.warn('Error formatting due date:', error);
                        return 'Error';
                      }
                    })()}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Status
                  </Typography>
                  <Chip 
                    label={(() => {
                      try {
                        return invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1) || 'Open';
                      } catch (error) {
                        console.warn('Error rendering status:', error);
                        return 'Open';
                      }
                    })()}
                    color={getStatusColor(invoice.status)}
                    size="small"
                  />
                </Grid>
                
                {invoice.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Notes
                    </Typography>
                    <Typography variant="body2">
                      {(() => {
                        try {
                          return invoice.notes || 'No notes available';
                        } catch (error) {
                          console.warn('Error rendering notes:', error);
                          return 'No notes available';
                        }
                      })()}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
          
          {/* Work Orders */}
          {(() => {
            try {
              return invoice.workOrders && Array.isArray(invoice.workOrders) && invoice.workOrders.length > 0 ? (
                <Card>
                  <CardHeader title="Work Orders" />
                  <CardContent>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Work Order</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell align="right">Price</TableCell>
                            <TableCell align="right">Cost</TableCell>
                            <TableCell align="right">Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {invoice.workOrders.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {(() => {
                                    try {
                                      return item.workOrder?.title || 'Work Order';
                                    } catch (error) {
                                      console.warn('Error rendering work order title:', error);
                                      return 'Work Order';
                                    }
                                  })()}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {(() => {
                                    try {
                                      return `Apt: ${item.workOrder?.apartmentNumber || 'N/A'}`;
                                    } catch (error) {
                                      console.warn('Error rendering apartment number:', error);
                                      return 'Apt: N/A';
                                    }
                                  })()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {(() => {
                                      try {
                                        const workType = item.workOrder?.workType;
                                        if (!workType) return 'No Category';
                                        
                                        // Get work type name with icon
                                        const typeName = workType.name || workType.code || 'Unknown';
                                        let icon = '';
                                        switch (typeName.toLowerCase()) {
                                          case 'painting': icon = '🎨'; break;
                                          case 'cleaning': icon = '🧹'; break;
                                          case 'repair': icon = '🔧'; break;
                                          case 'maintenance': icon = '⚙️'; break;
                                          case 'inspection': icon = '🔍'; break;
                                          default: icon = '📋'; break;
                                        }
                                        return `${icon} ${typeName.charAt(0).toUpperCase() + typeName.slice(1)}`;
                                      } catch (error) {
                                        console.warn('Error rendering work type:', error);
                                        return 'No Category';
                                      }
                                    })()}
                                  </Typography>
                                  {(() => {
                                    try {
                                      const workSubType = item.workOrder?.workSubType;
                                      if (workSubType && (workSubType.name || workSubType.code)) {
                                        const subTypeName = workSubType.name || workSubType.code;
                                        return (
                                          <Typography variant="caption" color="textSecondary">
                                            {subTypeName.charAt(0).toUpperCase() + subTypeName.slice(1).replace(/[-_]/g, ' ')}
                                          </Typography>
                                        );
                                      }
                                      return null;
                                    } catch (error) {
                                      console.warn('Error rendering work sub-type:', error);
                                      return null;
                                    }
                                  })()}
                                </Box>
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  try {
                                    return item.description || 'No description';
                                  } catch (error) {
                                    console.warn('Error rendering description:', error);
                                    return 'No description';
                                  }
                                })()}
                              </TableCell>
                              <TableCell align="right">
                                {(() => {
                                  try {
                                    return item.quantity || 0;
                                  } catch (error) {
                                    console.warn('Error rendering quantity:', error);
                                    return 0;
                                  }
                                })()}
                              </TableCell>
                              <TableCell align="right">
                                {(() => {
                                  try {
                                    const price = item.workOrder?.price || item.unitPrice || 0;
                                    return `$${price.toFixed(2)}`;
                                  } catch (error) {
                                    console.warn('Error rendering price:', error);
                                    return '$0.00';
                                  }
                                })()}
                              </TableCell>
                              <TableCell align="right">
                                {(() => {
                                  try {
                                    const cost = item.workOrder?.cost || 0;
                                    return `$${cost.toFixed(2)}`;
                                  } catch (error) {
                                    console.warn('Error rendering cost:', error);
                                    return '$0.00';
                                  }
                                })()}
                              </TableCell>
                              <TableCell align="right">
                                {(() => {
                                  try {
                                    const total = item.totalPrice || (item.quantity * (item.workOrder?.price || item.unitPrice || 0));
                                    return `$${total.toFixed(2)}`;
                                  } catch (error) {
                                    console.warn('Error rendering total price:', error);
                                    return '$0.00';
                                  }
                                })()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ) : null;
            } catch (error) {
              console.warn('Error rendering work orders section:', error);
              return null;
            }
          })()}
        </Grid>
        
        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Category Summary */}
          {(() => {
            try {
              const workOrders = invoice.workOrders || [];
              if (workOrders.length === 0) return null;
              
              // Group by work type
              const categoryTotals = workOrders.reduce((acc, item) => {
                const workType = item.workOrder?.workType;
                const typeName = workType?.name || workType?.code || 'Other';
                const total = item.totalPrice || (item.quantity * (item.workOrder?.price || item.unitPrice || 0));
                
                if (!acc[typeName]) {
                  acc[typeName] = { count: 0, total: 0 };
                }
                acc[typeName].count += 1;
                acc[typeName].total += total;
                return acc;
              }, {});
              
              return Object.keys(categoryTotals).length > 1 ? (
                <Card sx={{ mb: 3 }}>
                  <CardHeader title="Category Breakdown" />
                  <CardContent>
                    {Object.entries(categoryTotals).map(([category, data]) => {
                      let icon = '';
                      switch (category.toLowerCase()) {
                        case 'painting': icon = '🎨'; break;
                        case 'cleaning': icon = '🧹'; break;
                        case 'repair': icon = '🔧'; break;
                        case 'maintenance': icon = '⚙️'; break;
                        case 'inspection': icon = '🔍'; break;
                        default: icon = '📋'; break;
                      }
                      return (
                        <Box key={category} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">
                            {icon} {category.charAt(0).toUpperCase() + category.slice(1)} ({data.count})
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            ${data.total.toFixed(2)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </CardContent>
                </Card>
              ) : null;
            } catch (error) {
              console.warn('Error rendering category summary:', error);
              return null;
            }
          })()}
          
          {/* Cost Summary - Show only actual work order prices */}
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Cost Summary" />
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Total Work Order Value:</Typography>
                <Typography variant="body2">
                  {(() => {
                    try {
                      return `$${invoice.total?.toFixed(2) || '0.00'}`;
                    } catch (error) {
                      console.warn('Error rendering total:', error);
                      return '$0.00';
                    }
                  })()}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Invoice Total:</Typography>
                <Typography variant="h6">
                  {(() => {
                    try {
                      return `$${invoice.total?.toFixed(2) || '0.00'}`;
                    } catch (error) {
                      console.warn('Error rendering total:', error);
                      return '$0.00';
                    }
                  })()}
                </Typography>
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                * Invoice shows actual work order prices with no additional fees or taxes
              </Typography>
            </CardContent>
          </Card>
          
          {/* Actions */}
          <Card>
            <CardHeader title="Actions" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {invoice.status !== 'paid' && hasPermission('update:invoices') && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PaymentIcon />}
                    onClick={handleMarkAsPaid}
                    disabled={isMarkingPaid}
                    fullWidth
                  >
                    {isMarkingPaid ? 'Marking as Paid...' : 'Mark as Paid'}
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => window.print()}
                  fullWidth
                >
                  Print Invoice
                </Button>
                
                {hasPermission('update:invoices') && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/invoices/${id}/edit`)}
                    fullWidth
                  >
                    Edit Invoice
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Invoice</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete invoice {(() => {
              try {
                return invoice.invoiceNumber || 'N/A';
              } catch (error) {
                console.warn('Error rendering invoice number in dialog:', error);
                return 'N/A';
              }
            })()}? 
            This action cannot be undone and will reset the billing status of associated work orders.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InvoiceDetails;

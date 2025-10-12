import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { startOfMonth, endOfMonth, format, isWithinInterval, endOfDay } from 'date-fns';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useGetInvoicesQuery, useMarkInvoiceAsPaidMutation, useDeleteInvoiceMutation } from '../../features/invoices/invoicesApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { toast } from 'react-toastify';

const Invoices = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Monthly filtering state
  const [monthFilter, setMonthFilter] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });

  const { data: invoicesData, isLoading, error } = useGetInvoicesQuery();
  const { data: buildingsData } = useGetBuildingsQuery();
  const [markAsPaid, { isLoading: isMarkingPaid }] = useMarkInvoiceAsPaidMutation();
  const [deleteInvoice, { isLoading: isDeleting }] = useDeleteInvoiceMutation();

  const invoices = invoicesData?.data?.invoices || [];
  const buildings = buildingsData?.data?.buildings || [];

  const handleMenuClick = (event, invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInvoice(null);
  };

  const handleMarkAsPaid = async () => {
    if (selectedInvoice) {
      try {
        await markAsPaid(selectedInvoice._id).unwrap();
        toast.success('Invoice marked as paid successfully');
        handleMenuClose();
      } catch (error) {
        console.error('Error marking invoice as paid:', error);
        const errorMessage = error?.data?.message || error?.message || 'Failed to mark invoice as paid';
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteInvoice = async () => {
    if (selectedInvoice) {
      try {
        console.log('Deleting invoice:', selectedInvoice._id);
        await deleteInvoice(selectedInvoice._id).unwrap();
        toast.success('Invoice deleted successfully');
        setDeleteDialogOpen(false);
        handleMenuClose();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        const errorMessage = error?.data?.message || error?.message || 'Failed to delete invoice';
        toast.error(errorMessage);
        setDeleteDialogOpen(false);
        handleMenuClose();
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'sent':
        return 'info';
      case 'overdue':
        return 'error';
      case 'draft':
        return 'default';
      default:
        return 'default';
    }
  };

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = invoiceSearch.trim().toLowerCase();
    const startDate = monthFilter.startDate ? new Date(monthFilter.startDate) : null;
    const endDate = monthFilter.endDate ? endOfDay(new Date(monthFilter.endDate)) : null;

    return invoices.filter((invoice) => {
      const statusMatch = !filterStatus || invoice.status === filterStatus;
      const buildingMatch = !filterBuilding || invoice.building?._id === filterBuilding;
      const invoiceNumberMatch = !normalizedSearch || (invoice.invoiceNumber || '').toLowerCase().includes(normalizedSearch);

      const rawInvoiceDate = invoice.invoiceDate || invoice.issueDate || invoice.createdAt;
      const invoiceDate = rawInvoiceDate ? new Date(rawInvoiceDate) : null;

      let dateMatch = true;
      if (invoiceDate && !isNaN(invoiceDate)) {
        if (startDate && !isNaN(startDate) && endDate && !isNaN(endDate)) {
          dateMatch = isWithinInterval(invoiceDate, { start: startDate, end: endDate });
        } else if (startDate && !isNaN(startDate)) {
          dateMatch = invoiceDate >= startDate;
        } else if (endDate && !isNaN(endDate)) {
          dateMatch = invoiceDate <= endDate;
        }
      }

      return statusMatch && buildingMatch && invoiceNumberMatch && dateMatch;
    });
  }, [invoices, filterStatus, filterBuilding, monthFilter.startDate, monthFilter.endDate, invoiceSearch]);
  
  // Quick month filter functions
  const setQuickMonthFilter = (monthsBack = 0) => {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() - monthsBack);
    
    setMonthFilter({
      startDate: startOfMonth(targetDate),
      endDate: endOfMonth(targetDate)
    });
  };
  
  // Calculate totals for current filter
  const calculateTotals = () => {
    const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    const paidAmount = filteredInvoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    const pendingAmount = totalAmount - paidAmount;
    
    return { totalAmount, paidAmount, pendingAmount };
  };
  
  const totals = calculateTotals();

  if (isLoading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );
  
  if (error) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <Typography color="error">Error loading invoices: {error?.data?.message || 'Unknown error'}</Typography>
    </Box>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Invoices
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/invoices/create')}
        >
          Create Invoice
        </Button>
      </Box>

      {/* Enhanced Filters with Monthly Selection */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Invoice Filters & History
            </Typography>
            
            {/* Quick Month Selection */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Quick Month Selection:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button 
                  size="small" 
                  variant={monthFilter.startDate && monthFilter.startDate.getMonth() === new Date().getMonth() ? 'contained' : 'outlined'}
                  onClick={() => setQuickMonthFilter(0)}
                >
                  This Month
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setQuickMonthFilter(1)}
                >
                  Last Month
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setQuickMonthFilter(2)}
                >
                  2 Months Ago
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setQuickMonthFilter(3)}
                >
                  3 Months Ago
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setMonthFilter({
                    startDate: startOfMonth(new Date(new Date().getFullYear(), 8, 1)), // September
                    endDate: endOfMonth(new Date(new Date().getFullYear(), 8, 30))
                  })}
                >
                  September 2025
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setMonthFilter({
                    startDate: startOfMonth(new Date(new Date().getFullYear(), 9, 1)), // October
                    endDate: endOfMonth(new Date(new Date().getFullYear(), 9, 31))
                  })}
                >
                  October 2025
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setMonthFilter({
                    startDate: startOfMonth(new Date(new Date().getFullYear(), 10, 1)), // November
                    endDate: endOfMonth(new Date(new Date().getFullYear(), 10, 30))
                  })}
                >
                  November 2025
                </Button>
              </Stack>
            </Box>
            
            <Grid container spacing={2} alignItems="center">
              {/* Date Range */}
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Start Date"
                  value={monthFilter.startDate}
                  onChange={(date) => setMonthFilter(prev => ({ ...prev, startDate: date }))}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      error: false,
                      helperText: ''
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="End Date"
                  value={monthFilter.endDate}
                  onChange={(date) => setMonthFilter(prev => ({ ...prev, endDate: date }))}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      error: false,
                      helperText: ''
                    }
                  }}
                />
              </Grid>
              
              {/* Status Filter */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Building Filter */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Building</InputLabel>
                  <Select
                    value={filterBuilding}
                    onChange={(e) => setFilterBuilding(e.target.value)}
                    label="Building"
                  >
                    <MenuItem value="">All Buildings</MenuItem>
                    {buildings.map((building) => (
                      <MenuItem key={building._id} value={building._id}>
                        {building.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {/* Invoice Search */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search by Invoice #"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                />
              </Grid>
            </Grid>
            
            {/* Summary Stats */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Period: {monthFilter.startDate ? format(monthFilter.startDate, 'MMM dd, yyyy') : 'N/A'} - {monthFilter.endDate ? format(monthFilter.endDate, 'MMM dd, yyyy') : 'N/A'}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="primary">
                    <strong>Total: ${totals.totalAmount.toFixed(2)}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="success.main">
                    <strong>Paid: ${totals.paidAmount.toFixed(2)}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="warning.main">
                    <strong>Pending: ${totals.pendingAmount.toFixed(2)}</strong>
                  </Typography>
                </Grid>
              </Grid>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Found {filteredInvoices.length} invoices in selected period
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </LocalizationProvider>

      {/* Invoices Table */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Building</TableCell>
                <TableCell>Categories</TableCell>
                <TableCell>Invoice Date</TableCell>
                <TableCell>Issue Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Box py={4}>
                      <ReceiptIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No invoices found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {filterStatus || filterBuilding ? 'Try adjusting your filters or ' : ''}
                        Create your first invoice to get started
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/invoices/create')}
                        sx={{ mt: 2 }}
                      >
                        Create Your First Invoice
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {invoice.invoiceNumber || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {invoice.building?.name || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {invoice.building?.address || ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        try {
                          const workOrders = invoice.workOrders || [];
                          if (workOrders.length === 0) return <Typography variant="body2" color="text.secondary">No work orders</Typography>;
                          
                          // Get unique work types
                          const workTypes = [...new Set(workOrders.map(item => {
                            const workType = item.workOrder?.workType;
                            return workType?.name || workType?.code || 'Other';
                          }))].filter(Boolean);
                          
                          if (workTypes.length === 0) return <Typography variant="body2" color="text.secondary">No categories</Typography>;
                          
                          return (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {workTypes.slice(0, 3).map((type, index) => {
                                let icon = '';
                                switch (type.toLowerCase()) {
                                  case 'painting': icon = '🎨'; break;
                                  case 'cleaning': icon = '🧹'; break;
                                  case 'repair': icon = '🔧'; break;
                                  case 'maintenance': icon = '⚙️'; break;
                                  case 'inspection': icon = '🔍'; break;
                                  default: icon = '📋'; break;
                                }
                                return (
                                  <Chip
                                    key={index}
                                    label={`${icon} ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem', height: '20px' }}
                                  />
                                );
                              })}
                              {workTypes.length > 3 && (
                                <Chip
                                  label={`+${workTypes.length - 3}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem', height: '20px' }}
                                />
                              )}
                            </Box>
                          );
                        } catch (error) {
                          console.warn('Error rendering work types:', error);
                          return <Typography variant="body2" color="text.secondary">Error</Typography>;
                        }
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        try {
                          if (!invoice.invoiceDate) return 'N/A';
                          const date = new Date(invoice.invoiceDate);
                          if (isNaN(date.getTime())) return 'Invalid Date';
                          return date.toLocaleDateString();
                        } catch (error) {
                          console.warn('Error formatting invoice date:', error);
                          return 'Error';
                        }
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        try {
                          if (!invoice.issueDate) return 'N/A';
                          const date = new Date(invoice.issueDate);
                          if (isNaN(date.getTime())) return 'Invalid Date';
                          return date.toLocaleDateString();
                        } catch (error) {
                          console.warn('Error formatting issue date:', error);
                          return 'Error';
                        }
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        try {
                          if (!invoice.dueDate) return 'N/A';
                          const date = new Date(invoice.dueDate);
                          if (isNaN(date.getTime())) return 'Invalid Date';
                          return date.toLocaleDateString();
                        } catch (error) {
                          console.warn('Error formatting due date:', error);
                          return 'Error';
                        }
                      })()}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        ${invoice.total?.toFixed(2) || '0.00'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1) || 'Draft'}
                        color={getStatusColor(invoice.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => handleMenuClick(e, invoice)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => navigate(`/invoices/${selectedInvoice?._id}`)}>
          <ViewIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => navigate(`/invoices/${selectedInvoice?._id}/edit`)}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {selectedInvoice?.status !== 'paid' && (
          <MenuItem onClick={handleMarkAsPaid} disabled={isMarkingPaid}>
            <PaymentIcon sx={{ mr: 1 }} />
            {isMarkingPaid ? 'Marking as Paid...' : 'Mark as Paid'}
          </MenuItem>
        )}
        <MenuItem 
          onClick={() => {
            setDeleteDialogOpen(true);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Invoice</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete invoice {selectedInvoice?.invoiceNumber}? 
            This action cannot be undone and will reset the billing status of associated work orders.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteInvoice} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Invoices;

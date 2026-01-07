import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
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
  Tooltip,
  Stack,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  GetApp as DownloadIcon,
  Email as EmailIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useGetInvoicesQuery, useMarkInvoiceAsPaidMutation, useDeleteInvoiceMutation } from '../../features/invoices/invoicesApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { toast } from 'react-toastify';
import { loadFilters, saveFilters } from '../../utils/filterStorage';

const INVOICE_FILTERS_KEY = 'ct_filters_invoices';

const Invoices = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState('invoiceNumberAsc');
  
  const defaultMonthRange = {
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  };

  // Monthly filtering state
  const [monthFilter, setMonthFilter] = useState(defaultMonthRange);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  useEffect(() => {
    const defaults = {
      searchQuery: '',
      filterStatus: '',
      filterBuilding: '',
      startDate: defaultMonthRange.startDate.toISOString(),
      endDate: defaultMonthRange.endDate.toISOString()
    };

    const saved = loadFilters(INVOICE_FILTERS_KEY, defaults);

    setSearchQuery(saved.searchQuery || '');
    setFilterStatus(saved.filterStatus || '');
    setFilterBuilding(saved.filterBuilding || '');
    setMonthFilter({
      startDate: saved.startDate ? new Date(saved.startDate) : defaultMonthRange.startDate,
      endDate: saved.endDate ? new Date(saved.endDate) : defaultMonthRange.endDate
    });

    setFiltersLoaded(true);
  }, [defaultMonthRange.endDate, defaultMonthRange.startDate]);

  useEffect(() => {
    if (!filtersLoaded) return;

    saveFilters(INVOICE_FILTERS_KEY, {
      searchQuery,
      filterStatus,
      filterBuilding,
      startDate: monthFilter.startDate ? monthFilter.startDate.toISOString() : null,
      endDate: monthFilter.endDate ? monthFilter.endDate.toISOString() : null
    });
  }, [filtersLoaded, searchQuery, filterStatus, filterBuilding, monthFilter.startDate, monthFilter.endDate]);

  const invoiceQueryParams = useMemo(() => {
    const trimmedSearch = searchQuery.trim();

    // When searching by invoice number, ignore all other filters
    if (trimmedSearch) {
      return {
        search: trimmedSearch
      };
    }

    // When not searching, apply all filters normally
    const params = {
      status: filterStatus || undefined,
      buildingId: filterBuilding || undefined,
    };

    if (monthFilter.startDate) {
      params.invoiceDateStart = monthFilter.startDate.toISOString();
    }
    if (monthFilter.endDate) {
      params.invoiceDateEnd = monthFilter.endDate.toISOString();
    }

    return params;
  }, [filterStatus, filterBuilding, monthFilter.startDate, monthFilter.endDate, searchQuery]);

  const { data: invoicesData, isLoading, error } = useGetInvoicesQuery(invoiceQueryParams);
  const { data: buildingsData } = useGetBuildingsQuery();
  const [markAsPaid, { isLoading: isMarkingPaid }] = useMarkInvoiceAsPaidMutation();
  const [deleteInvoice, { isLoading: isDeleting }] = useDeleteInvoiceMutation();

  const invoices = useMemo(() => {
    const rawInvoices = invoicesData?.data?.invoices || [];
    // Recalculate invoice totals from work orders to ensure consistency
    return rawInvoices.map(invoice => {
      if (invoice.workOrders && invoice.workOrders.length > 0) {
        const calculatedTotal = invoice.workOrders.reduce((sum, item) => {
          // Use the live work order price like InvoiceDetails does
          const price = item.workOrder?.price !== undefined ? item.workOrder.price : (item.unitPrice || item.totalPrice || 0);
          const quantity = item.quantity || 1;
          return sum + (price * quantity);
        }, 0);
        // Only update if there's a discrepancy
        if (Math.abs(calculatedTotal - (invoice.total || 0)) > 0.01) {
          console.log(`Invoice ${invoice.invoiceNumber}: Correcting total from ${invoice.total} to ${calculatedTotal}`);
          return { ...invoice, total: calculatedTotal };
        }
      }
      return invoice;
    });
  }, [invoicesData?.data?.invoices]);

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

  const handleDelete = async () => {
    if (selectedInvoice) {
      try {
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

  const handleDownloadPDF = async (invoice) => {
    handleMenuClose();
    const downloadPromise = async () => {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'https://construction-tracker-webapp.onrender.com/api/v1';

      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch(`${apiUrl}/invoices/${invoice._id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMsg = 'Failed to generate PDF.';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || `Server error: ${response.status}`;
        } catch (e) {
          errorMsg = `Server responded with status: ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoice.invoiceNumber || invoice._id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    };

    toast.promise(
      downloadPromise(),
      {
        pending: 'Generating your PDF...',
        success: 'PDF downloaded successfully!',
        error: {
          render({data}){
            // data is the error thrown from the promise
            return data.message || 'An unknown error occurred.';
          }
        }
      }
    );
  };

  const handleEmailInvoice = async (invoice) => {
    try {
      // Get building details to access manager emails
      const building = invoice.building;
      const managerEmails = [];

      // Collect all available manager emails
      if (building?.serviceManagerEmail) {
        managerEmails.push(building.serviceManagerEmail);
      }
      if (building?.generalManagerEmail) {
        managerEmails.push(building.generalManagerEmail);
      }
      if (building?.maintenanceManagerEmail) {
        managerEmails.push(building.maintenanceManagerEmail);
      }

      if (managerEmails.length === 0) {
        // Offer alternative: open email client with invoice details
        const confirmed = window.confirm(
          'No manager email addresses found for this building.\n\n' +
          'Would you like to open your email client to send the invoice manually?\n\n' +
          'Click OK to open email client, or Cancel to add manager emails in building settings first.'
        );
        
        if (confirmed) {
          const subject = `Invoice ${invoice.invoiceNumber || invoice._id} - DSJ Construction Services`;
          const body = `Dear Building Manager,\n\n` +
            `Please find attached invoice ${invoice.invoiceNumber || invoice._id} for services provided at ${building?.name || 'your building'}.\n\n` +
            `Invoice Details:\n` +
            `- Invoice Number: ${invoice.invoiceNumber || invoice._id}\n` +
            `- Date: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString('en-US')}\n` +
            `- Total Amount: $${invoice.total?.toFixed(2) || '0.00'}\n\n` +
            `You can download the invoice PDF from: ${window.location.origin}/invoices/${invoice._id}\n\n` +
            `Best regards,\nDSJ Construction Services`;
          
          const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          window.location.href = mailtoLink;
          toast.info('Email client opened. Please add the recipient email address.');
        } else {
          toast.info('Please add manager emails in the building settings to enable automatic email sending.');
        }
        
        handleMenuClose();
        return;
      }

      // Show confirmation dialog with manager emails
      const emailList = managerEmails.join(', ');
      const confirmed = window.confirm(
        `This will send the invoice to the following building managers:\n\n${emailList}\n\nDo you want to proceed?`
      );

      if (!confirmed) return;

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://construction-tracker-webapp.onrender.com/api/v1'}/invoices/${invoice._id}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          emailAddresses: managerEmails,
          message: `Please find attached your invoice ${invoice.invoiceNumber || invoice._id} from DSJ Construction Services.`
        }),
      });

      if (response.ok) {
        toast.success(`Invoice emailed to ${managerEmails.length} manager(s)`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to email invoice');
      }
      handleMenuClose();
    } catch (error) {
      console.error('Error emailing invoice:', error);
      toast.error('Failed to email invoice');
      handleMenuClose();
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
      case 'open':
        return 'default';
      default:
        return 'default';
    }
  };

  const filteredInvoices = useMemo(() => {
    const list = [...invoices];

    list.sort((a, b) => {
      const numA = a.invoiceNumber || '';
      const numB = b.invoiceNumber || '';
      const dateA = a.invoiceDate ? new Date(a.invoiceDate) : new Date(a.createdAt || 0);
      const dateB = b.invoiceDate ? new Date(b.invoiceDate) : new Date(b.createdAt || 0);

      switch (sortBy) {
        case 'invoiceNumberAsc':
          return String(numA).localeCompare(String(numB), undefined, { numeric: true });
        case 'invoiceNumberDesc':
          return String(numB).localeCompare(String(numA), undefined, { numeric: true });
        case 'invoiceDateAsc':
          return dateA - dateB;
        case 'invoiceDateDesc':
        default:
          return dateB - dateA;
      }
    });

    return list;
  }, [invoices, sortBy]);
  
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
                  variant={monthFilter.startDate.getMonth() === new Date().getMonth() ? 'contained' : 'outlined'}
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
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setMonthFilter({
                    startDate: startOfMonth(new Date(2025, 0, 1)), // January 2025
                    endDate: endOfMonth(new Date(2025, 0, 31))
                  })}
                >
                  January 2025
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setMonthFilter({
                    startDate: startOfMonth(new Date(2025, 4, 1)), // May 2025
                    endDate: endOfMonth(new Date(2025, 4, 31))
                  })}
                >
                  May 2025
                </Button>
              </Stack>
            </Box>
            
            <Grid container spacing={2} alignItems="center">
              {/* Search Field */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Search Invoice Number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter invoice number..."
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                  size="small"
                />
              </Grid>

              {/* Date Range */}
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Start Date"
                  value={monthFilter.startDate}
                  onChange={(date) => setMonthFilter(prev => ({ ...prev, startDate: date }))}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small'
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
                      size: 'small'
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
                    <MenuItem value="open">Open</MenuItem>
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
              {/* Sort By */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort By"
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <MenuItem value="invoiceDateDesc">Date (newest first)</MenuItem>
                    <MenuItem value="invoiceDateAsc">Date (oldest first)</MenuItem>
                    <MenuItem value="invoiceNumberAsc">Invoice # (ascending)</MenuItem>
                    <MenuItem value="invoiceNumberDesc">Invoice # (descending)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            {/* Summary Stats */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Period: {format(monthFilter.startDate, 'MMM dd, yyyy')} - {format(monthFilter.endDate, 'MMM dd, yyyy')}
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
                <TableCell>Due Date</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Last Updated By</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
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
                          return date.toLocaleDateString('en-US');
                        } catch (error) {
                          console.warn('Error formatting invoice date:', error);
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
                          return date.toLocaleDateString('en-US');
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
                        label={invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1) || 'Open'}
                        color={getStatusColor(invoice.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={`Created on ${new Date(invoice.createdAt).toLocaleString()}`}>
                        <Typography variant="body2">{invoice.createdBy?.name || 'System'}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={`Last updated on ${new Date(invoice.updatedAt).toLocaleString()}`}>
                        <Typography variant="body2">{invoice.updatedBy?.name || 'N/A'}</Typography>
                      </Tooltip>
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
        <MenuItem onClick={() => handleDownloadPDF(selectedInvoice)}>
          <DownloadIcon sx={{ mr: 1 }} />
          Download PDF
        </MenuItem>
        <MenuItem onClick={() => handleEmailInvoice(selectedInvoice)}>
          <EmailIcon sx={{ mr: 1 }} />
          Email Invoice
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
            onClick={handleDelete} 
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

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AttachMoney as PayrollIcon,
  Person as PersonIcon,
  Download as ExportIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'react-toastify';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';

const PaymentReport = () => {
  const [paymentData, setPaymentData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    workerId: ''
  });
  const [expandedWorker, setExpandedWorker] = useState(null);

  const { data: usersData } = useGetUsersQuery({ role: 'worker' });
  const workers = usersData?.data?.users || [];

  const fetchPaymentReport = useCallback(async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://construction-tracker-webapp.onrender.com/api/v1';
      const params = new URLSearchParams({
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
        ...(filters.workerId && { workerId: filters.workerId })
      });

      const response = await fetch(`${apiUrl}/time-tracking/payment-report?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payment report: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        setPaymentData(data.data.paymentData || []);
        setSummary(data.data.summary || {});
        toast.success(`Payment report loaded for ${data.data.paymentData?.length || 0} workers`);
      }
    } catch (error) {
      console.error('Error fetching payment report:', error);
      toast.error(`Failed to load payment report: ${error.message}`);
      setPaymentData([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  }, [filters.startDate, filters.endDate, filters.workerId]);

  useEffect(() => {
    fetchPaymentReport();
  }, [fetchPaymentReport]);

  const handleExportCSV = () => {
    const csvData = [];
    
    // Add header
    csvData.push([
      'Worker Name',
      'Worker Email', 
      'Total Hours',
      'Total Payment',
      'Sessions Count',
      'Avg Hourly Rate',
      'Date',
      'Building',
      'Apartment',
      'Work Type',
      'Session Hours',
      'Session Rate',
      'Session Payment',
      'Was Corrected',
      'Correction Reason'
    ]);

    // Add data rows
    paymentData.forEach(worker => {
      worker.sessions.forEach(session => {
        csvData.push([
          worker.workerName,
          worker.workerEmail,
          worker.totalHours,
          worker.totalPay,
          worker.sessionsCount,
          worker.avgHourlyRate,
          format(new Date(session.date), 'yyyy-MM-dd'),
          session.building || 'N/A',
          session.apartment || 'N/A',
          session.workType || 'General',
          session.hours,
          session.hourlyRate,
          session.pay,
          session.wasCorrected ? 'Yes' : 'No',
          session.correctionReason || 'N/A'
        ]);
      });
    });

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-report-${format(filters.startDate, 'yyyy-MM-dd')}-to-${format(filters.endDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box>
      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <PayrollIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Payment Report Filters
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={filters.startDate}
                  onChange={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={filters.endDate}
                  onChange={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Worker</InputLabel>
                <Select
                  value={filters.workerId}
                  label="Worker"
                  onChange={(e) => setFilters(prev => ({ ...prev, workerId: e.target.value }))}
                >
                  <MenuItem value="">All Workers</MenuItem>
                  {workers.map((worker) => (
                    <MenuItem key={worker._id} value={worker._id}>
                      {worker.name || worker.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                startIcon={<ExportIcon />}
                onClick={handleExportCSV}
                disabled={paymentData.length === 0}
                fullWidth
              >
                Export CSV
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Workers
              </Typography>
              <Typography variant="h4">
                {summary.totalWorkers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Hours
              </Typography>
              <Typography variant="h4">
                {summary.totalHours || 0}h
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Payroll
              </Typography>
              <Typography variant="h4" color="success.main">
                ${summary.totalPayroll || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Hourly Rate
              </Typography>
              <Typography variant="h4">
                ${summary.avgHourlyRate || 0}/hr
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payment Data */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Worker Payment Details
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : paymentData.length === 0 ? (
            <Alert severity="info">
              No payment data found for the selected period and filters.
            </Alert>
          ) : (
            <Box>
              {paymentData.map((worker) => (
                <Accordion 
                  key={worker._id}
                  expanded={expandedWorker === worker._id}
                  onChange={() => setExpandedWorker(expandedWorker === worker._id ? null : worker._id)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                      <Box display="flex" alignItems="center">
                        <PersonIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">
                          {worker.workerName}
                        </Typography>
                      </Box>
                      <Box display="flex" gap={2} alignItems="center">
                        <Chip 
                          label={`${worker.totalHours}h`} 
                          color="primary" 
                          size="small"
                        />
                        <Chip 
                          label={`$${worker.totalPay?.toFixed(2) || '0.00'}`} 
                          color="success" 
                          size="small"
                        />
                        <Chip 
                          label={`${worker.sessionsCount} sessions`} 
                          color="info" 
                          size="small"
                        />
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Building</TableCell>
                            <TableCell>Apartment</TableCell>
                            <TableCell>Work Type</TableCell>
                            <TableCell>Hours</TableCell>
                            <TableCell>Rate</TableCell>
                            <TableCell>Payment</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {worker.sessions.map((session) => (
                            <TableRow key={session.sessionId}>
                              <TableCell>
                                {format(new Date(session.date), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell>{session.building || 'N/A'}</TableCell>
                              <TableCell>{session.apartment || 'N/A'}</TableCell>
                              <TableCell>{session.workType || 'General'}</TableCell>
                              <TableCell>
                                <Box display="flex" alignItems="center">
                                  {session.hours}h
                                  {session.wasCorrected && (
                                    <Chip 
                                      icon={<WarningIcon />}
                                      label="Corrected" 
                                      size="small" 
                                      color="warning" 
                                      sx={{ ml: 1 }}
                                    />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>${session.hourlyRate}/hr</TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  ${session.pay?.toFixed(2) || '0.00'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {session.wasCorrected ? (
                                  <Chip 
                                    label="Corrected" 
                                    color="warning" 
                                    size="small"
                                    title={session.correctionReason}
                                  />
                                ) : (
                                  <Chip 
                                    label="Original" 
                                    color="success" 
                                    size="small"
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentReport;

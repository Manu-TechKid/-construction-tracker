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
  Grid,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Schedule as TimeIcon,
  Warning as WarningIcon,
  CheckCircle as ApprovedIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';

const WorkerHoursSummary = () => {
  const { user } = useAuth();
  const [sessionsData, setSessionsData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    status: ''
  });

  const fetchWorkerSessions = useCallback(async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://construction-tracker-webapp.onrender.com/api/v1';
      const params = new URLSearchParams({
        workerId: user.id,
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
        ...(filters.status && { status: filters.status })
      });

      const response = await fetch(`${apiUrl}/time-tracking/sessions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        const sessions = data.data.sessions || [];
        setSessionsData(sessions);
        
        // Calculate summary
        const totalHours = sessions.reduce((sum, session) => {
          return sum + (session.correctedHours || session.totalHours || 0);
        }, 0);
        
        const totalPay = sessions.reduce((sum, session) => {
          return sum + (session.calculatedPay || 0);
        }, 0);
        
        const approvedSessions = sessions.filter(s => s.isApproved);
        const pendingSessions = sessions.filter(s => !s.isApproved && s.status === 'completed');
        const correctedSessions = sessions.filter(s => s.correctedHours);
        
        setSummary({
          totalHours: Math.round(totalHours * 100) / 100,
          totalPay: Math.round(totalPay * 100) / 100,
          totalSessions: sessions.length,
          approvedSessions: approvedSessions.length,
          pendingSessions: pendingSessions.length,
          correctedSessions: correctedSessions.length,
          avgHourlyRate: totalHours > 0 ? Math.round((totalPay / totalHours) * 100) / 100 : 0
        });
      }
    } catch (error) {
      console.error('Error fetching worker sessions:', error);
      toast.error(`Failed to load your time data: ${error.message}`);
      setSessionsData([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  }, [user.id, filters.startDate, filters.endDate, filters.status]);

  useEffect(() => {
    if (user?.id) {
      fetchWorkerSessions();
    }
  }, [user?.id, fetchWorkerSessions]);

  const getStatusColor = (session) => {
    if (session.isApproved) return 'success';
    if (session.status === 'completed') return 'warning';
    if (session.status === 'active') return 'info';
    return 'default';
  };

  const getStatusLabel = (session) => {
    if (session.isApproved) return 'Approved';
    if (session.status === 'completed') return 'Pending Approval';
    if (session.status === 'active') return 'Active';
    return session.status;
  };


  return (
    <Box>
      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            My Time & Payment Summary
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={filters.startDate}
                  onChange={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={filters.endDate}
                  onChange={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                </Select>
              </FormControl>
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
                Total Earnings
              </Typography>
              <Typography variant="h4" color="success.main">
                ${summary.totalPay || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Approved Sessions
              </Typography>
              <Typography variant="h4" color="success.main">
                {summary.approvedSessions || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Approval
              </Typography>
              <Typography variant="h4" color="warning.main">
                {summary.pendingSessions || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts */}
      {summary.correctedSessions > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {summary.correctedSessions} of your time sessions have been corrected by management. 
            Check the details below to see which hours were adjusted and why.
          </Typography>
        </Alert>
      )}

      {summary.pendingSessions > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <PendingIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            You have {summary.pendingSessions} completed sessions waiting for approval. 
            Payment will be processed after approval.
          </Typography>
        </Alert>
      )}

      {/* Sessions Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            My Time Sessions
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : sessionsData.length === 0 ? (
            <Alert severity="info">
              No time sessions found for the selected period.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Building</TableCell>
                    <TableCell>Apartment</TableCell>
                    <TableCell>Work Type</TableCell>
                    <TableCell>Hours</TableCell>
                    <TableCell>Rate</TableCell>
                    <TableCell>Earnings</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessionsData.map((session) => (
                    <TableRow key={session._id}>
                      <TableCell>
                        {format(new Date(session.clockInTime), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {session.building?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {session.apartmentNumber || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {session.workType || 'General'}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {session.correctedHours || session.totalHours || 0}h
                          {session.correctedHours && (
                            <Chip 
                              icon={<WarningIcon />}
                              label="Corrected" 
                              size="small" 
                              color="warning" 
                              sx={{ ml: 1 }}
                              title={session.correctionReason || 'Hours were corrected by management'}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        ${session.hourlyRate || 0}/hr
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          ${session.calculatedPay?.toFixed(2) || '0.00'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={session.isApproved ? <ApprovedIcon /> : <PendingIcon />}
                          label={getStatusLabel(session)} 
                          color={getStatusColor(session)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default WorkerHoursSummary;

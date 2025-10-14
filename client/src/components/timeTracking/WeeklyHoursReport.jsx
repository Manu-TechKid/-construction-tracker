import React, { useState, useEffect } from 'react';
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
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as PayrollIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { toast } from 'react-toastify';

const WeeklyHoursReport = () => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [expandedWorker, setExpandedWorker] = useState(null);

  // Calculate week start and end dates
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 }); // Sunday

  const fetchWeeklyHours = async () => {
    setLoading(true);
    try {
      const startDate = weekStart.toISOString();
      const endDate = weekEnd.toISOString();
      
      const response = await fetch(
        `/api/v1/time-tracking/weekly-hours?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch weekly hours');
      }

      const data = await response.json();
      setWeeklyData(data.data.weeklyHours || []);
    } catch (error) {
      console.error('Error fetching weekly hours:', error);
      toast.error('Failed to load weekly hours data');
      setWeeklyData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyHours();
  }, [selectedWeek]);

  const handlePreviousWeek = () => {
    setSelectedWeek(subWeeks(selectedWeek, 1));
  };

  const handleNextWeek = () => {
    setSelectedWeek(addWeeks(selectedWeek, 1));
  };

  const handleWorkerExpand = (workerId) => {
    setExpandedWorker(expandedWorker === workerId ? null : workerId);
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const getDayName = (dateString) => {
    return format(new Date(dateString), 'EEEE');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PayrollIcon color="primary" />
          Weekly Hours Report
        </Typography>

        {/* Week Navigation */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Button variant="outlined" onClick={handlePreviousWeek}>
                  Previous Week
                </Button>
              </Grid>
              <Grid item xs>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">
                    Week of {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={handleNextWeek}>
                  Next Week
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* No Data State */}
        {!loading && weeklyData.length === 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No time tracking data found for this week.
          </Alert>
        )}

        {/* Weekly Hours Summary */}
        {!loading && weeklyData.length > 0 && (
          <>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Weekly Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                      <Typography variant="h4" color="primary.contrastText">
                        {weeklyData.length}
                      </Typography>
                      <Typography variant="body2" color="primary.contrastText">
                        Active Workers
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                      <Typography variant="h4" color="success.contrastText">
                        {weeklyData.reduce((sum, worker) => sum + worker.totalWeeklyHours, 0).toFixed(1)}
                      </Typography>
                      <Typography variant="body2" color="success.contrastText">
                        Total Hours
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="h4" color="info.contrastText">
                        {(weeklyData.reduce((sum, worker) => sum + worker.totalWeeklyHours, 0) / weeklyData.length).toFixed(1)}
                      </Typography>
                      <Typography variant="body2" color="info.contrastText">
                        Avg Hours/Worker
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Worker Details */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Worker Hours Breakdown
                </Typography>
                
                {weeklyData.map((workerData) => (
                  <Accordion 
                    key={workerData.worker._id}
                    expanded={expandedWorker === workerData.worker._id}
                    onChange={() => handleWorkerExpand(workerData.worker._id)}
                    sx={{ mb: 1 }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <PersonIcon color="primary" />
                        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                          {workerData.worker.name}
                        </Typography>
                        <Chip 
                          label={`${workerData.totalWeeklyHours}h`}
                          color={workerData.totalWeeklyHours >= 40 ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Day</TableCell>
                              <TableCell>Date</TableCell>
                              <TableCell align="right">Hours</TableCell>
                              <TableCell align="right">Sessions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {workerData.dailyBreakdown.map((day) => (
                              <TableRow key={day.date}>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarIcon fontSize="small" color="action" />
                                    {getDayName(day.date)}
                                  </Box>
                                </TableCell>
                                <TableCell>{formatDate(day.date)}</TableCell>
                                <TableCell align="right">
                                  <Chip 
                                    label={`${day.hours}h`}
                                    size="small"
                                    color={day.hours >= 8 ? 'success' : day.hours >= 4 ? 'warning' : 'default'}
                                  />
                                </TableCell>
                                <TableCell align="right">{day.sessions.length}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                              <TableCell colSpan={2}>
                                <Typography variant="subtitle2">
                                  <strong>Weekly Total</strong>
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="subtitle2">
                                  <strong>{workerData.totalWeeklyHours}h</strong>
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="subtitle2">
                                  <strong>
                                    {workerData.dailyBreakdown.reduce((sum, day) => sum + day.sessions.length, 0)}
                                  </strong>
                                </Typography>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default WeeklyHoursReport;

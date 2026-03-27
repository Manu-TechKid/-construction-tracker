import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  DatePicker,
  LocalizationProvider,
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  useGetHoursControlReportQuery,
} from '../../features/reports/reportsApiSlice';
import {
  startOfWeek,
  endOfWeek,
  format,
  addDays,
} from 'date-fns';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CalendarViewDayIcon from '@mui/icons-material/CalendarViewDay';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const HoursControlReport = () => {
  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [view, setView] = useState('daily'); // 'daily' or 'weekly'
  const printRef = useRef();

  const { data: reportData, isLoading, error, isFetching } = useGetHoursControlReportQuery(
    { 
      startDate: startDate?.toISOString(), 
      endDate: endDate?.toISOString(),
      view,
    },
    { skip: !startDate || !endDate }
  );

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    
    document.body.innerHTML = `
      <html>
        <head>
          <title>Control de Horas Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; }
            .summary { margin: 20px 0; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Control de Horas - ${view === 'daily' ? 'Daily Timesheet' : 'Weekly Schedule'}</h1>
            <p>Period: ${format(startDate, 'MM/dd/yyyy')} - ${format(endDate, 'MM/dd/yyyy')}</p>
          </div>
          ${printContents}
        </body>
      </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const handleExportCSV = () => {
    if (!reportData?.data) return;
    
    let csvContent = '';
    
    if (view === 'daily') {
      // Daily CSV header
      csvContent = 'Date,Worker,Client,Entrance Hour,Leaving Hour,Activity,Hours\n';
      
      reportData.data.daily?.forEach(entry => {
        csvContent += `${entry.dateFormatted},"${entry.workerName}","${entry.client}",${entry.entranceHour || ''},${entry.leavingHour || ''},"${entry.activity}",${entry.hours}\n`;
      });
    } else {
      // Weekly CSV header
      csvContent = 'Worker,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Total Hours\n';
      
      reportData.data.weekly?.forEach(worker => {
        const dayHours = DAYS_OF_WEEK.map(day => {
          const entries = worker.days[day] || [];
          return entries.map(e => `${e.client} (${e.hours}h)`).join('; ');
        });
        csvContent += `"${worker.workerName}",${dayHours.map(h => `"${h}"`).join(',')},${worker.totalHours.toFixed(2)}\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `control-de-horas-${view}-${format(startDate, 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const renderDailyView = () => {
    const entries = reportData?.data?.daily || [];
    
    return (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Worker</strong></TableCell>
              <TableCell><strong>Client (Building)</strong></TableCell>
              <TableCell align="center"><strong>Entrance Hour</strong></TableCell>
              <TableCell align="center"><strong>Leaving Hour</strong></TableCell>
              <TableCell><strong>Activity</strong></TableCell>
              <TableCell align="right"><strong>Hours</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No time entries found for the selected period.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry, index) => (
                <TableRow key={index} hover>
                  <TableCell>{entry.dateFormatted}</TableCell>
                  <TableCell>{entry.workerName}</TableCell>
                  <TableCell>{entry.client}</TableCell>
                  <TableCell align="center">{entry.entranceHour || '-'}</TableCell>
                  <TableCell align="center">{entry.leavingHour || '-'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {entry.activity}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={entry.hours.toFixed(2)} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
            {entries.length > 0 && (
              <TableRow sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                <TableCell colSpan={6} align="right">
                  <strong>Total Hours:</strong>
                </TableCell>
                <TableCell align="right">
                  <Chip 
                    label={reportData?.data?.summary?.totalHours?.toFixed(2) || '0.00'} 
                    size="small" 
                    color="primary"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderWeeklyView = () => {
    const weeklyData = reportData?.data?.weekly || [];
    
    return (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><strong>Worker</strong></TableCell>
              {DAYS_OF_WEEK.map(day => (
                <TableCell key={day} align="center">
                  <strong>{day.substring(0, 3)}</strong>
                </TableCell>
              ))}
              <TableCell align="right"><strong>Total</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weeklyData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No time entries found for the selected period.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              weeklyData.map((worker, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {worker.workerName}
                    </Typography>
                  </TableCell>
                  {DAYS_OF_WEEK.map(day => {
                    const entries = worker.days[day] || [];
                    const dayHours = entries.reduce((sum, e) => sum + e.hours, 0);
                    
                    return (
                      <TableCell key={day} align="center" sx={{ minWidth: 120 }}>
                        {entries.length > 0 ? (
                          <Box>
                            {entries.map((entry, i) => (
                              <Box key={i} sx={{ mb: 0.5 }}>
                                <Typography variant="caption" display="block" color="text.secondary">
                                  {entry.client}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  {entry.entranceHour} - {entry.leavingHour}
                                </Typography>
                                <Chip 
                                  label={`${entry.hours.toFixed(1)}h`} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: '0.7rem' }}
                                />
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">-</Typography>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell align="right">
                    <Chip 
                      label={worker.totalHours.toFixed(2)} 
                      size="small" 
                      color="secondary"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Card elevation={3}>
          <CardHeader 
            title="Control de Horas (Hours Control)"
            subheader="Daily and Weekly Timesheet Reports"
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                  disabled={isLoading || !reportData}
                >
                  Print
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={handleExportCSV}
                  disabled={isLoading || !reportData}
                >
                  Export CSV
                </Button>
              </Box>
            }
          />
          <CardContent>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(date) => setEndDate(date)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <ToggleButtonGroup
                  value={view}
                  exclusive
                  onChange={(e, newView) => newView && setView(newView)}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="daily">
                    <CalendarViewDayIcon sx={{ mr: 0.5 }} />
                    Daily
                  </ToggleButton>
                  <ToggleButton value="weekly">
                    <CalendarViewWeekIcon sx={{ mr: 0.5 }} />
                    Weekly
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Tooltip title="Reset to this week">
                    <Button 
                      size="small" 
                      onClick={() => {
                        setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
                        setEndDate(endOfWeek(new Date(), { weekStartsOn: 1 }));
                      }}
                    >
                      This Week
                    </Button>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>

            {/* Summary Chips */}
            {!isLoading && reportData?.data?.summary && (
              <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  label={`Total Sessions: ${reportData.data.summary.totalSessions}`}
                  color="info"
                  variant="outlined"
                />
                <Chip 
                  label={`Total Hours: ${reportData.data.summary.totalHours?.toFixed(2)}`}
                  color="success"
                  variant="outlined"
                />
                <Chip 
                  label={`Period: ${reportData.data.summary.dateRange?.start} to ${reportData.data.summary.dateRange?.end}`}
                  variant="outlined"
                />
              </Box>
            )}

            {/* Report Content */}
            {(isLoading || isFetching) ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">
                Error loading report: {error.data?.message || 'Please try again.'}
              </Alert>
            ) : (
              <div ref={printRef}>
                {view === 'daily' ? renderDailyView() : renderWeeklyView()}
              </div>
            )}
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default HoursControlReport;

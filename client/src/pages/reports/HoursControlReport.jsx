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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Fade,
  Divider,
  Badge,
  useTheme,
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
} from 'date-fns';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CalendarViewDayIcon from '@mui/icons-material/CalendarViewDay';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import ScheduleIcon from '@mui/icons-material/Schedule';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { useGetWorkersQuery } from '../../features/users/usersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const HoursControlReport = () => {
  const theme = useTheme();
  const printRef = useRef();

  // Filter states
  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [view, setView] = useState('daily'); // 'daily' or 'weekly'
  const [workerId, setWorkerId] = useState('');
  const [buildingId, setBuildingId] = useState('');

  // Fetch filter options
  const { data: workersData, isLoading: workersLoading } = useGetWorkersQuery({ role: 'worker' });
  const { data: buildingsData, isLoading: buildingsLoading } = useGetBuildingsQuery();

  const workers = workersData?.data?.users || workersData?.users || [];
  const buildings = buildingsData?.data?.buildings || buildingsData?.buildings || [];

  const { data: reportData, isLoading, error, isFetching, refetch } = useGetHoursControlReportQuery(
    { 
      startDate: startDate?.toISOString(), 
      endDate: endDate?.toISOString(),
      view,
      workerId: workerId || undefined,
      buildingId: buildingId || undefined,
    },
    { skip: !startDate || !endDate }
  );

  const handleClearFilters = () => {
    setWorkerId('');
    setBuildingId('');
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleResetThisWeek = () => {
    setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setEndDate(endOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printContents = printRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    
    document.body.innerHTML = `
      <html>
        <head>
          <title>Control de Horas Report - ${format(startDate, 'MM/dd/yyyy')} to ${format(endDate, 'MM/dd/yyyy')}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333; }
            .print-header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #1976d2; padding-bottom: 16px; }
            .print-header h1 { margin: 0 0 8px 0; font-size: 24px; color: #1976d2; }
            .print-header p { margin: 0; color: #666; font-size: 14px; }
            .print-summary { display: flex; gap: 24px; margin-bottom: 20px; justify-content: center; }
            .print-stat { text-align: center; }
            .print-stat-value { font-size: 20px; font-weight: bold; color: #1976d2; }
            .print-stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
            th { background-color: #1976d2; color: white; padding: 12px 8px; text-align: left; font-weight: 600; }
            td { border-bottom: 1px solid #e0e0e0; padding: 10px 8px; }
            tr:nth-child(even) { background-color: #f5f5f5; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
            .badge-blue { background-color: #e3f2fd; color: #1976d2; }
            .badge-green { background-color: #e8f5e9; color: #388e3c; }
            .badge-gray { background-color: #f5f5f5; color: #666; }
            @media print {
              .no-print { display: none !important; }
              body { margin: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>Control de Horas - ${view === 'daily' ? 'Daily Timesheet' : 'Weekly Schedule'}</h1>
            <p>Generated on ${format(new Date(), 'MM/dd/yyyy HH:mm')}</p>
          </div>
          <div class="print-summary">
            <div class="print-stat">
              <div class="print-stat-value">${format(startDate, 'MM/dd/yyyy')}</div>
              <div class="print-stat-label">Start Date</div>
            </div>
            <div class="print-stat">
              <div class="print-stat-value">${format(endDate, 'MM/dd/yyyy')}</div>
              <div class="print-stat-label">End Date</div>
            </div>
            <div class="print-stat">
              <div class="print-stat-value">${reportData?.data?.summary?.totalSessions || 0}</div>
              <div class="print-stat-label">Total Sessions</div>
            </div>
            <div class="print-stat">
              <div class="print-stat-value">${(reportData?.data?.summary?.totalHours || 0).toFixed(2)}</div>
              <div class="print-stat-label">Total Hours</div>
            </div>
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
        const safe = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        csvContent += `${entry.dateFormatted},${safe(entry.workerName)},${safe(entry.client)},${entry.entranceHour || '-'},${entry.leavingHour || '-'},${safe(entry.activity)},${entry.hours.toFixed(2)}\n`;
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
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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

  const activeFiltersCount = (workerId ? 1 : 0) + (buildingId ? 1 : 0);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        <Card elevation={2} sx={{ borderRadius: 2 }}>
          {/* Header */}
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon color="primary" />
                <Typography variant="h6" component="span">
                  Control de Horas
                </Typography>
              </Box>
            }
            subheader="Hours Control - Daily and Weekly Timesheet Reports"
            action={
              <Stack direction="row" spacing={1} sx={{ pr: 2 }}>
                <Tooltip title="Refresh data">
                  <IconButton onClick={handleRefresh} disabled={isLoading} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                  disabled={isLoading || !reportData}
                  size="small"
                >
                  Print
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={handleExportCSV}
                  disabled={isLoading || !reportData}
                  size="small"
                >
                  Export CSV
                </Button>
              </Stack>
            }
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: 'white',
              '& .MuiCardHeader-subheader': { color: 'rgba(255,255,255,0.8)' },
              '& .MuiIconButton-root': { color: 'white' },
              '& .MuiButton-root': {
                color: 'white',
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' },
              },
            }}
          />
          <CardContent sx={{ p: 3 }}>
            {/* Filters Section */}
            <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, backgroundColor: '#fafafa' }}>
              <Grid container spacing={2} alignItems="center">
                {/* Start Date */}
                <Grid item xs={12} sm={6} md={2.5}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(date) => setStartDate(date)}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth size="small" />
                    )}
                  />
                </Grid>

                {/* End Date */}
                <Grid item xs={12} sm={6} md={2.5}>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(date) => setEndDate(date)}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth size="small" />
                    )}
                  />
                </Grid>

                {/* View Toggle */}
                <Grid item xs={12} sm={6} md={2.5}>
                  <ToggleButtonGroup
                    value={view}
                    exclusive
                    onChange={(e, newView) => newView && setView(newView)}
                    size="small"
                    fullWidth
                  >
                    <ToggleButton value="daily">
                      <CalendarViewDayIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                      Daily
                    </ToggleButton>
                    <ToggleButton value="weekly">
                      <CalendarViewWeekIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                      Weekly
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Grid>

                {/* Worker Filter */}
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small" disabled={workersLoading}>
                    <InputLabel>Worker</InputLabel>
                    <Select value={workerId} onChange={(e) => setWorkerId(e.target.value)} label="Worker">
                      <MenuItem value="">
                        <em>All Workers</em>
                      </MenuItem>
                      {workers.map((w) => (
                        <MenuItem key={w._id || w.id} value={w._id || w.id}>
                          {w.name || w.email || `Worker ${w._id?.slice(-4)}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Building Filter */}
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small" disabled={buildingsLoading}>
                    <InputLabel>Building</InputLabel>
                    <Select value={buildingId} onChange={(e) => setBuildingId(e.target.value)} label="Building">
                      <MenuItem value="">
                        <em>All Buildings</em>
                      </MenuItem>
                      {buildings.map((b) => (
                        <MenuItem key={b._id || b.id} value={b._id || b.id}>
                          {b.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Reset Button */}
                <Grid item xs={12} sm={6} md={1.5}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleResetThisWeek}
                      fullWidth
                    >
                      This Week
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ClearAllIcon />}
                      onClick={handleClearFilters}
                      size="small"
                      disabled={!activeFiltersCount}
                      sx={{ minWidth: 0, px: 1 }}
                    >
                      {activeFiltersCount > 0 && (
                        <Badge badgeContent={activeFiltersCount} color="primary" sx={{ mr: 0.5 }} />
                      )}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* Summary Chips */}
            {!isLoading && reportData?.data?.summary && (
              <Fade in={true}>
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Paper elevation={1} sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="h4" color="primary" fontWeight="bold">
                          {reportData.data.summary.totalSessions}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Sessions
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Paper elevation={1} sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="h4" color="success.main" fontWeight="bold">
                          {(reportData.data.summary.totalHours || 0).toFixed(1)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Hours
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Paper elevation={1} sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="h4" color="info.main" fontWeight="bold">
                          {reportData.data.summary.uniqueWorkers || reportData.data.summary.totalSessions}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Workers
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Paper elevation={1} sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="h4" color="warning.main" fontWeight="bold">
                          {reportData.data.summary.dateRange?.days || 7}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Days
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              </Fade>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Loading State */}
            {(isLoading || isFetching) && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
                <CircularProgress size={48} thickness={3} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Loading hours data...
                </Typography>
              </Box>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Error loading report
                </Typography>
                {error.data?.message || 'Please try again later.'}
              </Alert>
            )}

            {/* Report Content */}
            {!isLoading && !error && (
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

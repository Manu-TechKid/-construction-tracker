import React, { useRef, useState, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Tooltip,
  Fade,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Badge,
  useTheme,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useGetDailyScheduleReportQuery } from '../../features/reports/reportsApiSlice';
import { useGetWorkersQuery } from '../../features/users/usersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import EventIcon from '@mui/icons-material/Event';
import { format, startOfDay, endOfDay } from 'date-fns';

const DailyScheduleReport = () => {
  const theme = useTheme();
  const printRef = useRef();

  // Filter states
  const [date, setDate] = useState(new Date());
  const [workerId, setWorkerId] = useState('');
  const [buildingId, setBuildingId] = useState('');

  // Fetch filter options
  const { data: workersData, isLoading: workersLoading } = useGetWorkersQuery({ role: 'worker' });
  const { data: buildingsData, isLoading: buildingsLoading } = useGetBuildingsQuery();

  const workers = workersData?.data?.users || workersData?.users || [];
  const buildings = buildingsData?.data?.buildings || buildingsData?.buildings || [];

  // Fetch report data
  const { data, isLoading, isFetching, error, refetch } = useGetDailyScheduleReportQuery(
    {
      date: date?.toISOString(),
      workerId: workerId || undefined,
      buildingId: buildingId || undefined,
    },
    { skip: !date }
  );

  const entries = data?.data?.entries || [];
  const summary = data?.data?.summary;

  // Calculate filtered stats
  const stats = useMemo(() => {
    if (!entries.length) return { totalWorkers: 0, totalBuildings: 0, totalHours: 0 };
    const uniqueWorkers = new Set(entries.map((e) => e.workerId)).size;
    const uniqueBuildings = new Set(entries.map((e) => e.buildingId)).size;
    const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
    return { totalWorkers: uniqueWorkers, totalBuildings: uniqueBuildings, totalHours };
  }, [entries]);

  // Handlers
  const handleClearFilters = () => {
    setDate(new Date());
    setWorkerId('');
    setBuildingId('');
  };

  const handleRefresh = () => {
    refetch();
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContents = printRef.current.innerHTML;
    const originalContents = document.body.innerHTML;

    document.body.innerHTML = `
      <html>
        <head>
          <title>Daily Schedule Sheet - ${format(date, 'MM/dd/yyyy')}</title>
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
            <h1>Daily Schedule Sheet</h1>
            <p>Generated on ${format(new Date(), 'MM/dd/yyyy HH:mm')}</p>
          </div>
          <div class="print-summary">
            <div class="print-stat">
              <div class="print-stat-value">${format(date, 'MM/dd/yyyy')}</div>
              <div class="print-stat-label">Schedule Date</div>
            </div>
            <div class="print-stat">
              <div class="print-stat-value">${entries.length}</div>
              <div class="print-stat-label">Total Entries</div>
            </div>
            <div class="print-stat">
              <div class="print-stat-value">${stats.totalWorkers}</div>
              <div class="print-stat-label">Workers</div>
            </div>
            <div class="print-stat">
              <div class="print-stat-value">${stats.totalHours.toFixed(2)}</div>
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
    const headers = ['Date', 'Worker', 'Client', 'Entrance Hour', 'Leaving Hour', 'Activity', 'Hours', 'Notes'];
    const csvRows = [
      headers.join(','),
      ...entries.map((e) => {
        const safe = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        return [
          e.dateFormatted,
          e.workerName,
          e.client,
          e.entranceHour || '-',
          e.leavingHour || '-',
          e.activity,
          (e.hours ?? 0).toFixed(2),
          e.notes || '',
        ].map(safe).join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-schedule-${format(date, 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Status color helper
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
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
                <EventIcon color="primary" />
                <Typography variant="h6" component="span">
                  Daily Schedule Sheet
                </Typography>
              </Box>
            }
            subheader="View and export daily worker schedules by date, worker, or building"
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
                  disabled={isLoading || !entries.length}
                  size="small"
                >
                  Print
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportCSV}
                  disabled={isLoading || !entries.length}
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
                {/* Date Filter */}
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="Schedule Date"
                    value={date}
                    onChange={(d) => setDate(d)}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth size="small" variant="outlined" />
                    )}
                  />
                </Grid>

                {/* Worker Filter */}
                <Grid item xs={12} sm={6} md={3}>
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
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small" disabled={buildingsLoading}>
                    <InputLabel>Building / Client</InputLabel>
                    <Select
                      value={buildingId}
                      onChange={(e) => setBuildingId(e.target.value)}
                      label="Building / Client"
                    >
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

                {/* Clear Filters */}
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    startIcon={<ClearAllIcon />}
                    onClick={handleClearFilters}
                    fullWidth
                    size="small"
                    disabled={!activeFiltersCount && date.getTime() === new Date().getTime()}
                  >
                    Clear Filters
                    {activeFiltersCount > 0 && (
                      <Badge
                        badgeContent={activeFiltersCount}
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Summary Stats */}
            <Fade in={!isLoading && !!summary}>
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        {entries.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Entries
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {stats.totalWorkers}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Workers
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="h4" color="info.main" fontWeight="bold">
                        {stats.totalBuildings}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Buildings
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="h4" color="warning.main" fontWeight="bold">
                        {stats.totalHours.toFixed(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Hours
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Fade>

            <Divider sx={{ my: 2 }} />

            {/* Loading State */}
            {(isLoading || isFetching) && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
                <CircularProgress size={48} thickness={3} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Loading schedule data...
                </Typography>
              </Box>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Error loading schedule
                </Typography>
                {error?.data?.message || 'Please try again later.'}
              </Alert>
            )}

            {/* Data Table */}
            {!isLoading && !error && (
              <div ref={printRef}>
                <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow
                        sx={{
                          backgroundColor: theme.palette.primary.main,
                          '& th': { color: 'white', fontWeight: 600, py: 1.5 },
                        }}
                      >
                        <TableCell width="10%">Date</TableCell>
                        <TableCell width="15%">Worker</TableCell>
                        <TableCell width="18%">Client / Building</TableCell>
                        <TableCell width="12%" align="center">Entrance</TableCell>
                        <TableCell width="12%" align="center">Leaving</TableCell>
                        <TableCell width="23%">Activity</TableCell>
                        <TableCell width="10%" align="center">Hours</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {entries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                            <Box sx={{ textAlign: 'center' }}>
                              <EventIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                              <Typography color="text.secondary" variant="body1">
                                No schedules found for this date.
                              </Typography>
                              <Typography color="text.disabled" variant="body2">
                                Try selecting a different date or adjusting filters.
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : (
                        entries.map((entry, index) => (
                          <TableRow
                            key={entry.id || index}
                            hover
                            sx={{
                              '&:nth-of-type(even)': { backgroundColor: '#fafafa' },
                              transition: 'background-color 0.2s',
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {entry.dateFormatted}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{entry.workerName}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                                {entry.client}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={entry.entranceHour || '-'}
                                size="small"
                                variant="outlined"
                                color={entry.entranceHour ? 'primary' : 'default'}
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={entry.leavingHour || '-'}
                                size="small"
                                variant="outlined"
                                color={entry.leavingHour ? 'secondary' : 'default'}
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Tooltip title={entry.activity} placement="top-start">
                                <Typography
                                  variant="body2"
                                  noWrap
                                  sx={{
                                    maxWidth: 220,
                                    cursor: entry.activity?.length > 30 ? 'help' : 'default',
                                  }}
                                >
                                  {entry.activity || '-'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={(entry.hours || 0).toFixed(1)}
                                size="small"
                                color={entry.hours > 0 ? 'success' : 'default'}
                                sx={{ fontWeight: 'bold', minWidth: 45 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Footer Summary */}
                {entries.length > 0 && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      backgroundColor: '#f5f5f5',
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Showing <strong>{entries.length}</strong> schedule entries for{' '}
                      <strong>{format(date, 'MMMM dd, yyyy')}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Hours: <strong>{stats.totalHours.toFixed(2)}</strong>
                    </Typography>
                  </Box>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default DailyScheduleReport;

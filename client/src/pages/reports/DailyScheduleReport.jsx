import React, { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
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
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useGetDailyScheduleReportQuery } from '../../features/reports/reportsApiSlice';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { format } from 'date-fns';

const DailyScheduleReport = () => {
  const [date, setDate] = useState(new Date());
  const printRef = useRef();

  const { data, isLoading, isFetching, error } = useGetDailyScheduleReportQuery(
    { date: date?.toISOString() },
    { skip: !date }
  );

  const entries = data?.data?.entries || [];
  const summary = data?.data?.summary;

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContents = printRef.current.innerHTML;
    const originalContents = document.body.innerHTML;

    document.body.innerHTML = `
      <html>
        <head>
          <title>Daily Schedule Sheet</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; }
            .summary { margin: 20px 0; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Daily Schedule Sheet</h1>
            <p>Date: ${date ? format(date, 'MM/dd/yyyy') : ''}</p>
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
    const csvHeader = 'Date,Worker,Client,Entrance Hour,Leaving Hour,Activity,Hours,Notes\n';
    const csvRows = entries
      .map((e) => {
        const safe = (v) => `"${String(v ?? '').replace(/\"/g, '""')}"`;
        return [
          e.dateFormatted,
          e.workerName,
          e.client,
          e.entranceHour,
          e.leavingHour,
          e.activity,
          (e.hours ?? 0).toFixed(2),
          e.notes,
        ].map(safe).join(',');
      })
      .join('\n');

    const blob = new Blob([csvHeader + csvRows + '\n'], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-schedule-${date ? format(date, 'yyyy-MM-dd') : 'date'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Card elevation={3}>
          <CardHeader
            title="Daily Schedule Sheet"
            subheader="Printable daily schedule from Worker Schedules"
            action={
              <Box sx={{ display: 'flex', gap: 1 }} className="no-print">
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                  disabled={isLoading || !data}
                >
                  Print
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportCSV}
                  disabled={isLoading || !data}
                >
                  Export CSV
                </Button>
              </Box>
            }
          />
          <CardContent>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }} className="no-print">
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Date"
                  value={date}
                  onChange={(d) => setDate(d)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                />
              </Grid>
            </Grid>

            {summary && (
              <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip label={`Total Entries: ${summary.totalEntries}`} variant="outlined" />
                <Chip label={`Total Hours: ${(summary.totalHours || 0).toFixed(2)}`} color="success" variant="outlined" />
                <Chip label={`Date: ${summary.date}`} variant="outlined" />
              </Box>
            )}

            {(isLoading || isFetching) ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">Error loading schedule: {error?.data?.message || 'Please try again.'}</Alert>
            ) : (
              <div ref={printRef}>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell><strong>Worker</strong></TableCell>
                        <TableCell><strong>Client</strong></TableCell>
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
                            <Typography color="text.secondary">No schedules found for this date.</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        entries.map((e) => (
                          <TableRow key={e.id} hover>
                            <TableCell>{e.dateFormatted}</TableCell>
                            <TableCell>{e.workerName}</TableCell>
                            <TableCell>{e.client}</TableCell>
                            <TableCell align="center">{e.entranceHour || '-'}</TableCell>
                            <TableCell align="center">{e.leavingHour || '-'}</TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 260 }}>
                                {e.activity}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip label={(e.hours || 0).toFixed(2)} size="small" color="primary" variant="outlined" />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default DailyScheduleReport;

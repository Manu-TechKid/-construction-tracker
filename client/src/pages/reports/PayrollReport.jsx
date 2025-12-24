import React, { useState } from 'react';
import { Box, Card, CardContent, CardHeader, CircularProgress, Grid, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useGetPayrollReportQuery } from '../../features/reports/reportsApiSlice';
import { startOfMonth, endOfMonth } from 'date-fns';

const PayrollReport = () => {
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));

  const { data: reportData, isLoading, error, isFetching } = useGetPayrollReportQuery(
    { startDate: startDate?.toISOString(), endDate: endDate?.toISOString() },
    { skip: !startDate || !endDate }
  );

  const totals = React.useMemo(() => {
    if (!reportData?.data) return { totalHours: 0, totalPay: 0 };
    return reportData.data.reduce(
      (acc, row) => {
        acc.totalHours += row.totalHours || 0;
        acc.totalPay += row.totalPay || 0;
        return acc;
      },
      { totalHours: 0, totalPay: 0 }
    );
  }, [reportData]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Card elevation={3}>
          <CardHeader title="Worker Payroll Report" />
          <CardContent>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(date) => setEndDate(date)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
            </Grid>

            {(isLoading || isFetching) ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">Error loading report: {error.data?.message || 'Please try again.'}</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Worker</TableCell>
                      <TableCell align="right">Total Hours</TableCell>
                      <TableCell align="right">Total Pay</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData?.data?.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.workerName}</TableCell>
                        <TableCell align="right">{row.totalHours.toFixed(2)}</TableCell>
                        <TableCell align="right">${row.totalPay.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ '& td, & th': { fontWeight: 'bold', borderTop: '2px solid black' } }}>
                      <TableCell>Total</TableCell>
                      <TableCell align="right">{totals.totalHours.toFixed(2)}</TableCell>
                      <TableCell align="right">${totals.totalPay.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default PayrollReport;

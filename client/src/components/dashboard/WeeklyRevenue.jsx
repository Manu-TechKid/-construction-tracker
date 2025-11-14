import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, subWeeks, parseISO } from 'date-fns';
import { useGetInvoicesQuery } from '../../features/invoices/invoicesApiSlice';

const WeeklyRevenue = () => {
  const [selectedWeeks, setSelectedWeeks] = useState(4); // Show last 4 weeks by default
  
  // Get invoices data
  const { data: invoicesData, isLoading, error } = useGetInvoicesQuery({
    status: 'paid', // Only count paid invoices for revenue
    limit: 1000 // Get a large number to ensure we have all recent invoices
  });

  const invoices = invoicesData?.data?.invoices || [];

  // Calculate weekly revenue data
  const weeklyData = useMemo(() => {
    if (!invoices.length) return [];

    const weeks = [];
    const today = new Date();

    // Generate data for the selected number of weeks
    for (let i = 0; i < selectedWeeks; i++) {
      const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 }); // Monday start
      const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 }); // Sunday end
      
      // Filter invoices for this week
      const weekInvoices = invoices.filter(invoice => {
        if (!invoice.paidAt) return false;
        const paidDate = parseISO(invoice.paidAt);
        return paidDate >= weekStart && paidDate <= weekEnd;
      });

      // Calculate totals
      const totalRevenue = weekInvoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
      const invoiceCount = weekInvoices.length;
      const avgInvoiceValue = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;

      // Group by customer
      const customerBreakdown = {};
      weekInvoices.forEach(invoice => {
        const customerName = invoice.customer?.name || invoice.building?.name || 'Unknown Customer';
        if (!customerBreakdown[customerName]) {
          customerBreakdown[customerName] = {
            revenue: 0,
            invoiceCount: 0
          };
        }
        customerBreakdown[customerName].revenue += invoice.totalAmount || 0;
        customerBreakdown[customerName].invoiceCount += 1;
      });

      weeks.push({
        weekStart,
        weekEnd,
        totalRevenue,
        invoiceCount,
        avgInvoiceValue,
        customerBreakdown: Object.entries(customerBreakdown)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
      });
    }

    return weeks.reverse(); // Show oldest to newest
  }, [invoices, selectedWeeks]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!weeklyData.length) return null;

    const totalRevenue = weeklyData.reduce((sum, week) => sum + week.totalRevenue, 0);
    const totalInvoices = weeklyData.reduce((sum, week) => sum + week.invoiceCount, 0);
    const avgWeeklyRevenue = totalRevenue / weeklyData.length;
    const highestWeek = weeklyData.reduce((max, week) => 
      week.totalRevenue > max.totalRevenue ? week : max, weeklyData[0]);
    const lowestWeek = weeklyData.reduce((min, week) => 
      week.totalRevenue < min.totalRevenue ? week : min, weeklyData[0]);

    return {
      totalRevenue,
      totalInvoices,
      avgWeeklyRevenue,
      highestWeek,
      lowestWeek
    };
  }, [weeklyData]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load revenue data: {error?.data?.message || error?.message || 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon color="primary" />
          Weekly Revenue Dashboard
        </Typography>
        
        <TextField
          select
          size="small"
          label="Time Period"
          value={selectedWeeks}
          onChange={(e) => setSelectedWeeks(Number(e.target.value))}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value={2}>Last 2 weeks</MenuItem>
          <MenuItem value={4}>Last 4 weeks</MenuItem>
          <MenuItem value={8}>Last 8 weeks</MenuItem>
          <MenuItem value={12}>Last 12 weeks</MenuItem>
        </TextField>
      </Box>

      {summaryStats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MoneyIcon color="success" />
                  <Typography variant="h6" color="success.main">
                    ${summaryStats.totalRevenue.toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Total Revenue ({selectedWeeks} weeks)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon color="primary" />
                  <Typography variant="h6" color="primary">
                    ${summaryStats.avgWeeklyRevenue.toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Average Weekly Revenue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ReceiptIcon color="info" />
                  <Typography variant="h6" color="info.main">
                    {summaryStats.totalInvoices}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Total Paid Invoices
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon color="warning" />
                  <Typography variant="h6" color="warning.main">
                    ${summaryStats.highestWeek.totalRevenue.toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Best Week ({format(summaryStats.highestWeek.weekStart, 'MMM dd')})
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Weekly Revenue Breakdown
          </Typography>
          
          {weeklyData.length === 0 ? (
            <Alert severity="info">
              No paid invoices found for the selected time period.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Week</strong></TableCell>
                    <TableCell align="right"><strong>Revenue</strong></TableCell>
                    <TableCell align="center"><strong>Invoices</strong></TableCell>
                    <TableCell align="right"><strong>Avg Invoice</strong></TableCell>
                    <TableCell><strong>Top Customers</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {weeklyData.map((week, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {format(week.weekStart, 'MMM dd')} - {format(week.weekEnd, 'MMM dd')}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {format(week.weekStart, 'yyyy')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body1" 
                          fontWeight="bold"
                          color={week.totalRevenue > 0 ? 'success.main' : 'textSecondary'}
                        >
                          ${week.totalRevenue.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={week.invoiceCount} 
                          size="small" 
                          color={week.invoiceCount > 0 ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${week.avgInvoiceValue.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {week.customerBreakdown.slice(0, 3).map((customer, idx) => (
                            <Chip
                              key={idx}
                              label={`${customer.name} ($${customer.revenue.toLocaleString()})`}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          ))}
                          {week.customerBreakdown.length > 3 && (
                            <Chip
                              label={`+${week.customerBreakdown.length - 3} more`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
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

export default WeeklyRevenue;

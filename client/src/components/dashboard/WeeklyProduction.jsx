import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { BarChart as BarChartIcon, Apartment as BuildingIcon } from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, subWeeks, parseISO } from 'date-fns';
import { useGetInvoicesQuery } from '../../features/invoices/invoicesApiSlice';

const WeeklyProduction = () => {
  const [selectedWeeks, setSelectedWeeks] = useState(4); // Last 4 weeks by default

  const { data: invoicesData, isLoading, error } = useGetInvoicesQuery({
    limit: 1000,
  });

  const invoices = invoicesData?.data?.invoices || [];

  const weeklyProduction = useMemo(() => {
    if (!invoices.length) return [];

    const weeks = [];
    const today = new Date();

    for (let i = 0; i < selectedWeeks; i++) {
      const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 });

      const weekInvoices = invoices.filter((invoice) => {
        const dateSource =
          invoice.invoiceDate ||
          invoice.createdAt ||
          invoice.paidDate ||
          invoice.paymentDate;

        if (!dateSource) return false;

        const invoiceDate = parseISO(dateSource);
        if (isNaN(invoiceDate.getTime())) return false;

        return invoiceDate >= weekStart && invoiceDate <= weekEnd;
      });

      if (!weekInvoices.length) {
        weeks.push({
          weekStart,
          weekEnd,
          totalProduction: 0,
          customers: [],
          serviceCategories: [],
        });
        continue;
      }

      const customerMap = {};
      const categorySet = new Set();

      weekInvoices.forEach((invoice) => {
        const customerName =
          invoice.customer?.name ||
          invoice.building?.name ||
          'Unknown Customer';

        if (!customerMap[customerName]) {
          customerMap[customerName] = {
            name: customerName,
            total: 0,
            services: {},
          };
        }

        const lineItems = Array.isArray(invoice.lineItems)
          ? invoice.lineItems
          : [];

        if (lineItems.length) {
          lineItems.forEach((item) => {
            const category = item.serviceCategory || 'Uncategorized';
            const amount =
              typeof item.totalPrice === 'number'
                ? item.totalPrice
                : (item.quantity || 1) * (item.unitPrice || 0);

            categorySet.add(category);

            if (!customerMap[customerName].services[category]) {
              customerMap[customerName].services[category] = 0;
            }

            customerMap[customerName].services[category] += amount;
            customerMap[customerName].total += amount;
          });
        } else {
          const fallbackAmount =
            typeof invoice.total === 'number' ? invoice.total : 0;
          const category = 'Uncategorized';

          categorySet.add(category);

          if (!customerMap[customerName].services[category]) {
            customerMap[customerName].services[category] = 0;
          }

          customerMap[customerName].services[category] += fallbackAmount;
          customerMap[customerName].total += fallbackAmount;
        }
      });

      const customers = Object.values(customerMap).sort(
        (a, b) => b.total - a.total
      );

      const totalProduction = customers.reduce(
        (sum, customer) => sum + customer.total,
        0
      );

      weeks.push({
        weekStart,
        weekEnd,
        totalProduction,
        customers,
        serviceCategories: Array.from(categorySet).sort(),
      });
    }

    return weeks.reverse();
  }, [invoices, selectedWeeks]);

  const summary = useMemo(() => {
    if (!weeklyProduction.length) return null;

    const total = weeklyProduction.reduce(
      (sum, week) => sum + week.totalProduction,
      0
    );

    const avg = total / weeklyProduction.length;

    return { total, avg };
  }, [weeklyProduction]);

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
        Failed to load production data: {error?.data?.message || error?.message || 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <BarChartIcon color="primary" />
          Weekly Production by Customer
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

      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Production ({selectedWeeks} weeks)
                </Typography>
                <Typography variant="h6" color="primary">
                  ${summary.total.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Avg Weekly Production
                </Typography>
                <Typography variant="h6" color="secondary">
                  ${summary.avg.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {weeklyProduction.length === 0 ? (
        <Alert severity="info">
          No invoices found for the selected time period.
        </Alert>
      ) : (
        weeklyProduction.map((week, index) => {
          const allCategories = week.serviceCategories;

          return (
            <Card key={index} sx={{ mb: 3 }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h6">
                      {format(week.weekStart, 'MMM dd')} -
                      {' '}
                      {format(week.weekEnd, 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total production: ${week.totalProduction.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>

                {week.customers.length === 0 ? (
                  <Alert severity="info">No production for this week.</Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <BuildingIcon fontSize="small" />
                              <Typography variant="body2" fontWeight="bold">
                                Customer
                              </Typography>
                            </Box>
                          </TableCell>
                          {allCategories.map((category) => (
                            <TableCell key={category} align="right">
                              <Typography variant="body2" fontWeight="bold">
                                {category}
                              </Typography>
                            </TableCell>
                          ))}
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              Total
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {week.customers.map((customer) => (
                          <TableRow key={customer.name} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {customer.name}
                              </Typography>
                            </TableCell>
                            {allCategories.map((category) => {
                              const value = customer.services[category] || 0;
                              return (
                                <TableCell key={category} align="right">
                                  <Typography
                                    variant="body2"
                                    color={value > 0 ? 'textPrimary' : 'textSecondary'}
                                  >
                                    {value > 0 ? `$${value.toLocaleString()}` : '-'}
                                  </Typography>
                                </TableCell>
                              );
                            })}
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold">
                                ${customer.total.toLocaleString()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </Box>
  );
};

export default WeeklyProduction;

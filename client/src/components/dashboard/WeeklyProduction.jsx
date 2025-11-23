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
import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';

const WeeklyProduction = () => {
  const [selectedWeeks, setSelectedWeeks] = useState(4); // Last 4 weeks by default

  // Use completed work orders as the source of "production" instead of invoices
  const { data: workOrdersData, isLoading, error } = useGetWorkOrdersQuery();

  const workOrders = workOrdersData?.data?.workOrders || [];

  const weeklyProduction = useMemo(() => {
    if (!workOrders.length) return [];

    const weeks = [];
    const today = new Date();

    for (let i = 0; i < selectedWeeks; i++) {
      const referenceDate = subWeeks(today, i);
      const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 }); // Sunday

      // Filter to completed work orders that fall in this week
      const weekWorkOrders = workOrders.filter((wo) => {
        if (!wo || wo.status !== 'completed') return false;

        const dateSource =
          wo.completedAt ||
          wo.updatedAt ||
          wo.scheduledDate ||
          wo.createdAt;

        if (!dateSource) return false;

        const rawDate = typeof dateSource === 'string' ? parseISO(dateSource) : new Date(dateSource);
        if (isNaN(rawDate.getTime())) return false;

        return rawDate >= weekStart && rawDate <= weekEnd;
      });

      if (!weekWorkOrders.length) {
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

      weekWorkOrders.forEach((wo) => {
        const customerName = wo.building?.name || 'Unknown Building';

        if (!customerMap[customerName]) {
          customerMap[customerName] = {
            name: customerName,
            total: 0,
            services: {},
          };
        }

        // Derive a category from the work type for breakdown columns
        let category = 'Uncategorized';
        if (wo.workType) {
          if (typeof wo.workType === 'string') {
            category = wo.workType;
          } else if (wo.workType.name) {
            category = wo.workType.name;
          } else if (wo.workType.code) {
            category = wo.workType.code;
          }
        }

        // Amount calculation aligned with invoiceController.createInvoice:
        // Priority: services -> price -> actualCost -> estimatedCost
        let amount = 0;

        if (Array.isArray(wo.services) && wo.services.length > 0) {
          amount = wo.services.reduce((sum, service) => {
            return (
              sum +
              (service.laborCost || 0) +
              (service.materialCost || 0)
            );
          }, 0);
        } else if (typeof wo.price === 'number' && wo.price > 0) {
          amount = wo.price;
        } else if (typeof wo.actualCost === 'number' && wo.actualCost > 0) {
          amount = wo.actualCost;
        } else if (typeof wo.estimatedCost === 'number') {
          amount = wo.estimatedCost;
        }

        categorySet.add(category);

        if (!customerMap[customerName].services[category]) {
          customerMap[customerName].services[category] = 0;
        }

        customerMap[customerName].services[category] += amount;
        customerMap[customerName].total += amount;
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
  }, [workOrders, selectedWeeks]);

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
          No completed work orders found for the selected time period.
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
                                Customer (Building)
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

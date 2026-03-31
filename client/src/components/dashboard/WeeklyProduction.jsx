import { useState, useMemo } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { BarChart as BarChartIcon, Apartment as BuildingIcon } from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, subWeeks, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';

const WeeklyProduction = () => {
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly', 'biweekly', 'monthly', 'custom'
  const [selectedWeeks, setSelectedWeeks] = useState(4); // Last 4 weeks by default
  const [selectedBuilding, setSelectedBuilding] = useState(''); // Filter by building
  const [customDateRange, setCustomDateRange] = useState({
    startDate: null,
    endDate: null
  });

  // Use completed work orders as the source of "production" instead of invoices
  const { data: workOrdersData, isLoading, error } = useGetWorkOrdersQuery();
  const { data: buildingsData } = useGetBuildingsQuery();

  const workOrders = useMemo(() => workOrdersData?.data?.workOrders || [], [workOrdersData]);
  const buildings = buildingsData?.data?.buildings || [];

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

        // Apply building filter if selected
        if (selectedBuilding) {
          const buildingMatch = wo.building?._id === selectedBuilding || 
                               (typeof wo.building === 'string' && wo.building === selectedBuilding);
          if (!buildingMatch) return false;
        }

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
  }, [workOrders, selectedWeeks, selectedBuilding, viewMode, customDateRange]);

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

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
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            gap: 2,
            flexWrap: 'wrap'
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <BarChartIcon color="primary" />
            Production by Customer
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton value="weekly">Weekly</ToggleButton>
              <ToggleButton value="biweekly">Bi-Weekly</ToggleButton>
              <ToggleButton value="monthly">Monthly</ToggleButton>
              <ToggleButton value="custom">Custom</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              select
              size="small"
              label="Building"
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All Buildings</MenuItem>
              {buildings.map((building) => (
                <MenuItem key={building._id} value={building._id}>
                  {building.name}
                </MenuItem>
              ))}
            </TextField>

            {viewMode !== 'custom' && (
              <TextField
                select
                size="small"
                label="Periods"
                value={selectedWeeks}
                onChange={(e) => setSelectedWeeks(Number(e.target.value))}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value={2}>2 periods</MenuItem>
                <MenuItem value={4}>4 periods</MenuItem>
                <MenuItem value={8}>8 periods</MenuItem>
                <MenuItem value={12}>12 periods</MenuItem>
              </TextField>
            )}
          </Box>
        </Box>

        {/* Custom Date Range */}
        {viewMode === 'custom' && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <DatePicker
              label="Start Date"
              value={customDateRange.startDate}
              onChange={(date) => setCustomDateRange(prev => ({ ...prev, startDate: date }))}
              slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
            />
            <DatePicker
              label="End Date"
              value={customDateRange.endDate}
              onChange={(date) => setCustomDateRange(prev => ({ ...prev, endDate: date }))}
              minDate={customDateRange.startDate}
              slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
            />
          </Box>
        )}

      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Production ({selectedWeeks} {viewMode === 'monthly' ? 'months' : viewMode === 'biweekly' ? 'bi-weeks' : 'weeks'})
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
                  Avg {viewMode === 'monthly' ? 'Monthly' : viewMode === 'biweekly' ? 'Bi-Weekly' : 'Weekly'} Production
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
    </LocalizationProvider>
  );
};

export default WeeklyProduction;

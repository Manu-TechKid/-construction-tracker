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
} from '@mui/material';
import { BarChart as BarChartIcon, Person as PersonIcon } from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, subWeeks, parseISO } from 'date-fns';
import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';

const WeeklyProductionByWorker = () => {
  const [selectedWeeks, setSelectedWeeks] = useState(4);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');

  const { data: workOrdersData, isLoading: isLoadingWorkOrders, error: workOrdersError } = useGetWorkOrdersQuery();
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useGetUsersQuery({ role: 'worker' });
  const { data: buildingsData, isLoading: isLoadingBuildings, error: buildingsError } = useGetBuildingsQuery();

  const workers = usersData?.data?.users || [];
  const buildings = buildingsData?.data?.buildings || [];

  const weeklyProduction = useMemo(() => {
    const workOrders = workOrdersData?.data?.workOrders || [];
    if (!workOrders.length) return [];

    const weeks = [];
    const today = new Date();

    for (let i = 0; i < selectedWeeks; i++) {
      const referenceDate = subWeeks(today, i);
      const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });

      const weekWorkOrders = workOrders.filter((wo) => {
        if (selectedBuilding && wo.building?._id !== selectedBuilding) return false;
        if (!wo || wo.status !== 'completed') return false;

        if (selectedWorker) {
          const workerMatch = wo.assignedTo?.some(a => a.worker?._id === selectedWorker);
          if (!workerMatch) return false;
        }

        const dateSource = wo.completedAt || wo.updatedAt || wo.scheduledDate || wo.createdAt;
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
          workers: [],
          serviceCategories: [],
        });
        continue;
      }

      const workerMap = {};
      const categorySet = new Set();

      weekWorkOrders.forEach((wo) => {
        wo.assignedTo?.forEach(assignment => {
          const workerName = assignment.worker?.name || 'Unknown Worker';

          if (!workerMap[workerName]) {
            workerMap[workerName] = {
              name: workerName,
              total: 0,
              services: {},
            };
          }

          let category = 'Uncategorized';
          if (wo.workType?.name) {
            category = wo.workType.name;
          }

          let amount = wo.price || 0;

          categorySet.add(category);

          if (!workerMap[workerName].services[category]) {
            workerMap[workerName].services[category] = 0;
          }

          workerMap[workerName].services[category] += amount;
          workerMap[workerName].total += amount;
        });
      });

      const workersData = Object.values(workerMap).sort((a, b) => b.total - a.total);
      const totalProduction = workersData.reduce((sum, worker) => sum + worker.total, 0);

      weeks.push({
        weekStart,
        weekEnd,
        totalProduction,
        workers: workersData,
        serviceCategories: Array.from(categorySet).sort(),
      });
    }

    return weeks.reverse();
  }, [workOrdersData, selectedWeeks, selectedWorker, selectedBuilding]);

  const summary = useMemo(() => {
    if (!weeklyProduction.length) return null;

    const total = weeklyProduction.reduce((sum, week) => sum + week.totalProduction, 0);
    const avg = total / weeklyProduction.length;

    return { total, avg };
  }, [weeklyProduction]);

  if (isLoadingWorkOrders || isLoadingUsers) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (workOrdersError || usersError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load production data: {workOrdersError?.data?.message || usersError?.data?.message || 'Unknown error'}
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
          Weekly Production by Worker
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            size="small"
            label="Building"
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            sx={{ minWidth: 180 }}
            disabled={isLoadingBuildings}
          >
            <MenuItem value="">All Buildings</MenuItem>
            {buildings.map((building) => (
              <MenuItem key={building._id} value={building._id}>
                {building.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Worker"
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Workers</MenuItem>
            {workers.map((worker) => (
              <MenuItem key={worker._id} value={worker._id}>
                {worker.name}
              </MenuItem>
            ))}
          </TextField>

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
                      {format(week.weekStart, 'MMM dd')} -{' '}
                      {format(week.weekEnd, 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total production: ${week.totalProduction.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>

                {week.workers.length === 0 ? (
                  <Alert severity="info">No production for this week.</Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PersonIcon fontSize="small" />
                              <Typography variant="body2" fontWeight="bold">
                                Worker
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
                        {week.workers.map((worker) => (
                          <TableRow key={worker.name} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {worker.name}
                              </Typography>
                            </TableCell>
                            {allCategories.map((category) => {
                              const value = worker.services[category] || 0;
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
                                ${worker.total.toLocaleString()}
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

export default WeeklyProductionByWorker;

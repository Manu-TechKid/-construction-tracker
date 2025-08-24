import { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Paper, 
  Card, 
  CardContent, 
  CardHeader, 
  Divider,
  LinearProgress,
  useTheme
} from '@mui/material';
import { 
  Assignment as AssignmentIcon, 
  Apartment as BuildingIcon, 
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import WorkOrderList from '../../components/dashboard/WorkOrderList';
import StatCard from '../../components/dashboard/StatCard';
import BuildingStatus from '../../components/dashboard/BuildingStatus';
import WorkerAvailability from '../../components/dashboard/WorkerAvailability';
import { formatDate } from '../../utils/dateUtils';

const Dashboard = () => {
  const theme = useTheme();
  const [stats, setStats] = useState({
    totalWorkOrders: 0,
    completedWorkOrders: 0,
    inProgressWorkOrders: 0,
    pendingWorkOrders: 0,
    totalBuildings: 0,
    totalWorkers: 0,
  });

  // Fetch data
  const { data: workOrdersData, isLoading: isLoadingWorkOrders } = useGetWorkOrdersQuery();
  const { data: buildingsData, isLoading: isLoadingBuildings } = useGetBuildingsQuery();
  const { data: workersData, isLoading: isLoadingWorkers } = useGetWorkersQuery();

  // Process data when loaded
  useEffect(() => {
    if (workOrdersData && buildingsData && workersData) {
      const workOrders = workOrdersData.data || [];
      const buildings = buildingsData.data || [];
      const workers = workersData.data || [];

      // Calculate work order stats
      const completed = workOrders.filter(wo => wo.status === 'completed').length;
      const inProgress = workOrders.filter(wo => wo.status === 'in_progress').length;
      const pending = workOrders.filter(wo => wo.status === 'pending').length;

      setStats({
        totalWorkOrders: workOrders.length,
        completedWorkOrders: completed,
        inProgressWorkOrders: inProgress,
        pendingWorkOrders: pending,
        totalBuildings: buildings.length,
        totalWorkers: workers.length,
      });
    }
  }, [workOrdersData, buildingsData, workersData]);

  // Get recent work orders
  const recentWorkOrders = workOrdersData?.data 
    ? [...workOrdersData.data]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
    : [];

  // Get building status
  const buildingStatusData = buildingsData?.data?.map(building => ({
    id: building._id,
    name: building.name,
    status: building.status || 'operational',
    workOrders: workOrdersData?.data?.filter(wo => wo.building?._id === building._id).length || 0,
  })) || [];

  // Get worker availability
  const workerAvailabilityData = workersData?.data?.map(worker => ({
    id: worker._id,
    name: worker.name,
    status: worker.status || 'available',
    assignedWorkOrders: workOrdersData?.data?.filter(wo => 
      wo.assignedTo?.some(assignment => assignment.worker?._id === worker._id)
    ).length || 0,
  })) || [];

  const isLoading = isLoadingWorkOrders || isLoadingBuildings || isLoadingWorkers;

  if (isLoading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {formatDate(new Date(), 'full')}
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Work Orders"
            value={stats.totalWorkOrders}
            icon={<AssignmentIcon />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completed"
            value={stats.completedWorkOrders}
            icon={<CheckCircleIcon />}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="In Progress"
            value={stats.inProgressWorkOrders}
            icon={<WarningIcon />}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending"
            value={stats.pendingWorkOrders}
            icon={<ErrorIcon />}
            color={theme.palette.error.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Work Orders */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader 
              title="Recent Work Orders" 
              titleTypographyProps={{ variant: 'h6' }}
              action={
                <Typography variant="body2" color="primary">
                  View All
                </Typography>
              }
            />
            <Divider />
            <CardContent>
              <WorkOrderList workOrders={recentWorkOrders} />
            </CardContent>
          </Card>
        </Grid>

        {/* Building Status */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader 
              title="Building Status" 
              titleTypographyProps={{ variant: 'h6' }}
              avatar={<BuildingIcon />}
            />
            <Divider />
            <CardContent>
              <BuildingStatus buildings={buildingStatusData} />
            </CardContent>
          </Card>
        </Grid>

        {/* Worker Availability */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardHeader 
              title="Worker Availability" 
              titleTypographyProps={{ variant: 'h6' }}
              avatar={<PeopleIcon />}
            />
            <Divider />
            <CardContent>
              <WorkerAvailability workers={workerAvailabilityData} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

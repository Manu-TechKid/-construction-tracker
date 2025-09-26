import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useGetWorkOrdersQuery } from '../../features/workOrders/workOrdersApiSlice';
import StatCard from '../../components/dashboard/StatCard';
import BuildingStatus from '../../components/dashboard/BuildingStatus';
import WorkerAvailability from '../../components/dashboard/WorkerAvailability';
import { formatDate, timeAgo } from '../../utils/dateUtils';

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBuildings: 0,
    totalWorkers: 0,
    availableWorkers: 0,
    totalWorkOrders: 0,
    pendingWorkOrders: 0,
    completedWorkOrders: 0,
    inProgressWorkOrders: 0,
  });

  // Fetch data
  const { data: buildingsData, isLoading: isLoadingBuildings, error: buildingsError } = useGetBuildingsQuery({});
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useGetUsersQuery({ role: 'worker' });
  const { data: workOrdersData, isLoading: isLoadingWorkOrders, error: workOrdersError } = useGetWorkOrdersQuery();

  // Process data
  useEffect(() => {
    // Handle buildings data
    if (buildingsData?.data) {
      const buildings = buildingsData.data.buildings || [];
      setStats(prevStats => ({
        ...prevStats,
        totalBuildings: buildings.length
      }));
    }

    // Handle workers data
    if (usersData?.data) {
      const workers = usersData.data.users || [];
      const availableWorkers = workers.filter(worker =>
        worker.workerProfile?.status === 'available'
      );

      setStats(prevStats => ({
        ...prevStats,
        totalWorkers: workers.length,
        availableWorkers: availableWorkers.length
      }));
    }

    // Handle work orders data
    if (workOrdersData?.data) {
      const workOrders = workOrdersData.data || [];
      const pendingOrders = workOrders.filter(order => order.status === 'pending');
      const completedOrders = workOrders.filter(order => order.status === 'completed');
      const inProgressOrders = workOrders.filter(order => order.status === 'in_progress');

      setStats(prevStats => ({
        ...prevStats,
        totalWorkOrders: workOrders.length,
        pendingWorkOrders: pendingOrders.length,
        completedWorkOrders: completedOrders.length,
        inProgressWorkOrders: inProgressOrders.length
      }));
    }
  }, [buildingsData, usersData, workOrdersData]);

  // Get building status with actual work order counts
  const buildingStatusData = buildingsData?.data?.buildings?.map(building => {
    const buildingWorkOrders = workOrdersData?.data?.filter(wo => wo.building?._id === building._id) || [];
    return {
      id: building._id,
      name: building.name,
      status: building.status || 'operational',
      workOrders: buildingWorkOrders.length,
    };
  }) || [];

  // Get worker availability with actual names and work order counts
  const workerAvailabilityData = (usersData?.data?.users || []).map(worker => {
    const assignedOrders = workOrdersData?.data?.filter(wo =>
      wo.assignedTo?.some(assignment => assignment.worker?._id === worker._id)
    ) || [];

    return {
      id: worker._id,
      name: worker.name || `${worker.firstName || ''} ${worker.lastName || ''}`.trim() || 'Unknown Worker',
      status: worker.workerProfile?.status || 'unavailable',
      assignedWorkOrders: assignedOrders.length,
    };
  }) || [];

  // Only show loading if buildings are loading (core data)
  const isLoading = isLoadingBuildings;

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading dashboard data...
        </Typography>
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
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Total Buildings"
            value={stats.totalBuildings}
            icon={<BuildingIcon />}
            color={theme.palette.primary.main}
            onClick={() => navigate('/buildings')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Total Workers"
            value={stats.totalWorkers}
            icon={<PeopleIcon />}
            color={theme.palette.info.main}
            onClick={() => navigate('/workers')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Pending Orders"
            value={stats.pendingWorkOrders}
            icon={<WarningIcon />}
            color={theme.palette.warning.main}
            onClick={() => navigate('/work-orders?status=pending')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="In Progress"
            value={stats.inProgressWorkOrders}
            icon={<InfoIcon />}
            color={theme.palette.info.main}
            onClick={() => navigate('/work-orders?status=in_progress')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Completed"
            value={stats.completedWorkOrders}
            icon={<CheckCircleIcon />}
            color={theme.palette.success.main}
            onClick={() => navigate('/work-orders?status=completed')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>

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

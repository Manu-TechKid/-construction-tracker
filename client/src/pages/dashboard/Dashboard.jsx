import { useState, useEffect, useCallback, useMemo } from 'react';
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
  useTheme,
  Button,
  TextField,
  Alert
} from '@mui/material';
import {
  Apartment as BuildingIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  AccessTime as TimeTrackingIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useGetWorkOrdersQuery, useGetCleaningWorkOrdersForWeekQuery } from '../../features/workOrders/workOrdersApiSlice';
import { useGetDashboardStatsQuery } from '../../features/analytics/analyticsApiSlice';
import StatCard from '../../components/dashboard/StatCard';
import BuildingStatus from '../../components/dashboard/BuildingStatus';
import WorkerAvailability from '../../components/dashboard/WorkerAvailability';
import WeeklyRevenue from '../../components/dashboard/WeeklyRevenue';
import WeeklyProduction from '../../components/dashboard/WeeklyProduction';
import WeeklyProductionByWorker from '../../components/dashboard/WeeklyProductionByWorker';
import DashboardAlerts from '../../components/dashboard/DashboardAlerts';
import PendingNotes from '../../components/dashboard/PendingNotes';
import DetailedCleaningCard from '../../components/dashboard/DetailedCleaningCard';
import DetailedCleaningJobsView from '../../components/dashboard/DetailedCleaningJobsView';
import CleaningServicesModal from '../../components/dashboard/CleaningServicesModal';
import { safeFormatDate } from '../../utils/dateUtils';
import ResponsiveContainer from '../../components/layout/ResponsiveContainer';
import NotificationTest from '../../components/Notifications/NotificationTest';

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [isCleaningModalOpen, setIsCleaningModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });
  
  // Format date for API query
  const formatDateForQuery = useCallback((date) => {
    return date ? date.toISOString() : undefined;
  }, []);

  // Prepare query params
  const queryParams = useMemo(() => {
    return {
      startDate: formatDateForQuery(dateRange.startDate),
      endDate: formatDateForQuery(dateRange.endDate)
    };
  }, [dateRange.startDate, dateRange.endDate, formatDateForQuery]);

  const usersQueryParams = useMemo(() => ({ role: 'worker' }), []);
  
  // Fetch data
  const { data: buildingsData, isLoading: isLoadingBuildings, error: buildingsError } = useGetBuildingsQuery();
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useGetUsersQuery(usersQueryParams);
  const { data: workOrdersData, isLoading: isLoadingWorkOrders, error: workOrdersError } = useGetWorkOrdersQuery();
  const { data: cleaningData } = useGetCleaningWorkOrdersForWeekQuery();
  
  // Fetch analytics data
  const { 
    data: analyticsData, 
    refetch: refetchAnalytics,
    isLoading: isLoadingAnalytics
  } = useGetDashboardStatsQuery(queryParams);
  
  useEffect(() => {
    console.log('Dashboard Analytics Data:', analyticsData);
    console.log('Dashboard Cleaning Data:', cleaningData);
  }, [analyticsData, cleaningData]);

  // Handle date filter changes
  const handleDateChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setDateRange({
      startDate: null,
      endDate: null
    });
    refetchAnalytics();
  };

  // Apply filters
  const handleApplyFilters = () => {
    refetchAnalytics();
  };

  const handleOpenCleaningModal = () => setIsCleaningModalOpen(true);
  const handleCloseCleaningModal = () => setIsCleaningModalOpen(false);
  
  const [stats, setStats] = useState({
    totalBuildings: 0,
    totalWorkers: 0,
    availableWorkers: 0,
    totalWorkOrders: 0,
    pendingWorkOrders: 0,
    completedWorkOrders: 0,
    inProgressWorkOrders: 0,
    totalTimeHours: 0,
    geofenceViolations: 0,
  });

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
    if (workOrdersData?.data?.workOrders) {
      const workOrders = Array.isArray(workOrdersData.data.workOrders) ? workOrdersData.data.workOrders : [];
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
    
    // Handle analytics data
    if (analyticsData && analyticsData.data && analyticsData.data.timeTracking) {
      const totalTimeHours = analyticsData.data.timeTracking.totalHours || 0;
      const geofenceViolations = analyticsData.data.timeTracking.geofenceViolations || 0;
      
      setStats(prevStats => ({
        ...prevStats,
        totalTimeHours,
        geofenceViolations
      }));
    }
  }, [buildingsData, usersData, workOrdersData, analyticsData]);

  // Get building status with actual work order counts
  const buildingStatusData = buildingsData?.data?.buildings?.map(building => {
    const buildingWorkOrders = Array.isArray(workOrdersData?.data?.workOrders) 
      ? workOrdersData.data.workOrders.filter(wo => wo.building?._id === building._id) 
      : [];
    return {
      id: building._id,
      name: building.name,
      status: building.status || 'operational',
      workOrders: buildingWorkOrders.length,
    };
  }) || [];

  // Get worker availability with actual names and work order counts
  const workerAvailabilityData = (Array.isArray(usersData?.data?.users) ? usersData.data.users : []).map(worker => {
    const assignedOrders = Array.isArray(workOrdersData?.data?.workOrders)
      ? workOrdersData.data.workOrders.filter(wo =>
          wo.assignedTo?.some(assignment => assignment.worker?._id === worker._id)
        )
      : [];

    return {
      id: worker._id,
      name: worker.name || `${worker.firstName || ''} ${worker.lastName || ''}`.trim() || 'Unknown Worker',
      status: worker.workerProfile?.status || 'unavailable',
      assignedWorkOrders: assignedOrders.length,
    };
  }) || [];

  const isLoading = isLoadingBuildings || isLoadingUsers || isLoadingWorkOrders;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <ResponsiveContainer>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
      {(isLoading || isLoadingAnalytics) && <LinearProgress />}
      {(buildingsError || usersError || workOrdersError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Some dashboard data failed to load. You can continue using the page.
        </Alert>
      )}
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {safeFormatDate(new Date(), 'full')}
      </Typography>
      
      {/* Date Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Start Date"
              value={dateRange.startDate}
              onChange={(newValue) => handleDateChange('startDate', newValue)}
              renderInput={(params) => <TextField {...params} />}
            />
            <DatePicker
              label="End Date"
              value={dateRange.endDate}
              onChange={(newValue) => handleDateChange('endDate', newValue)}
              renderInput={(params) => <TextField {...params} />}
              minDate={dateRange.startDate}
            />
          </LocalizationProvider>
          <Button 
            variant="contained" 
            onClick={handleApplyFilters}
            sx={{ ml: 1 }}
          >
            Apply Filters
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleResetFilters}
          >
            Reset
          </Button>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Total Buildings"
            value={stats.totalBuildings}
            icon={<BuildingIcon />}
            color={theme.palette.primary.main}
            onClick={() => navigate('/buildings')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Total Workers"
            value={stats.totalWorkers}
            icon={<PeopleIcon />}
            color={theme.palette.info.main}
            onClick={() => navigate('/workers')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Pending Orders"
            value={stats.pendingWorkOrders}
            icon={<WarningIcon />}
            color={theme.palette.warning.main}
            onClick={() => navigate('/work-orders?status=pending')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="In Progress"
            value={stats.inProgressWorkOrders}
            icon={<InfoIcon />}
            color={theme.palette.info.main}
            onClick={() => navigate('/work-orders?status=in_progress')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Completed"
            value={stats.completedWorkOrders}
            icon={<CheckCircleIcon />}
            color={theme.palette.success.main}
            onClick={() => navigate('/work-orders?status=completed')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Time Tracking"
            value={`${stats.totalTimeHours} hrs`}
            icon={<TimeTrackingIcon />}
            color={theme.palette.warning.dark}
            subtitle={`${stats.geofenceViolations} Geofence Violations`}
            onClick={() => navigate('/time-tracking')}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <DetailedCleaningCard />
        </Grid>

        {/* Detailed Cleaning Jobs View */}
        <Grid item xs={12}>
          <DetailedCleaningJobsView />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Alerts for reminders and calls */}
        <Grid item xs={12} md={6}>
          <DashboardAlerts />
        </Grid>

        {/* Pending & Postponed Notes */}
        <Grid item xs={12} md={6}>
          <PendingNotes />
        </Grid>

        {/* Weekly Revenue Dashboard */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ p: 0 }}>
              <WeeklyRevenue />
            </CardContent>
          </Card>
        </Grid>

        {/* Weekly Production by Customer */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ p: 0 }}>
              <WeeklyProduction />
            </CardContent>
          </Card>
        </Grid>

        {/* Weekly Production by Worker */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ p: 0 }}>
              <WeeklyProductionByWorker />
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Test Panel */}
        <Grid item xs={12}>
          <NotificationTest />
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
        </ResponsiveContainer>
      <CleaningServicesModal 
        open={isCleaningModalOpen} 
        handleClose={handleCloseCleaningModal} 
        workOrders={cleaningData?.data?.workOrders} 
      />
    </Box>
  );
};

export default Dashboard;

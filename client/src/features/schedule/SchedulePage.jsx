import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useGetWorkOrdersQuery } from '../workOrders/workOrdersApiSlice';
import { useGetWorkersQuery } from '../workers/workersApiSlice';
import ScheduleCalendar from './ScheduleCalendar';

const SchedulePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { enqueueSnackbar } = useSnackbar();
  
  // State for view and filters
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState('');
  
  // Fetch data
  const { 
    data: workOrders = [], 
    isLoading: isLoadingWorkOrders, 
    isError: isWorkOrdersError,
    error: workOrdersError
  } = useGetWorkOrdersQuery({
    status: 'pending,in_progress',
    limit: 1000,
    page: 1,
  });
  
  const { 
    data: workersData, 
    isLoading: isLoadingWorkers, 
    isError: isWorkersError,
    error: workersError
  } = useGetWorkersQuery({
    status: 'active',
    limit: 1000,
    page: 1,
  });
  
  // Process workers data
  const workers = useMemo(() => {
    if (!workersData?.data) return [];
    return workersData.data.map(worker => ({
      ...worker,
      fullName: `${worker.firstName} ${worker.lastName}`
    }));
  }, [workersData]);
  
  // Handle errors
  if (isWorkOrdersError || isWorkersError) {
    const error = workOrdersError || workersError;
    enqueueSnackbar(error?.data?.message || 'Error loading data', { variant: 'error' });
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography color="error">
          Error loading schedule data. Please try again later.
        </Typography>
      </Container>
    );
  }
  
  // Loading state
  if (isLoadingWorkOrders || isLoadingWorkers) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }
  
  // Handle view change
  const handleViewChange = (event, newView) => {
    setView(newView);
  };
  
  // Handle date navigation
  const handleNavigate = (newDate) => {
    setDate(newDate);
  };
  
  // Handle worker selection
  const handleWorkerChange = (event) => {
    setSelectedWorker(event.target.value);
  };
  
  // Handle work order selection
  const handleWorkOrderChange = (event) => {
    setSelectedWorkOrder(event.target.value);
  };
  
  // Handle check in/out callbacks
  const handleCheckIn = (scheduleId) => {
    console.log('Checked in schedule:', scheduleId);
    // Additional logic can be added here if needed
  };
  
  const handleCheckOut = (scheduleId) => {
    console.log('Checked out schedule:', scheduleId);
    // Additional logic can be added here if needed
  };

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" component="h1" gutterBottom>
            Work Schedule
          </Typography>
          
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Worker</InputLabel>
                  <Select
                    value={selectedWorker}
                    onChange={handleWorkerChange}
                    label="Filter by Worker"
                  >
                    <MenuItem value="">All Workers</MenuItem>
                    {workers.map((worker) => (
                      <MenuItem key={worker._id} value={worker._id}>
                        {worker.fullName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Work Order</InputLabel>
                  <Select
                    value={selectedWorkOrder}
                    onChange={handleWorkOrderChange}
                    label="Filter by Work Order"
                  >
                    <MenuItem value="">All Work Orders</MenuItem>
                    {workOrders.map((wo) => (
                      <MenuItem key={wo._id} value={wo._id}>
                        {wo.workType} - {wo.building?.name || 'N/A'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {!isMobile && (
                <Grid item xs={12} md={6}>
                  <Tabs
                    value={view}
                    onChange={handleViewChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ '& .MuiTab-root': { minWidth: 80 } }}
                  >
                    <Tab label="Day" value="day" />
                    <Tab label="Week" value="week" />
                    <Tab label="Month" value="month" />
                  </Tabs>
                </Grid>
              )}
            </Grid>
          </Paper>
          
          <Paper sx={{ p: 2, height: 'calc(100vh - 250px)', minHeight: 500 }}>
            <ScheduleCalendar
              view={view}
              onView={setView}
              date={date}
              onNavigate={handleNavigate}
              workers={workers}
              workOrders={workOrders}
              selectedWorker={selectedWorker}
              onSelectWorker={setSelectedWorker}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SchedulePage;

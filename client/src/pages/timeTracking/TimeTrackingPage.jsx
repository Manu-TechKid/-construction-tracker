import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Tabs, 
  Tab, 
  Paper, 
  Typography, 
  CircularProgress,
  Button,
  Divider,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  LocationOn as LocationIcon, 
  AccessTime as TimeIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useGetWorkerStatusQuery } from '../../features/workers/workersApiSlice';
import { useCheckInWorkerMutation, useCheckOutWorkerMutation } from '../../features/timeTracking/timeTrackingApiSlice';
import { useGetWorkerLocationsQuery } from '../schedule/scheduleApiSlice';
import LocationHistoryMap from './LocationHistoryMap';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../hooks/useAuth';

const TimeTrackingPage = () => {
  const { workerId } = useParams();
  const [activeTab, setActiveTab] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { enqueueSnackbar } = useSnackbar();
  const { auth } = useAuth();

  // Fetch worker status
  const { 
    data: workerStatus, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useGetWorkerStatusQuery(workerId, {
    pollingInterval: 30000, // Poll every 30 seconds
  });

  // Mutations
  const [checkIn, { isLoading: isCheckingIn }] = useCheckInWorkerMutation();
  const [checkOut, { isLoading: isCheckingOut }] = useCheckOutWorkerMutation();

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle check in
  const handleCheckIn = async () => {
    try {
      await checkIn({ workerId }).unwrap();
      enqueueSnackbar('Checked in successfully', { variant: 'success' });
      refetch();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || 'Failed to check in', { variant: 'error' });
    }
  };

  // Handle check out
  const handleCheckOut = async () => {
    try {
      await checkOut({ workerId }).unwrap();
      enqueueSnackbar('Checked out successfully', { variant: 'success' });
      refetch();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || 'Failed to check out', { variant: 'error' });
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    refetch();
    setLastUpdated(new Date());
    enqueueSnackbar('Location data refreshed', { variant: 'info' });
  };

  // Show loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (isError) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" color="error" gutterBottom>
          Error loading worker data
        </Typography>
        <Typography color="textSecondary" paragraph>
          {error?.data?.message || 'Unable to load worker information. Please try again.'}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={refetch}
          startIcon={<RefreshIcon />}
        >
          Retry
        </Button>
      </Paper>
    );
  }

  // Destructure worker status
  const { 
    currentSession, 
    todayStats, 
    lastLocation, 
    status 
  } = workerStatus || {};

  // Format last updated time
  const lastUpdatedTime = formatDistanceToNow(parseISO(lastLocation?.timestamp || new Date().toISOString()), { 
    addSuffix: true 
  });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" component="h1">
            Time Tracking
          </Typography>
          <Box>
            <Tooltip title="Refresh data">
              <IconButton onClick={handleRefresh} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            {status === 'checked_in' ? (
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={handleCheckOut}
                disabled={isCheckingOut}
                startIcon={<TimeIcon />}
                sx={{ ml: 1 }}
              >
                {isCheckingOut ? 'Checking Out...' : 'Check Out'}
              </Button>
            ) : (
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                startIcon={<TimeIcon />}
                sx={{ ml: 1 }}
              >
                {isCheckingIn ? 'Checking In...' : 'Check In'}
              </Button>
            )}
          </Box>
        </Box>
        
        <Divider />
      </Box>

      {/* Status Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader 
              title="Current Status" 
              avatar={
                <Avatar sx={{ bgcolor: status === 'checked_in' ? 'success.main' : 'grey.500' }}>
                  {status === 'checked_in' ? <CheckCircleIcon /> : <ErrorIcon />}
                </Avatar>
              }
            />
            <CardContent>
              <Typography variant="h5" component="div" gutterBottom>
                {status === 'checked_in' ? 'Checked In' : 'Checked Out'}
              </Typography>
              {currentSession && (
                <List dense disablePadding>
                  <ListItem disableGutters>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                        <TimeIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Current Session" 
                      secondary={
                        <>
                          <Box component="span" display="block">
                            {format(parseISO(currentSession.startTime), 'PPpp')}
                          </Box>
                          <Box component="span" fontSize="0.75rem" color="text.secondary">
                            Duration: {formatDistanceToNow(parseISO(currentSession.startTime))}
                          </Box>
                        </>
                      } 
                    />
                  </ListItem>
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader 
              title="Today's Summary" 
              avatar={
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <InfoIcon />
                </Avatar>
              }
            />
            <CardContent>
              {todayStats ? (
                <List dense disablePadding>
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="Total Hours" 
                      secondary={`${todayStats.hoursWorked} hours`} 
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="Jobs Completed" 
                      secondary={todayStats.jobsCompleted} 
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="Breaks Taken" 
                      secondary={todayStats.breaksTaken} 
                    />
                  </ListItem>
                </List>
              ) : (
                <Typography color="textSecondary">No data available for today</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader 
              title="Last Known Location" 
              avatar={
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <LocationIcon />
                </Avatar>
              }
            />
            <CardContent>
              {lastLocation ? (
                <List dense disablePadding>
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="Last Updated" 
                      secondary={
                        <>
                          <Box component="span" display="block">
                            {format(parseISO(lastLocation.timestamp), 'PPpp')}
                          </Box>
                          <Box component="span" fontSize="0.75rem" color="text.secondary">
                            {lastUpdatedTime}
                          </Box>
                        </>
                      } 
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="Accuracy" 
                      secondary={`${Math.round(lastLocation.accuracy)} meters`} 
                    />
                  </ListItem>
                  {lastLocation.activity && (
                    <ListItem disableGutters>
                      <ListItemText 
                        primary="Activity" 
                        secondary={lastLocation.activity.replace(/_/g, ' ')} 
                      />
                    </ListItem>
                  )}
                </List>
              ) : (
                <Typography color="textSecondary">No location data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Map View" />
          <Tab label="Time Logs" />
          <Tab label="Reports" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ mb: 4 }}>
        {activeTab === 0 && (
          <LocationHistoryMap 
            workerId={workerId}
            locations={workerStatus?.locationHistory || []}
          />
        )}
        
        {activeTab === 1 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Time Logs
            </Typography>
            <Typography color="textSecondary">
              Time logs will be displayed here
            </Typography>
          </Paper>
        )}
        
        {activeTab === 2 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Reports
            </Typography>
            <Typography color="textSecondary">
              Reports will be displayed here
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default TimeTrackingPage;

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Divider, 
  Chip,
  CircularProgress,
  useTheme
} from '@mui/material';
import { 
  AccessTime as TimeIcon, 
  LocationOn as LocationIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useSnackbar } from 'notistack';
import { 
  useCheckInWorkerMutation, 
  useCheckOutWorkerMutation,
  useGetWorkerSchedulesQuery
} from '../schedule/scheduleApiSlice';

const WorkerTimeTracker = ({ workerId, workerStatus }) => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // RTK Query hooks
  const [checkInWorker, { isLoading: isCheckingIn }] = useCheckInWorkerMutation();
  const [checkOutWorker, { isLoading: isCheckingOut }] = useCheckOutWorkerMutation();
  
  // Get worker's schedules
  const { data: schedulesData } = useGetWorkerSchedulesQuery(
    { workerId, status: 'upcoming' },
    { skip: !workerId }
  );
  
  const upcomingSchedule = schedulesData?.data?.[0];
  const isCheckedIn = workerStatus?.status === 'checked-in';
  const currentSession = workerStatus?.currentSession;

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update elapsed time when checked in
  useEffect(() => {
    let interval;
    if (isCheckedIn && currentSession?.startTime) {
      const startTime = parseISO(currentSession.startTime);
      setElapsedTime(Math.floor((new Date() - startTime) / 1000));
      
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    
    return () => clearInterval(interval);
  }, [isCheckedIn, currentSession?.startTime]);

  // Format time in HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const handleCheckIn = async () => {
    try {
      // Get current location
      const position = await getCurrentPosition();
      
      await checkInWorker({
        workerId,
        scheduleId: upcomingSchedule?._id,
        workOrderId: upcomingSchedule?.workOrder?._id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        notes: `Checked in for ${upcomingSchedule?.title || 'unscheduled work'}`
      }).unwrap();
      
      enqueueSnackbar('Successfully checked in', { variant: 'success' });
      setIsTracking(true);
    } catch (error) {
      console.error('Check-in error:', error);
      enqueueSnackbar(error?.data?.message || 'Failed to check in', { variant: 'error' });
    }
  };

  const handleCheckOut = async () => {
    try {
      // Get current location
      const position = await getCurrentPosition();
      
      await checkOutWorker({
        workerId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        notes: 'Checked out'
      }).unwrap();
      
      enqueueSnackbar('Successfully checked out', { variant: 'success' });
      setIsTracking(false);
    } catch (error) {
      console.error('Check-out error:', error);
      enqueueSnackbar(error?.data?.message || 'Failed to check out', { variant: 'error' });
    }
  };

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
      }
      
      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          let errorMessage = 'Unable to retrieve your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location services.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'The request to get user location timed out.';
              break;
            default:
              errorMessage = 'An unknown error occurred.';
          }
          enqueueSnackbar(errorMessage, { variant: 'warning' });
          reject(new Error(errorMessage));
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Left side - Time tracking card */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" component="div">
                  Time Tracking
                </Typography>
                <Chip 
                  label={isCheckedIn ? 'Checked In' : 'Checked Out'} 
                  color={isCheckedIn ? 'success' : 'default'}
                  size="small"
                  icon={isCheckedIn ? <CheckCircleIcon /> : <ScheduleIcon />}
                />
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Current time */}
              <Box mb={3} textAlign="center">
                <Typography variant="caption" color="textSecondary">Current Time</Typography>
                <Typography variant="h4">
                  {format(currentTime, 'h:mm:ss a')}
                </Typography>
              </Box>
              
              {/* Elapsed time */}
              {(isCheckedIn || isTracking) && (
                <Box mb={3} textAlign="center">
                  <Typography variant="caption" color="textSecondary">
                    Time Worked
                  </Typography>
                  <Typography variant="h3" color="primary">
                    {formatTime(elapsedTime)}
                  </Typography>
                </Box>
              )}
              
              {/* Action buttons */}
              <Box display="flex" justifyContent="center" mt={4} gap={2}>
                {!isCheckedIn ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleCheckIn}
                    disabled={isCheckingIn}
                    startIcon={<CheckCircleIcon />}
                    size="large"
                  >
                    {isCheckingIn ? 'Checking In...' : 'Check In'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleCheckOut}
                    disabled={isCheckingOut}
                    startIcon={<ScheduleIcon />}
                    size="large"
                  >
                    {isCheckingOut ? 'Checking Out...' : 'Check Out'}
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Right side - Schedule info */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                {currentSession ? 'Current Session' : 'Upcoming Schedule'}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              {currentSession ? (
                <Box>
                  <Box display="flex" alignItems="center" mb={2}>
                    <WorkIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="body1">
                      {currentSession.schedule?.title || 'No schedule assigned'}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" mb={1}>
                    <TimeIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="textSecondary">
                      Started {formatDistanceToNow(parseISO(currentSession.startTime))} ago
                    </Typography>
                  </Box>
                  
                  {currentSession.currentLocation?.address && (
                    <Box display="flex" alignItems="flex-start" mt={2}>
                      <LocationIcon color="action" sx={{ mr: 1, mt: 0.5 }} />
                      <Typography variant="body2" color="textSecondary">
                        {currentSession.currentLocation.address}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : upcomingSchedule ? (
                <Box>
                  <Box display="flex" alignItems="center" mb={2}>
                    <WorkIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="body1">
                      {upcomingSchedule.title}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" mb={1}>
                    <TimeIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="textSecondary">
                      {format(parseISO(upcomingSchedule.startTime), 'MMM d, yyyy h:mm a')} - 
                      {format(parseISO(upcomingSchedule.endTime), 'h:mm a')}
                    </Typography>
                  </Box>
                  
                  {upcomingSchedule.location && (
                    <Box display="flex" alignItems="flex-start" mt={2}>
                      <LocationIcon color="action" sx={{ mr: 1, mt: 0.5 }} />
                      <Typography variant="body2" color="textSecondary">
                        {upcomingSchedule.location}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box textAlign="center" py={3}>
                  <Typography variant="body1" color="textSecondary">
                    No upcoming schedules found
                  </Typography>
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    When you have an upcoming schedule, it will appear here.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
          
          {/* Location permission status */}
          <Box mt={2}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                bgcolor: theme.palette.grey[100],
                borderRadius: 1
              }}
            >
              <Box display="flex" alignItems="center">
                <LocationIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  {navigator.geolocation ? 
                    'Location services are enabled for time tracking' : 
                    'Please enable location services in your browser settings for accurate time tracking'}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default WorkerTimeTracker;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Container,
  Grid,
  Paper
} from '@mui/material';
import {
  PlayArrow as ClockInIcon,
  Stop as ClockOutIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

import { useAuth } from '../../hooks/useAuth';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import {
  useClockInMutation,
  useClockOutMutation,
  useGetWorkerStatusQuery
} from '../../features/timeTracking/timeTrackingApiSlice';

const MobileTimeTracker = () => {
  const { user } = useAuth();
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // API calls
  const { data: buildingsData } = useGetBuildingsQuery();
  const { data: statusData, refetch: refetchStatus } = useGetWorkerStatusQuery(user?.id);
  const [clockIn, { isLoading: isClockingIn }] = useClockInMutation();
  const [clockOut, { isLoading: isClockingOut }] = useClockOutMutation();

  const buildings = buildingsData?.data?.buildings || [];
  const workerStatus = statusData?.data || {};
  const isActive = workerStatus.isActive || false;
  const activeSession = workerStatus.activeSession;

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleClockIn = async () => {
    if (!selectedBuilding) {
      toast.error('Please select a building first');
      return;
    }

    try {
      await clockIn({
        worker: user.id,
        building: selectedBuilding,
        clockInTime: new Date().toISOString()
      }).unwrap();
      
      toast.success('✅ Clocked in successfully!');
      refetchStatus();
    } catch (error) {
      console.error('Clock in error:', error);
      toast.error(`❌ Failed to clock in: ${error?.data?.message || error.message}`);
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOut({
        sessionId: activeSession?._id,
        clockOutTime: new Date().toISOString()
      }).unwrap();
      
      toast.success('✅ Clocked out successfully!');
      refetchStatus();
      setSelectedBuilding('');
    } catch (error) {
      console.error('Clock out error:', error);
      toast.error(`❌ Failed to clock out: ${error?.data?.message || error.message}`);
    }
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '0:00:00';
    
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h5" gutterBottom>
          📱 Mobile Time Tracker
        </Typography>
        <Typography variant="h6">
          {format(currentTime, 'EEEE, MMMM do, yyyy')}
        </Typography>
        <Typography variant="h4" sx={{ fontFamily: 'monospace', mt: 1 }}>
          {format(currentTime, 'HH:mm:ss')}
        </Typography>
      </Paper>

      {/* Worker Info */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              {user?.firstName} {user?.lastName}
            </Typography>
          </Box>
          
          {isActive && activeSession && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Currently Working</strong><br/>
                Started: {format(new Date(activeSession.clockInTime), 'HH:mm:ss')}<br/>
                Duration: {formatDuration(activeSession.clockInTime)}
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Building Selection */}
      {!isActive && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <FormControl fullWidth>
              <InputLabel>Select Building</InputLabel>
              <Select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                label="Select Building"
              >
                {buildings.map((building) => (
                  <MenuItem key={building._id} value={building._id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationIcon sx={{ mr: 1 }} />
                      {building.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      )}

      {/* Active Session Info */}
      {isActive && activeSession && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6">
                {activeSession.building?.name || 'Unknown Building'}
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Clock In Time
                </Typography>
                <Typography variant="body1">
                  {format(new Date(activeSession.clockInTime), 'HH:mm:ss')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="h6" color="success.main" sx={{ fontFamily: 'monospace' }}>
                  {formatDuration(activeSession.clockInTime)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {!isActive ? (
          <Button
            fullWidth
            variant="contained"
            size="large"
            color="success"
            startIcon={isClockingIn ? <CircularProgress size={20} color="inherit" /> : <ClockInIcon />}
            onClick={handleClockIn}
            disabled={isClockingIn || !selectedBuilding}
            sx={{ py: 2, fontSize: '1.2rem' }}
          >
            {isClockingIn ? 'Clocking In...' : 'CLOCK IN'}
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            size="large"
            color="error"
            startIcon={isClockingOut ? <CircularProgress size={20} color="inherit" /> : <ClockOutIcon />}
            onClick={handleClockOut}
            disabled={isClockingOut}
            sx={{ py: 2, fontSize: '1.2rem' }}
          >
            {isClockingOut ? 'Clocking Out...' : 'CLOCK OUT'}
          </Button>
        )}
      </Box>

      {/* Status Indicator */}
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Chip
          icon={<TimeIcon />}
          label={isActive ? 'WORKING' : 'NOT WORKING'}
          color={isActive ? 'success' : 'default'}
          variant={isActive ? 'filled' : 'outlined'}
          size="large"
        />
      </Box>
    </Container>
  );
};

export default MobileTimeTracker;

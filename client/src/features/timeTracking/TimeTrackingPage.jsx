import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Container,
  Grid,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  AccessTime as TimeIcon, 
  Map as MapIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';
import WorkerTimeTracker from './WorkerTimeTracker';
import LocationHistoryMap from './LocationHistoryMap';
import { useGetWorkerLocationsQuery } from '../schedule/scheduleApiSlice';

tabPanelStyles = {
  p: 2,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0, // Fix for scrolling in flex container
};

const TimeTrackingPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { workerId } = useParams();
  
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState('7days');
  
  // Get worker ID from params or use current user's ID
  const targetWorkerId = workerId || user?._id;
  
  // Fetch worker's location history
  const { 
    data: locationHistory = [], 
    isLoading: isLocationsLoading, 
    isError: isLocationsError, 
    error: locationsError,
    refetch: refetchLocations 
  } = useGetWorkerLocationsQuery({
    workerId: targetWorkerId,
    days: dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 1
  });
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle date range change
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };
  
  // Show error message if location access fails
  useEffect(() => {
    if (isLocationsError) {
      enqueueSnackbar(
        `Error loading location data: ${locationsError?.data?.message || 'Please try again later.'}`, 
        { variant: 'error' }
      );
    }
  }, [isLocationsError, locationsError, enqueueSnackbar]);
  
  // Show warning if location services are not enabled
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(permissionStatus => {
          if (permissionStatus.state === 'denied') {
            enqueueSnackbar(
              'Location access is disabled. Please enable location services for this site to track your time and location.',
              { variant: 'warning', autoHideDuration: 10000 }
            );
          }
          
          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') {
              enqueueSnackbar('Location access granted!', { variant: 'success' });
            } else if (permissionStatus.state === 'denied') {
              enqueueSnackbar(
                'Location access is required for time tracking. Please enable location services in your browser settings.',
                { variant: 'error', autoHideDuration: 10000 }
              );
            }
          };
        })
        .catch(error => {
          console.error('Error checking geolocation permission:', error);
        });
    }
  }, [enqueueSnackbar]);
  
  // Main content based on tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Time Tracker
        return (
          <Box sx={tabPanelStyles}>
            <WorkerTimeTracker 
              workerId={targetWorkerId}
              onRefresh={refetchLocations}
            />
          </Box>
        );
        
      case 1: // Location History
        return (
          <Box sx={tabPanelStyles}>
            <LocationHistoryMap 
              workerId={targetWorkerId}
              locations={locationHistory}
              onRefresh={refetchLocations}
              isLoading={isLocationsLoading}
              isError={isLocationsError}
              error={locationsError}
            />
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Time & Location Tracking
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Track your work hours and location history
        </Typography>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant={isMobile ? 'fullWidth' : 'standard'}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTabs-flexContainer': {
              justifyContent: isMobile ? 'space-between' : 'flex-start',
            },
          }}
        >
          <Tab 
            icon={<TimeIcon />} 
            iconPosition="start"
            label="Time Tracker" 
            sx={{ minHeight: 64, minWidth: isMobile ? 'auto' : 200 }}
          />
          <Tab 
            icon={<MapIcon />} 
            iconPosition="start"
            label="Location History" 
            sx={{ minHeight: 64, minWidth: isMobile ? 'auto' : 200 }}
          />
        </Tabs>
        
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, minHeight: '60vh' }}>
          {renderTabContent()}
        </Box>
      </Paper>
      
      {/* Help/Info Section */}
      <Box component="aside" sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          How to use Time & Location Tracking
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              <strong>Time Tracker</strong>
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>View your current or upcoming tasks</li>
              <li>Start/stop time tracking with location</li>
              <li>See real-time tracking duration</li>
            </ul>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              <strong>Location History</strong>
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>View your location history on a map</li>
              <li>Filter by date range</li>
              <li>Toggle between path and markers</li>
            </ul>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default TimeTrackingPage;

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { useSnackbar } from 'notistack';
import { useGetWorkerLocationsQuery } from '../schedule/scheduleApiSlice';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const LocationHistoryMap = ({ 
  workerId, 
  locations = [], 
  onRefresh,
  isLoading = false,
  isError = false,
  error = null
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [dateRange, setDateRange] = useState(7);
  const mapRef = useRef(null);
  
  const { data: locationHistory = [], isLoading: isLoadingLocationHistory, isError: isErrorLocationHistory, error: errorLocationHistory } = useGetWorkerLocationsQuery({
    workerId,
    startDate: format(subDays(new Date(), dateRange), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (isError || isErrorLocationHistory) {
      enqueueSnackbar((error || errorLocationHistory)?.message || 'Error loading location history', { variant: 'error' });
    }
  }, [isError, isErrorLocationHistory, error, errorLocationHistory, enqueueSnackbar]);

  const handleDateRangeChange = (event, newValue) => {
    setDateRange(newValue);
  };

  const filteredLocations = React.useMemo(() => {
    if (!locationHistory || locationHistory.length === 0) return [];
    
    const start = startOfDay(subDays(new Date(), dateRange));
    const end = endOfDay(new Date());
    
    return locationHistory.filter(location => {
      const locationDate = new Date(location.timestamp);
      return isWithinInterval(locationDate, { start, end });
    });
  }, [locationHistory, dateRange]);

  if (isLoading || isLoadingLocationHistory) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Typography>Loading map...</Typography>
      </Box>
    );
  }

  if (filteredLocations.length === 0) {
    return (
      <Box sx={{ 
        height: 400, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px dashed #ccc',
        borderRadius: 1
      }}>
        <Typography>No location data available for the selected period</Typography>
      </Box>
    );
  }

  const coordinates = filteredLocations.map(loc => [loc.latitude, loc.longitude]);

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={dateRange}
          onChange={handleDateRangeChange}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Today" value={1} />
          <Tab label="7 Days" value={7} />
          <Tab label="30 Days" value={30} />
          <Tab label="90 Days" value={90} />
        </Tabs>
      </Box>
      
      <Box sx={{ height: 500, width: '100%', position: 'relative' }}>
        <MapContainer
          center={[coordinates[0][0], coordinates[0][1]]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Path */}
          {coordinates.length > 1 && (
            <Polyline
              positions={coordinates}
              color="#3b82f6"
              weight={4}
              opacity={0.7}
            />
          )}
          
          {/* Markers */}
          {filteredLocations.map((location, index) => (
            <Marker 
              key={index} 
              position={[location.latitude, location.longitude]}
              icon={L.icon({
                iconUrl: index === 0 
                  ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png'
                  : index === filteredLocations.length - 1
                  ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'
                  : 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                shadowSize: [41, 41]
              })}
            >
              <Popup>
                <div>
                  <strong>Time:</strong> {format(new Date(location.timestamp), 'PPpp')}<br />
                  <strong>Accuracy:</strong> {Math.round(location.accuracy)}m
                  {location.activity && (
                    <><br /><strong>Activity:</strong> {location.activity}</>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Box>
    </Paper>
  );
};

export default LocationHistoryMap;

import React from 'react';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { CleanHands } from '@mui/icons-material';
import { useGetCleaningWorkOrdersForWeekQuery } from '../../features/workOrders/workOrdersApiSlice';

const CleaningServicesCard = ({ onClick }) => {
  const { data, isLoading, isError } = useGetCleaningWorkOrdersForWeekQuery();

  const pendingCount = data?.count || 0;

  return (
    <Card sx={{ display: 'flex', alignItems: 'center', p: 2, cursor: 'pointer' }} onClick={onClick}>
      <Box sx={{ flexShrink: 0, mr: 2 }}>
        <CleanHands sx={{ fontSize: 40, color: 'primary.main' }} />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h6">Cleaning Services</Typography>
        {isLoading ? (
          <CircularProgress size={24} />
        ) : isError ? (
          <Typography color="error">Error</Typography>
        ) : (
          <Typography variant="h4">{pendingCount}</Typography>
        )}
        <Typography variant="subtitle2" color="text.secondary">Outstanding Jobs</Typography>
      </Box>
    </Card>
  );
};

export default CleaningServicesCard;

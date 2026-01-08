import React from 'react';
import { Card, CardContent, Typography, Box, List, ListItem, ListItemText, Divider, Chip, CircularProgress, Tooltip } from '@mui/material';
import { ErrorOutline as ErrorOutlineIcon } from '@mui/icons-material';
import { useGetCleaningWorkOrdersForWeekQuery } from '../../features/workOrders/workOrdersApiSlice';

const DetailedCleaningCard = () => {
  const { data, isLoading, isError } = useGetCleaningWorkOrdersForWeekQuery();

  if (isLoading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <Tooltip title="Error loading cleaning jobs data">
            <ErrorOutlineIcon color="error" sx={{ fontSize: 40 }} />
          </Tooltip>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Error loading data</Typography>
        </CardContent>
      </Card>
    );
  }

  const { pending = [], completed = [], totalCompletedPrice = 0 } = data?.data || {};

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Weekly Cleaning Jobs</Typography>
        
        <Typography variant="subtitle1" sx={{ mt: 2 }}>Pending ({pending.length})</Typography>
        <List dense>
          {pending.length > 0 ? pending.map(job => (
            <ListItem key={job._id} secondaryAction={<Chip label={`$${job.price || 0}`} />}>
              <ListItemText primary={job.building?.name || 'N/A'} secondary={new Date(job.scheduledDate).toLocaleDateString()} />
            </ListItem>
          )) : <Typography variant="body2" color="text.secondary">No pending jobs.</Typography>}
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1">Completed ({completed.length})</Typography>
        <List dense>
          {completed.length > 0 ? completed.map(job => (
            <ListItem key={job._id} secondaryAction={<Chip label={`$${job.price || 0}`} color="success" />}>
              <ListItemText primary={job.building?.name || 'N/A'} secondary={new Date(job.scheduledDate).toLocaleDateString()} />
            </ListItem>
          )) : <Typography variant="body2" color="text.secondary">No completed jobs this week.</Typography>}
        </List>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="h6">Total for Completed:</Typography>
          <Typography variant="h6" color="success.main">{`$${totalCompletedPrice.toFixed(2)}`}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DetailedCleaningCard;

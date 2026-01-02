import React from 'react';
import { useGetActivityLogQuery } from '../../features/activityLog/activityLogApiSlice';
import { useAuth } from '../../hooks/useAuth';
import { Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert } from '@mui/material';
import { format } from 'date-fns';

const ActivityLog = () => {
  const { user } = useAuth();
  const { data, isLoading, error } = useGetActivityLogQuery();

  if (user.role !== 'superuser') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You do not have permission to view this page.</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Failed to load activity log.</Alert>;
  }

  const activities = data?.data?.activities || [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Activity Log</Typography>
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Entity ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activities.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>{format(new Date(log.timestamp), 'Pp')}</TableCell>
                    <TableCell>{log.user?.name || 'N/A'}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.entity}</TableCell>
                    <TableCell>{log.entityId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ActivityLog;

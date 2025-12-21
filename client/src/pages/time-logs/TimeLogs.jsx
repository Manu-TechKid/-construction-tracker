import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Alert, Chip } from '@mui/material';
import { useGetAllTimeLogsQuery } from '../../features/time-logs/timeLogsApiSlice';
import { format } from 'date-fns';

const TimeLogs = () => {
  const { data: timeLogsData, isLoading, error } = useGetAllTimeLogsQuery();

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error.data?.message || 'Failed to load time logs'}</Alert>;
  }

  const timeLogs = timeLogsData?.data?.timeLogs || [];

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Employee Time Logs
      </Typography>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell>Signature</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {timeLogs.map((log) => (
              <TableRow key={log._id}>
                <TableCell>{log.user?.name || 'N/A'}</TableCell>
                <TableCell>{format(new Date(log.timestamp), 'PPP')}</TableCell>
                <TableCell>{format(new Date(log.timestamp), 'p')}</TableCell>
                <TableCell>
                  <Chip
                    label={log.type}
                    color={log.type === 'clock-in' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{log.notes}</TableCell>
                <TableCell>
                  {log.signature ? (
                    <img src={log.signature} alt="Signature" style={{ height: '40px', border: '1px solid #ccc' }} />
                  ) : (
                    'N/A'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TimeLogs;

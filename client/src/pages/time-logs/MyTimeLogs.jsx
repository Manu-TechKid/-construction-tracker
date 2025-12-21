import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Alert, Chip } from '@mui/material';
import { useGetMyTimeLogsQuery } from '../../features/time-logs/timeLogsApiSlice';
import { format } from 'date-fns';

const MyTimeLogs = () => {
  const { data: timeLogsData, isLoading, error } = useGetMyTimeLogsQuery();

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error.data?.message || 'Failed to load your time logs'}</Alert>;
  }

  const timeLogs = timeLogsData?.data?.timeLogs || [];

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        My Time Logs
      </Typography>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
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

export default MyTimeLogs;

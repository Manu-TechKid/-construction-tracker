import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Alert, Chip, IconButton, Tooltip } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useGetAllTimeLogsQuery, useDeleteTimeLogMutation } from '../../features/time-logs/timeLogsApiSlice';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const TimeLogs = () => {
  const { data: timeLogsData, isLoading, error } = useGetAllTimeLogsQuery();
  const [deleteTimeLog] = useDeleteTimeLogMutation();

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this time log?')) {
      try {
        await deleteTimeLog(id).unwrap();
        toast.success('Time log deleted successfully');
      } catch (err) {
        toast.error(err.data?.message || 'Failed to delete time log');
      }
    }
  };

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
              <TableCell>Actions</TableCell>
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
                <TableCell>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDelete(log._id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
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

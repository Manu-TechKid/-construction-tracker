import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Alert, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useGetAllTimeLogsQuery, useDeleteTimeLogMutation, useUpdateTimeLogMutation } from '../../features/time-logs/timeLogsApiSlice';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';

const TimeLogs = () => {
  const { data: timeLogsData, isLoading, error } = useGetAllTimeLogsQuery();
  const [deleteTimeLog] = useDeleteTimeLogMutation();
  const [updateTimeLog] = useUpdateTimeLogMutation();

  const [editLog, setEditLog] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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

  const handleEdit = (log) => {
    setEditLog({ ...log, timestamp: new Date(log.timestamp) });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editLog) return;
    try {
      await updateTimeLog({ id: editLog._id, timestamp: editLog.timestamp.toISOString(), notes: editLog.notes }).unwrap();
      toast.success('Time log updated successfully');
      setEditDialogOpen(false);
      setEditLog(null);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to update time log');
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
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleEdit(log)} color="primary">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
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
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Time Log</DialogTitle>
        <DialogContent>
          {editLog && (
            <>
              <DateTimePicker
                label="Timestamp"
                value={editLog.timestamp}
                onChange={(newValue) => setEditLog({ ...editLog, timestamp: newValue })}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
              />
              <TextField
                label="Notes"
                value={editLog.notes}
                onChange={(e) => setEditLog({ ...editLog, notes: e.target.value })}
                fullWidth
                margin="normal"
                multiline
                rows={3}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default TimeLogs;

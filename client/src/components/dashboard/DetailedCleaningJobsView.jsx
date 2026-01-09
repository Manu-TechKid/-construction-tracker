import React, { useState, useEffect } from 'react';
import { useGetDetailedCleaningJobsQuery, useUpdateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography, 
  Chip, 
  CircularProgress,
  Alert,
  Button,
  Select,
  MenuItem,
  FormControl
} from '@mui/material';
import { safeFormatDate } from '../../utils/dateUtils';

const DetailedCleaningJobsView = () => {
  const { data: detailedJobsData, isLoading, error } = useGetDetailedCleaningJobsQuery();
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    if (detailedJobsData?.data) {
      const initialStatuses = detailedJobsData.data.reduce((acc, job) => {
        acc[job._id] = job.status;
        return acc;
      }, {});
      setStatuses(initialStatuses);
    }
  }, [detailedJobsData]);

  const handleStatusChange = (jobId, newStatus) => {
    setStatuses(prev => ({ ...prev, [jobId]: newStatus }));
  };

  const handleSaveStatus = async (jobId) => {
    const newStatus = statuses[jobId];
    try {
      await updateWorkOrder({ id: jobId, status: newStatus }).unwrap();
      // Optionally, show a success message
    } catch (err) {
      // Optionally, show an error message
      console.error('Failed to update status:', err);
    }
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error loading detailed cleaning jobs.</Alert>;
  }

  const jobs = Array.isArray(detailedJobsData?.data) ? detailedJobsData.data : [];

  return (
    <TableContainer component={Paper} sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ p: 2 }}>Detailed Cleaning Jobs</Typography>
      <Table sx={{ minWidth: 650 }} aria-label="detailed cleaning jobs table">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Building</TableCell>
            <TableCell>Unit/Apt</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Worker</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Payment Status</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job._id}>
              <TableCell>{safeFormatDate(job.date)}</TableCell>
              <TableCell>{job.building}</TableCell>
              <TableCell>{job.unit}</TableCell>
              <TableCell>{job.description}</TableCell>
              <TableCell>{job.worker}</TableCell>
              <TableCell>
                <FormControl size="small" fullWidth>
                  <Select
                    value={statuses[job._id] || job.status}
                    onChange={(e) => handleStatusChange(job._id, e.target.value)}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </Select>
                </FormControl>
              </TableCell>
              <TableCell>
                <Chip 
                  label={job.paymentStatus} 
                  color={job.paymentStatus === 'Paid' ? 'success' : 'warning'} 
                  size="small" 
                />
              </TableCell>
              <TableCell align="right">{`$${Number(job.price || 0).toFixed(2)}`}</TableCell>
              <TableCell>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleSaveStatus(job._id)}
                  disabled={isUpdating}
                >
                  {isUpdating ? <CircularProgress size={20} /> : 'Save'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DetailedCleaningJobsView;

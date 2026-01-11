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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TextField } from '@mui/material';

const DetailedCleaningJobsView = ({ filters }) => {
  const { buildingId, startDate, endDate } = filters || {};

  const queryParams = {
    buildingId: buildingId || undefined,
    startDate: startDate ? startDate.toISOString() : undefined,
    endDate: endDate ? endDate.toISOString() : undefined,
  };

  const { data: detailedJobsData, isLoading, error } = useGetDetailedCleaningJobsQuery(queryParams, {
    skip: !filters, // Optionally skip if no filters are provided
  });
  const [updateWorkOrder, { isLoading: isUpdating }] = useUpdateWorkOrderMutation();
  const [statuses, setStatuses] = useState({});
  const [serviceDates, setServiceDates] = useState({});

  useEffect(() => {
    if (detailedJobsData?.data) {
      const initialData = detailedJobsData.data.reduce((acc, job) => {
        acc.statuses[job._id] = job.status;
        acc.serviceDates[job._id] = job.serviceDate ? new Date(job.serviceDate) : null;
        return acc;
      }, { statuses: {}, serviceDates: {} });
      setStatuses(initialData.statuses);
      setServiceDates(initialData.serviceDates);
    }
  }, [detailedJobsData]);

  const handleStatusChange = (jobId, newStatus) => {
    setStatuses(prev => ({ ...prev, [jobId]: newStatus }));
  };

  const handleServiceDateChange = (jobId, newDate) => {
    setServiceDates(prev => ({ ...prev, [jobId]: newDate }));
  };

  const handleSave = async (jobId) => {
    const payload = {
      id: jobId,
      status: statuses[jobId],
      serviceDate: serviceDates[jobId],
    };
    try {
      await updateWorkOrder(payload).unwrap();
      // Optionally, show a success message
    } catch (err) {
      // Optionally, show an error message
      console.error('Failed to update job:', err);
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
            <TableCell>Scheduled Date</TableCell>
            <TableCell>Service Date</TableCell>
            <TableCell>Building</TableCell>
            <TableCell>Unit/Apt</TableCell>
            <TableCell>Subcategory</TableCell>
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
              <TableCell>
                <DatePicker
                  value={serviceDates[job._id]}
                  onChange={(newValue) => handleServiceDateChange(job._id, newValue)}
                  renderInput={(params) => <TextField {...params} size="small" />}
                />
              </TableCell>
              <TableCell>{job.building}</TableCell>
              <TableCell>{job.unit}</TableCell>
              <TableCell>{job.subcategory}</TableCell>
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
                  onClick={() => handleSave(job._id)}
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

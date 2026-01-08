import React from 'react';
import { useGetDetailedCleaningJobsQuery } from '../../features/workOrders/workOrdersApiSlice';
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
  Alert
} from '@mui/material';
import { formatDate } from '../../utils/dateUtils';

const DetailedCleaningJobsView = () => {
  const { data: detailedJobsData, isLoading, error } = useGetDetailedCleaningJobsQuery();

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error loading detailed cleaning jobs.</Alert>;
  }

  const jobs = detailedJobsData?.data || [];

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
            <TableCell>Payment Status</TableCell>
            <TableCell align="right">Price</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job._id}>
              <TableCell>{formatDate(job.date)}</TableCell>
              <TableCell>{job.building}</TableCell>
              <TableCell>{job.unit}</TableCell>
              <TableCell>{job.description}</TableCell>
              <TableCell>{job.worker}</TableCell>
              <TableCell>
                <Chip 
                  label={job.paymentStatus} 
                  color={job.paymentStatus === 'Paid' ? 'success' : 'warning'} 
                  size="small" 
                />
              </TableCell>
              <TableCell align="right">{`$${job.price.toFixed(2)}`}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DetailedCleaningJobsView;

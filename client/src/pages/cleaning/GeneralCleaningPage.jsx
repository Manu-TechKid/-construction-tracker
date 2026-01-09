import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import DetailedCleaningJobsView from '../../components/dashboard/DetailedCleaningJobsView';

const GeneralCleaningPage = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        General Cleaning Management
      </Typography>
      <Paper sx={{ p: 2 }}>
        <DetailedCleaningJobsView />
      </Paper>
    </Box>
  );
};

export default GeneralCleaningPage;

import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import BuildingSelector from '../../components/common/BuildingSelector';
import DetailedCleaningJobsView from '../../components/dashboard/DetailedCleaningJobsView';

const GeneralCleaningPage = () => {
  const [filters, setFilters] = useState({
    buildingId: '',
    startDate: null,
    endDate: null,
  });

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        General Cleaning Management
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <BuildingSelector 
              value={filters.buildingId}
              onChange={(e) => handleFilterChange('buildingId', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DatePicker
              label="Start Date"
              value={filters.startDate}
              onChange={(newValue) => handleFilterChange('startDate', newValue)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DatePicker
              label="End Date"
              value={filters.endDate}
              onChange={(newValue) => handleFilterChange('endDate', newValue)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
        </Grid>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <DetailedCleaningJobsView filters={filters} />
      </Paper>
    </Box>
  );
};

export default GeneralCleaningPage;

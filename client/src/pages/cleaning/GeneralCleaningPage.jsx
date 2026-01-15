import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, TextField, Button } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import BuildingSelector from '../../components/common/BuildingSelector';
import CleaningJobsList from '../../components/cleaning/CleaningJobsList';
import CreateCleaningJobForm from '../../components/cleaning/CreateCleaningJobForm';

const GeneralCleaningPage = () => {
  const [filters, setFilters] = useState({
    buildingId: '',
    startDate: null,
    endDate: null,
  });

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      buildingId: '',
      startDate: null,
      endDate: null,
    });
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
          <Grid item xs={12} sm={6} md={4}>
            <Button variant="outlined" onClick={handleResetFilters} fullWidth>Reset Filters</Button>
          </Grid>
        </Grid>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <CreateCleaningJobForm />
        <CleaningJobsList filters={filters} />
      </Paper>
    </Box>
  );
};

export default GeneralCleaningPage;

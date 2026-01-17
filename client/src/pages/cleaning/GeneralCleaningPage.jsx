import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, TextField, Button, FormControl, Select, MenuItem, Autocomplete } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import BuildingSelector from '../../components/common/BuildingSelector';
import CleaningJobsList from '../../components/cleaning/CleaningJobsList';
import CreateCleaningJobForm from '../../components/cleaning/CreateCleaningJobForm';
import { useBuildingContext } from '../../contexts/BuildingContext';
import { useGetCleaningJobSubcategoriesQuery } from '../../features/cleaning/cleaningJobsApiSlice';

const GeneralCleaningPage = () => {
  const { selectedBuilding } = useBuildingContext();
  const { data: subcategoriesData } = useGetCleaningJobSubcategoriesQuery();
  const [filters, setFilters] = useState({
    buildingId: '',
    startDate: null,
    endDate: null,
    paymentStatus: '',
    status: '',
    subcategory: '',
    observations: '',
  });

  const subcategoryOptions = subcategoriesData?.data?.subcategories || [];

  const [weekAnchorDate, setWeekAnchorDate] = useState(() => new Date());

  useEffect(() => {
    if (!filters.buildingId && selectedBuilding?._id) {
      setFilters(prev => ({ ...prev, buildingId: selectedBuilding._id }));
    }
  }, [selectedBuilding, filters.buildingId]);

  const toDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && value?.$d instanceof Date) return value.$d;
    if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const startOfWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d;
  };

  const endOfWeek = (date) => {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  };

  const applyWeek = (anchor) => {
    const anchorDate = toDate(anchor) || new Date();
    setWeekAnchorDate(anchorDate);
    setFilters(prev => ({
      ...prev,
      startDate: startOfWeek(anchorDate),
      endDate: endOfWeek(anchorDate),
    }));
  };

  const weekRangeLabel = (() => {
    const start = toDate(filters.startDate);
    const end = toDate(filters.endDate);
    if (!start || !end) return '';
    const s = start.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    const e = end.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    return `${s} - ${e}`;
  })();

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      buildingId: '',
      startDate: null,
      endDate: null,
      paymentStatus: '',
      status: '',
      subcategory: '',
      observations: '',
    });
    setWeekAnchorDate(new Date());
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
            <FormControl fullWidth>
              <Select
                value={filters.paymentStatus}
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                displayEmpty
              >
                <MenuItem value="">All Payments</MenuItem>
                <MenuItem value="pending">Pending Payment</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                displayEmpty
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Autocomplete
              freeSolo
              options={subcategoryOptions}
              value={filters.subcategory || ''}
              onChange={(e, newValue) => {
                handleFilterChange('subcategory', newValue || '');
              }}
              onInputChange={(e, newInputValue) => {
                handleFilterChange('subcategory', newInputValue || '');
              }}
              renderInput={(params) => (
                <TextField {...params} label="Subcategory" fullWidth />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Observations"
              value={filters.observations}
              onChange={(e) => handleFilterChange('observations', e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button variant="outlined" onClick={() => applyWeek(new Date())} fullWidth>
              This Week{weekRangeLabel ? `: ${weekRangeLabel}` : ''}
            </Button>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Button
              variant="outlined"
              onClick={() => {
                const prev = new Date(weekAnchorDate);
                prev.setDate(prev.getDate() - 7);
                applyWeek(prev);
              }}
              fullWidth
            >
              Prev Week
            </Button>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <Button
              variant="outlined"
              onClick={() => {
                const next = new Date(weekAnchorDate);
                next.setDate(next.getDate() + 7);
                applyWeek(next);
              }}
              fullWidth
            >
              Next Week
            </Button>
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

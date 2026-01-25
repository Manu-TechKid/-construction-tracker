import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, Grid, TextField, Button, FormControl, Select, MenuItem, Autocomplete, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BuildingSelector from '../../components/common/BuildingSelector';
import CleaningJobsList from '../../components/cleaning/CleaningJobsList';
import CreateCleaningJobForm from '../../components/cleaning/CreateCleaningJobForm';
import { useBuildingContext } from '../../contexts/BuildingContext';
import { useGetCleaningJobSubcategoriesQuery } from '../../features/cleaning/cleaningJobsApiSlice';

const GeneralCleaningPage = () => {
  const { selectedBuilding } = useBuildingContext();
  const { data: subcategoriesData } = useGetCleaningJobSubcategoriesQuery();
  const colorStorageKey = 'cleaningColorSettings';

  const defaultColorSettings = useMemo(() => ({
    status: {
      pending: '#f59e0b',
      in_progress: '#3b82f6',
      completed: '#22c55e',
      cancelled: '#9ca3af',
    },
    payment: {
      pending: '#f59e0b',
      paid: '#22c55e',
    },
  }), []);

  const [colorSettings, setColorSettings] = useState(defaultColorSettings);
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
    try {
      const raw = localStorage.getItem(colorStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      setColorSettings({
        status: { ...defaultColorSettings.status, ...(parsed.status || {}) },
        payment: { ...defaultColorSettings.payment, ...(parsed.payment || {}) },
      });
    } catch (e) {
      // ignore
    }
  }, [defaultColorSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(colorStorageKey, JSON.stringify(colorSettings));
    } catch (e) {
      // ignore
    }
  }, [colorSettings]);

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

  const fieldSx = {
    '& .MuiInputBase-input': { fontSize: 16, py: 1.25 },
    '& .MuiInputLabel-root': { fontSize: 14 },
    '& .MuiSelect-select': { fontSize: 16, py: 1.25 },
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
              size="medium"
              sx={{ minWidth: 260 }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="medium">
              <Select
                value={filters.paymentStatus}
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                displayEmpty
                sx={fieldSx}
              >
                <MenuItem value="">All Payments</MenuItem>
                <MenuItem value="pending">Pending Payment</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="medium">
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                displayEmpty
                sx={fieldSx}
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
                <TextField {...params} label="Subcategory" fullWidth size="medium" sx={fieldSx} />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Observations"
              value={filters.observations}
              onChange={(e) => handleFilterChange('observations', e.target.value)}
              fullWidth
              size="medium"
              sx={fieldSx}
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
              renderInput={(params) => <TextField {...params} fullWidth size="medium" sx={fieldSx} />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DatePicker
              label="End Date"
              value={filters.endDate}
              onChange={(newValue) => handleFilterChange('endDate', newValue)}
              renderInput={(params) => <TextField {...params} fullWidth size="medium" sx={fieldSx} />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button variant="outlined" onClick={handleResetFilters} fullWidth>Reset Filters</Button>
          </Grid>
        </Grid>
      </Paper>

      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Color Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Job Status</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="Pending"
                    type="color"
                    value={colorSettings.status.pending}
                    onChange={(e) => setColorSettings(prev => ({
                      ...prev,
                      status: { ...prev.status, pending: e.target.value }
                    }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="In Progress"
                    type="color"
                    value={colorSettings.status.in_progress}
                    onChange={(e) => setColorSettings(prev => ({
                      ...prev,
                      status: { ...prev.status, in_progress: e.target.value }
                    }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="Completed"
                    type="color"
                    value={colorSettings.status.completed}
                    onChange={(e) => setColorSettings(prev => ({
                      ...prev,
                      status: { ...prev.status, completed: e.target.value }
                    }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="Cancelled"
                    type="color"
                    value={colorSettings.status.cancelled}
                    onChange={(e) => setColorSettings(prev => ({
                      ...prev,
                      status: { ...prev.status, cancelled: e.target.value }
                    }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Payment Status</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="Pending Payment"
                    type="color"
                    value={colorSettings.payment.pending}
                    onChange={(e) => setColorSettings(prev => ({
                      ...prev,
                      payment: { ...prev.payment, pending: e.target.value }
                    }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="Paid"
                    type="color"
                    value={colorSettings.payment.paid}
                    onChange={(e) => setColorSettings(prev => ({
                      ...prev,
                      payment: { ...prev.payment, paid: e.target.value }
                    }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => setColorSettings(defaultColorSettings)}
                >
                  Reset Colors
                </Button>
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Paper sx={{ p: 2 }}>
        <CreateCleaningJobForm />
        <CleaningJobsList filters={filters} colorSettings={colorSettings} />
      </Paper>
    </Box>
  );
};

export default GeneralCleaningPage;

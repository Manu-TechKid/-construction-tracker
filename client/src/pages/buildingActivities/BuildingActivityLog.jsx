import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  EventNote as EventNoteIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useBuildingContext } from '../../contexts/BuildingContext';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import {
  useGetBuildingActivitiesQuery,
  useCreateBuildingActivityMutation,
  useUpdateBuildingActivityMutation,
  useDeleteBuildingActivityMutation
} from '../../features/buildingActivities/buildingActivityApiSlice';
import BuildingActivityLogMobile from './BuildingActivityLogMobile';

const activityTypes = [
  { value: 'parking_cleaning', label: 'Parking Lot Cleaning', color: 'success' },
  { value: 'common_area_cleaning', label: 'Common Area Cleaning', color: 'success' },
  { value: 'landscaping', label: 'Landscaping', color: 'success' },
  { value: 'maintenance', label: 'Maintenance', color: 'warning' },
  { value: 'inspection', label: 'Inspection', color: 'info' },
  { value: 'repair', label: 'Repair', color: 'error' },
  { value: 'painting', label: 'Painting', color: 'primary' },
  { value: 'other', label: 'Other', color: 'default' }
];

const statusTypes = [
  { value: 'scheduled', label: 'Scheduled', color: 'default' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'error' },
  { value: 'pending', label: 'Pending', color: 'warning' }
];

const BuildingActivityLog = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { selectedBuilding } = useBuildingContext();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    building: '',
    activityType: '',
    status: '',
    startDate: null,
    endDate: null
  });

  const [formData, setFormData] = useState({
    building: '',
    activityType: 'parking_cleaning',
    customActivityName: '',
    date: new Date(),
    time: '09:00',
    duration: 1,
    durationUnit: 'hours',
    notes: '',
    status: 'scheduled',
    assignedWorkers: []
  });

  // API hooks
  const { data: buildingsData } = useGetBuildingsQuery();
  const { data: workersData } = useGetWorkersQuery();
  const buildings = buildingsData?.data?.buildings || [];
  const workers = workersData?.data?.users?.filter(u => u.role === 'worker') || [];

  const queryParams = useMemo(() => {
    const params = {};
    if (filters.building) params.building = filters.building;
    if (filters.activityType) params.activityType = filters.activityType;
    if (filters.status) params.status = filters.status;
    if (filters.startDate) params.startDate = filters.startDate.toISOString();
    if (filters.endDate) params.endDate = filters.endDate.toISOString();
    return params;
  }, [filters]);

  const { data: activitiesData, isLoading, refetch } = useGetBuildingActivitiesQuery(queryParams);
  const activities = activitiesData?.data?.activityLogs || [];

  const [createActivity] = useCreateBuildingActivityMutation();
  const [updateActivity] = useUpdateBuildingActivityMutation();
  const [deleteActivity] = useDeleteBuildingActivityMutation();

  // Render mobile-optimized version on small screens (after all hooks)
  if (isMobile) {
    return <BuildingActivityLogMobile />;
  }

  const handleOpenDialog = (activity = null) => {
    if (activity) {
      setEditingId(activity._id);
      setFormData({
        building: activity.building?._id || activity.building,
        activityType: activity.activityType,
        customActivityName: activity.customActivityName || '',
        date: new Date(activity.date),
        time: activity.time || '09:00',
        duration: activity.duration || 1,
        durationUnit: activity.durationUnit || 'hours',
        notes: activity.notes || '',
        status: activity.status,
        assignedWorkers: activity.assignedWorkers?.map(w => w._id || w) || []
      });
    } else {
      setEditingId(null);
      setFormData({
        building: selectedBuilding?._id || '',
        activityType: 'parking_cleaning',
        customActivityName: '',
        date: new Date(),
        time: '09:00',
        duration: 1,
        durationUnit: 'hours',
        notes: '',
        status: 'scheduled',
        assignedWorkers: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.building || !formData.activityType) {
        toast.error('Please select building and activity type');
        return;
      }

      const data = {
        ...formData,
        date: formData.date.toISOString()
      };

      if (editingId) {
        await updateActivity({ id: editingId, ...data }).unwrap();
        toast.success('Activity updated successfully');
      } else {
        await createActivity(data).unwrap();
        toast.success('Activity logged successfully');
      }
      handleCloseDialog();
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to save activity');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      try {
        await deleteActivity(id).unwrap();
        toast.success('Activity deleted successfully');
        refetch();
      } catch (error) {
        toast.error('Failed to delete activity');
      }
    }
  };

  const getActivityTypeLabel = (value) => {
    return activityTypes.find(t => t.value === value)?.label || value;
  };

  const getStatusColor = (value) => {
    return statusTypes.find(s => s.value === value)?.color || 'default';
  };

  const formatDateTime = (date, time) => {
    const dateObj = new Date(date);
    return `${format(dateObj, 'MMM dd, yyyy')} at ${time}`;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <EventNoteIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    Building Activity Log
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Virtual notepad for tracking building maintenance and activities
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? 'Hide Filters' : 'Filters'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                >
                  Log Activity
                </Button>
              </Box>
            </Box>

            {showFilters && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Filter Activities</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Building</InputLabel>
                      <Select
                        value={filters.building}
                        onChange={(e) => setFilters({ ...filters, building: e.target.value })}
                        label="Building"
                      >
                        <MenuItem value="">All Buildings</MenuItem>
                        {buildings.map(b => (
                          <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Activity Type</InputLabel>
                      <Select
                        value={filters.activityType}
                        onChange={(e) => setFilters({ ...filters, activityType: e.target.value })}
                        label="Activity Type"
                      >
                        <MenuItem value="">All Types</MenuItem>
                        {activityTypes.map(t => (
                          <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        label="Status"
                      >
                        <MenuItem value="">All Status</MenuItem>
                        {statusTypes.map(s => (
                          <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <DatePicker
                      label="From Date"
                      value={filters.startDate}
                      onChange={(date) => setFilters({ ...filters, startDate: date })}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {isLoading ? (
              <Typography>Loading activities...</Typography>
            ) : activities.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No activities logged yet
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Start tracking your building maintenance and cleaning activities
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                >
                  Log First Activity
                </Button>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Building</TableCell>
                      <TableCell>Activity</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity._id} hover>
                        <TableCell>
                          <Typography fontWeight="medium">
                            {activity.building?.name || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activity.building?.address}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getActivityTypeLabel(activity.activityType)}
                            size="small"
                            color={activityTypes.find(t => t.value === activity.activityType)?.color || 'default'}
                          />
                          {activity.customActivityName && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {activity.customActivityName}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(activity.date, activity.time)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activity.duration} {activity.durationUnit}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={activity.status}
                            size="small"
                            color={getStatusColor(activity.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {activity.notes || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenDialog(activity)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDelete(activity._id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Dialog for Add/Edit */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingId ? 'Edit Activity' : 'Log New Activity'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Building *</InputLabel>
                  <Select
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    label="Building *"
                  >
                    {buildings.map(b => (
                      <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Activity Type *</InputLabel>
                  <Select
                    value={formData.activityType}
                    onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                    label="Activity Type *"
                  >
                    {activityTypes.map(t => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Custom Activity Name (Optional)"
                  value={formData.customActivityName}
                  onChange={(e) => setFormData({ ...formData, customActivityName: e.target.value })}
                  placeholder="e.g., South Parking Lot Cleaning"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    label="Status"
                  >
                    {statusTypes.map(s => (
                      <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date *"
                  value={formData.date}
                  onChange={(date) => setFormData({ ...formData, date })}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseFloat(e.target.value) || 0 })}
                  inputProps={{ min: 0, step: 0.5 }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Duration Unit</InputLabel>
                  <Select
                    value={formData.durationUnit}
                    onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value })}
                    label="Duration Unit"
                  >
                    <MenuItem value="minutes">Minutes</MenuItem>
                    <MenuItem value="hours">Hours</MenuItem>
                    <MenuItem value="days">Days</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Assign Workers (Optional)</InputLabel>
                  <Select
                    multiple
                    value={formData.assignedWorkers}
                    onChange={(e) => setFormData({ ...formData, assignedWorkers: e.target.value })}
                    label="Assign Workers (Optional)"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const worker = workers.find(w => w._id === value);
                          return <Chip key={value} label={worker?.name || value} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {workers.map(w => (
                      <MenuItem key={w._id} value={w._id}>{w.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional details about this activity..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingId ? 'Update' : 'Save Activity'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default BuildingActivityLog;

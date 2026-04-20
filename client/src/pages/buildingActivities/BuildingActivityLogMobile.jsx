import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Grid,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  AppBar,
  Toolbar,
  Slide,
  Divider,
  Stack,
  Avatar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  EventNote as EventNoteIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon
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

const activityTypes = [
  { value: 'parking_cleaning', label: 'Parking Cleaning', color: 'success', icon: '🅿️' },
  { value: 'common_area_cleaning', label: 'Common Area', color: 'success', icon: '🧹' },
  { value: 'landscaping', label: 'Landscaping', color: 'success', icon: '🌿' },
  { value: 'maintenance', label: 'Maintenance', color: 'warning', icon: '🔧' },
  { value: 'inspection', label: 'Inspection', color: 'info', icon: '🔍' },
  { value: 'repair', label: 'Repair', color: 'error', icon: '🛠️' },
  { value: 'painting', label: 'Painting', color: 'primary', icon: '🎨' },
  { value: 'other', label: 'Other', color: 'default', icon: '📝' }
];

const statusTypes = [
  { value: 'scheduled', label: 'Scheduled', color: 'default' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'error' },
  { value: 'pending', label: 'Pending', color: 'warning' }
];

const SlideTransition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const BuildingActivityLogMobile = () => {
  const theme = useTheme();
  const { selectedBuilding } = useBuildingContext();
  const [openDialog, setOpenDialog] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);
  const [editingId, setEditingId] = useState(null);
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

      const data = { ...formData, date: formData.date.toISOString() };

      if (editingId) {
        await updateActivity({ id: editingId, ...data }).unwrap();
        toast.success('Activity updated');
      } else {
        await createActivity(data).unwrap();
        toast.success('Activity logged');
      }
      handleCloseDialog();
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this activity?')) {
      try {
        await deleteActivity(id).unwrap();
        toast.success('Deleted');
        refetch();
      } catch (error) {
        toast.error('Failed to delete');
      }
    }
  };

  const getActivityType = (value) => activityTypes.find(t => t.value === value);
  const getStatusColor = (value) => statusTypes.find(s => s.value === value)?.color || 'default';

  const formatDate = (date, time) => {
    const d = new Date(date);
    return `${format(d, 'MMM dd')} • ${time}`;
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== '').length;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ pb: 8 }}>
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" fontWeight="bold">Building Activities</Typography>
              <Typography variant="caption" color="text.secondary">
                {activities.length} activities logged
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterIcon />}
                onClick={() => setOpenFilter(true)}
                sx={{ minWidth: 'auto' }}
              >
                {activeFiltersCount > 0 && (
                  <Chip label={activeFiltersCount} size="small" color="primary" sx={{ ml: 0.5, height: 18 }} />
                )}
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Divider />

        {/* Activity Cards */}
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography>Loading...</Typography>
          </Box>
        ) : activities.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <EventNoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No activities yet
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Tap + to log your first activity
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={1} sx={{ p: 1 }}>
            {activities.map((activity) => {
              const type = getActivityType(activity.activityType);
              return (
                <Grid item xs={12} key={activity._id}>
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Stack direction="row" spacing={1.5} alignItems="flex-start" flex={1}>
                          <Avatar sx={{ bgcolor: `${type?.color}.light`, color: `${type?.color}.dark`, width: 40, height: 40 }}>
                            {type?.icon}
                          </Avatar>
                          <Box flex={1} minWidth={0}>
                            <Typography variant="subtitle2" fontWeight="bold" noWrap>
                              {activity.customActivityName || type?.label}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <LocationIcon fontSize="small" color="action" sx={{ fontSize: 14 }} />
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {activity.building?.name}
                              </Typography>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <TimeIcon fontSize="small" color="action" sx={{ fontSize: 14 }} />
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(activity.date, activity.time)}
                              </Typography>
                            </Stack>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => handleOpenDialog(activity)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete(activity._id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>

                      {activity.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontSize: '0.875rem' }}>
                          {activity.notes}
                        </Typography>
                      )}

                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                        <Chip
                          label={activity.status}
                          size="small"
                          color={getStatusColor(activity.status)}
                          icon={activity.status === 'completed' ? <CheckCircleIcon fontSize="small" /> : undefined}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {activity.duration} {activity.durationUnit}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Add FAB */}
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 80, right: 16 }}
          onClick={() => handleOpenDialog()}
        >
          <AddIcon />
        </Fab>

        {/* Filter Dialog */}
        <Dialog
          fullScreen
          open={openFilter}
          onClose={() => setOpenFilter(false)}
          TransitionComponent={SlideTransition}
        >
          <AppBar position="static" color="default" elevation={1}>
            <Toolbar>
              <IconButton edge="start" onClick={() => setOpenFilter(false)}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>Filters</Typography>
              <Button color="primary" onClick={() => {
                setFilters({ building: '', activityType: '', status: '', startDate: null, endDate: null });
                refetch();
              }}>
                Clear
              </Button>
            </Toolbar>
          </AppBar>
          <DialogContent sx={{ p: 2 }}>
            <Stack spacing={3}>
              <FormControl fullWidth>
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

              <FormControl fullWidth>
                <InputLabel>Activity Type</InputLabel>
                <Select
                  value={filters.activityType}
                  onChange={(e) => setFilters({ ...filters, activityType: e.target.value })}
                  label="Activity Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  {activityTypes.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.icon} {t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
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

              <DatePicker
                label="From Date"
                value={filters.startDate}
                onChange={(date) => setFilters({ ...filters, startDate: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />

              <DatePicker
                label="To Date"
                value={filters.endDate}
                onChange={(date) => setFilters({ ...filters, endDate: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button variant="contained" fullWidth size="large" onClick={() => { refetch(); setOpenFilter(false); }}>
              Apply Filters
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add/Edit Dialog */}
        <Dialog
          fullScreen
          open={openDialog}
          onClose={handleCloseDialog}
          TransitionComponent={SlideTransition}
        >
          <AppBar position="static" color="default" elevation={1}>
            <Toolbar>
              <IconButton edge="start" onClick={handleCloseDialog}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
                {editingId ? 'Edit Activity' : 'New Activity'}
              </Typography>
              <Button color="primary" onClick={handleSubmit}>
                Save
              </Button>
            </Toolbar>
          </AppBar>
          <DialogContent sx={{ p: 2 }}>
            <Stack spacing={3}>
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

              <FormControl fullWidth required>
                <InputLabel>Activity Type *</InputLabel>
                <Select
                  value={formData.activityType}
                  onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                  label="Activity Type *"
                >
                  {activityTypes.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.icon} {t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Custom Name (Optional)"
                value={formData.customActivityName}
                onChange={(e) => setFormData({ ...formData, customActivityName: e.target.value })}
                placeholder="e.g., South Parking"
              />

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

              <DatePicker
                label="Date *"
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />

              <TextField
                fullWidth
                label="Time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseFloat(e.target.value) || 0 })}
                  inputProps={{ min: 0, step: 0.5 }}
                />
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={formData.durationUnit}
                    onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value })}
                    label="Unit"
                  >
                    <MenuItem value="minutes">Min</MenuItem>
                    <MenuItem value="hours">Hours</MenuItem>
                    <MenuItem value="days">Days</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <FormControl fullWidth>
                <InputLabel>Assign Workers</InputLabel>
                <Select
                  multiple
                  value={formData.assignedWorkers}
                  onChange={(e) => setFormData({ ...formData, assignedWorkers: e.target.value })}
                  label="Assign Workers"
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

              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add details..."
              />
            </Stack>
          </DialogContent>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default BuildingActivityLogMobile;

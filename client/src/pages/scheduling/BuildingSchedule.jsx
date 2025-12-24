import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Event as EventIcon,
  Business as BuildingIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay, parseISO } from 'date-fns';
import { useBuildingContext } from '../../contexts/BuildingContext';
import { useAuth } from '../../hooks/useAuth';
import { 
  useGetBuildingSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation
} from '../../features/schedules/schedulesApiSlice';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { toast } from 'react-toastify';

const BuildingSchedule = () => {
  const { selectedBuilding, buildings } = useBuildingContext();
  const { hasPermission, user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'painting',
    building: '',
    apartment: '',
    assignedWorkers: [],
    startDate: new Date(),
    endDate: new Date(),
    status: 'planned',
    estimatedCost: '',
    estimatedHours: '',
    notes: ''
  });

  // API hooks
  const { 
    data: schedulesData, 
    isLoading, 
    error,
    refetch
  } = useGetBuildingSchedulesQuery(
    { 
      buildingId: selectedBuilding?._id,
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear()
    },
    { skip: !selectedBuilding }
  );

  const { data: workersData } = useGetWorkersQuery();
  const workers = workersData?.data?.users?.filter(user => user.role === 'worker') || [];

  const [createSchedule] = useCreateScheduleMutation();
  const [updateSchedule] = useUpdateScheduleMutation();
  const [deleteSchedule] = useDeleteScheduleMutation();

  const schedules = schedulesData?.data?.schedules || [];

  const scheduleTypes = [
    { value: 'painting', label: 'Painting', color: 'primary' },
    { value: 'cleaning', label: 'Cleaning', color: 'success' },
    { value: 'repair', label: 'Repair', color: 'warning' },
    { value: 'inspection', label: 'Inspection', color: 'info' },
    { value: 'maintenance', label: 'Maintenance', color: 'secondary' },
  ];

  const statusTypes = [
    { value: 'planned', label: 'Planned', color: 'default' },
    { value: 'in_progress', label: 'In Progress', color: 'warning' },
    { value: 'completed', label: 'Completed', color: 'success' },
    { value: 'cancelled', label: 'Cancelled', color: 'error' },
  ];

  const getMonthDays = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    // Get all days in the month
    const monthDays = eachDayOfInterval({ start, end });

    // Find the first Monday of the month or the start of the month if it starts on Monday
    const firstMonday = monthDays.find(day => {
      const dayOfWeek = day.getDay();
      // In JavaScript, getDay() returns 0 for Sunday, 1 for Monday, etc.
      // We want Monday (1) as the first day
      return dayOfWeek === 1; // Monday
    });

    // If the month starts on a Monday, return all days as is
    if (firstMonday && firstMonday.getDate() === start.getDate()) {
      return monthDays;
    }

    // Otherwise, we need to pad the beginning with days from the previous month
    // to start with Monday
    const startDate = firstMonday || start;
    const paddedDays = [];

    // Add days from previous month to fill the week starting with Monday
    const daysToAdd = startDate.getDay() === 1 ? 0 : (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1);

    for (let i = daysToAdd; i > 0; i--) {
      const prevDay = new Date(startDate);
      prevDay.setDate(startDate.getDate() - i);
      paddedDays.push(prevDay);
    }

    // Add all days from current month
    return [...paddedDays, ...monthDays];
  };

  const getSchedulesForDay = (day) => {
    if (!schedules.length) return [];
    
    const normalizedDay = startOfDay(day);
    
    return schedules.filter(schedule => {
      const startDate = startOfDay(typeof schedule.startDate === 'string' ? parseISO(schedule.startDate) : new Date(schedule.startDate));
      const endDate = startOfDay(typeof schedule.endDate === 'string' ? parseISO(schedule.endDate) : new Date(schedule.endDate));
      
      return normalizedDay >= startDate && normalizedDay <= endDate;
    });
  };

  const handleOpenDialog = (schedule = null, clickedDate = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        ...schedule,
        startDate: new Date(schedule.startDate),
        endDate: new Date(schedule.endDate),
      });
    } else {
      setEditingSchedule(null);
      const defaultDate = clickedDate || new Date();
      setFormData({
        title: '',
        description: '',
        type: 'painting',
        building: selectedBuilding?._id || '',
        apartment: '',
        assignedWorkers: [],
        startDate: defaultDate,
        endDate: defaultDate,
        status: 'planned',
        estimatedCost: '',
        estimatedHours: '',
        notes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSchedule(null);
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.title?.trim()) {
        toast.error('Title is required');
        return;
      }
      if (!formData.startDate || !formData.endDate) {
        toast.error('Start date and end date are required');
        return;
      }
      if (!selectedBuilding?._id) {
        toast.error('Building selection is required');
        return;
      }

      const scheduleData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        type: formData.type,
        building: selectedBuilding._id,
        apartment: formData.apartment?.trim() || '',
        assignedWorkers: formData.assignedWorkers || [],
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        status: formData.status,
        estimatedCost: parseFloat(formData.estimatedCost) || 0,
        estimatedHours: parseFloat(formData.estimatedHours) || 0,
        notes: formData.notes?.trim() || ''
      };

      // Only add createdBy for new schedules
      if (!editingSchedule) {
        scheduleData.createdBy = user.id;
      }

      if (editingSchedule) {
        await updateSchedule({ 
          id: editingSchedule._id, 
          ...scheduleData 
        }).unwrap();
        toast.success('Schedule updated successfully');
      } else {
        await createSchedule(scheduleData).unwrap();
        toast.success('Schedule created successfully');
      }

      handleCloseDialog();
      refetch();
    } catch (error) {
      console.error('Error saving schedule:', error);
      const errorMessage = error?.data?.message || error?.message || 'Failed to save schedule';
      toast.error(errorMessage);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await deleteSchedule(scheduleId);
        toast.success('Schedule deleted successfully');
      } catch (error) {
        console.error('Error deleting schedule:', error);
        toast.error('Error deleting schedule');
      }
    }
  };

  const getTypeConfig = (type) => {
    return scheduleTypes.find(t => t.value === type) || scheduleTypes[0];
  };


  if (!hasPermission(['read:schedules', 'create:schedules'])) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          You don't have permission to access schedules
        </Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load schedules. Please try again later.
        </Alert>
      </Box>
    );
  }

  if (!selectedBuilding) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="info">
          Please select a building to view schedules.
        </Alert>
      </Container>
    );
  }


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EventIcon color="primary" />
            <Typography variant="h4" component="h1">
              Building Schedule
            </Typography>
            {selectedBuilding && (
              <Chip
                icon={<BuildingIcon />}
                label={selectedBuilding.name}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          
          {hasPermission(['create:schedules']) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              disabled={!selectedBuilding}
            >
              Add Schedule
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <DatePicker
            views={['year', 'month']}
            label="Select Month"
            value={currentDate}
            onChange={(newValue) => setCurrentDate(newValue)}
            slotProps={{ textField: (params) => <TextField {...params} /> }}
          />
        </Box>

        <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {format(currentDate, 'MMMM yyyy')} - {selectedBuilding.name}
            </Typography>
            
            <Grid container spacing={1}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <Grid item xs={12/7} key={day}>
                  <Box sx={{ 
                    p: 2, 
                    textAlign: 'center', 
                    fontWeight: 'bold',
                    backgroundColor: 'primary.main',
                    color: 'white',
                    borderRadius: 1,
                    fontSize: '1.1rem'
                  }}>
                    {day}
                  </Box>
                </Grid>
              ))}
              
              {getMonthDays().map(day => {
                const daySchedules = getSchedulesForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                
                return (
                  <Grid item xs={12/7} key={day.toISOString()}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        minHeight: 140, 
                        p: 1.5,
                        backgroundColor: isToday 
                          ? 'warning.light' 
                          : daySchedules.length > 0 
                            ? 'success.light' 
                            : isCurrentMonth 
                              ? 'background.paper'
                              : 'grey.50',
                        cursor: isCurrentMonth ? 'pointer' : 'default',
                        border: isToday ? '3px solid' : daySchedules.length > 0 ? '2px solid' : '1px solid',
                        borderColor: isToday 
                          ? 'warning.main' 
                          : daySchedules.length > 0 
                            ? 'success.main' 
                            : isCurrentMonth 
                              ? 'primary.main' 
                              : 'grey.300',
                        opacity: isCurrentMonth ? 1 : 0.5,
                        position: 'relative',
                        '&:hover': isCurrentMonth ? {
                          backgroundColor: 'action.selected',
                          transform: 'scale(1.02)',
                          transition: 'all 0.2s',
                          boxShadow: 3
                        } : {}
                      }}
                      onClick={() => isCurrentMonth && handleOpenDialog(null, day)}
                    >
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          mb: 1, 
                          fontWeight: isToday ? 'bold' : 'normal',
                          color: isToday ? 'warning.contrastText' : isCurrentMonth ? 'text.primary' : 'text.secondary',
                          textAlign: 'center',
                          fontSize: '1.2rem'
                        }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      
                      {daySchedules.length > 0 && (
                        <Chip
                          label={`${daySchedules.length} schedule${daySchedules.length > 1 ? 's' : ''}`}
                          size="small"
                          color="primary"
                          sx={{ 
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            fontSize: '0.7rem',
                            height: 20
                          }}
                        />
                      )}
                      
                      {isCurrentMonth && daySchedules.length === 0 && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary',
                            fontStyle: 'italic',
                            display: 'block',
                            textAlign: 'center',
                            mt: 1
                          }}
                        >
                          Click to add schedule
                        </Typography>
                      )}
                      
                      {daySchedules.map(schedule => {
                        const typeConfig = getTypeConfig(schedule.type);
                        
                        return (
                          <Chip
                            key={schedule._id || schedule.id}
                            label={schedule.title}
                            size="small"
                            color={typeConfig.color}
                            variant={schedule.status === 'completed' ? 'filled' : 'outlined'}
                            sx={{ 
                              mb: 0.5, 
                              fontSize: '0.75rem',
                              height: 24,
                              display: 'block',
                              '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontWeight: 'medium'
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(schedule);
                            }}
                          />
                        );
                      })}
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>

        {/* Schedule Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Schedule Type</InputLabel>
                  <Select
                    value={formData.type}
                    label="Schedule Type"
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {scheduleTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {statusTypes.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(newValue) => setFormData({ ...formData, startDate: newValue })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(newValue) => setFormData({ ...formData, endDate: newValue })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Apartment Number"
                  value={formData.apartment}
                  onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                  placeholder="e.g., 420"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Estimated Hours"
                  type="number"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Estimated Cost"
                  type="number"
                  value={formData.estimatedCost}
                  onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                  InputProps={{
                    startAdornment: '$'
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Building</InputLabel>
                  <Select
                    value={formData.building}
                    label="Building"
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  >
                    {buildings.map((building) => (
                      <MenuItem key={building._id} value={building._id}>
                        {building.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Assigned Workers</InputLabel>
                  <Select
                    multiple
                    value={formData.assignedWorkers}
                    label="Assigned Workers"
                    onChange={(e) => setFormData({ ...formData, assignedWorkers: e.target.value })}
                  >
                    {workers.map((worker) => (
                      <MenuItem key={worker._id} value={worker._id}>
                        {worker.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingSchedule ? 'Update' : 'Save'} Schedule
            </Button>
            {editingSchedule && hasPermission(['delete:schedules']) && (
              <Button 
                onClick={() => {
                  handleDeleteSchedule(editingSchedule._id);
                  handleCloseDialog();
                }} 
                color="error"
              >
                Delete
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default BuildingSchedule;

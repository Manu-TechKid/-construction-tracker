import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
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
  Edit as EditIcon,
  Delete as DeleteIcon,
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
    startDate: new Date(),
    endDate: new Date(),
    status: 'planned',
    estimatedCost: '',
    notes: ''
  });

  // API hooks
  const { 
    data: schedulesData, 
    isLoading, 
    error 
  } = useGetBuildingSchedulesQuery(
    { 
      buildingId: selectedBuilding?._id,
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear()
    },
    { skip: !selectedBuilding }
  );

  const [createSchedule, { isLoading: creating }] = useCreateScheduleMutation();
  const [updateSchedule, { isLoading: updating }] = useUpdateScheduleMutation();
  const [deleteSchedule, { isLoading: deleting }] = useDeleteScheduleMutation();

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
    return eachDayOfInterval({ start, end });
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

  const handleOpenDialog = (schedule = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        ...schedule,
        startDate: new Date(schedule.startDate),
        endDate: new Date(schedule.endDate),
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        title: '',
        description: '',
        type: 'painting',
        building: selectedBuilding?._id || '',
        apartment: '',
        startDate: new Date(),
        endDate: new Date(),
        status: 'planned',
        estimatedCost: '',
        notes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSchedule(null);
  };

  const handleSaveSchedule = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.building) {
      toast.error('Please select a building');
      return;
    }

    const scheduleData = {
      ...formData,
      id: editingSchedule?.id || Date.now().toString(),
      createdAt: editingSchedule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingSchedule) {
        await updateSchedule(scheduleData);
        toast.success('Schedule updated successfully');
      } else {
        await createSchedule(scheduleData);
        toast.success('Schedule created successfully');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Error saving schedule');
    }

    handleCloseDialog();
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

  const getStatusConfig = (status) => {
    return statusTypes.find(s => s.value === status) || statusTypes[0];
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
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">
          {error.message}
        </Alert>
      </Box>
    );
  }

  if (!selectedBuilding) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Please select a building to view its schedule
        </Typography>
      </Box>
    );
  }

  if (!schedules.length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No schedules found for this building
        </Typography>
      </Box>
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
            renderInput={(params) => <TextField {...params} />}
          />
        </Box>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {format(currentDate, 'MMMM yyyy')} - {selectedBuilding.name}
            </Typography>
            
            <Grid container spacing={1}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Grid item xs key={day}>
                  <Box sx={{ p: 1, textAlign: 'center', fontWeight: 'bold' }}>
                    {day}
                  </Box>
                </Grid>
              ))}
              
              {getMonthDays().map(day => {
                const daySchedules = getSchedulesForDay(day);
                return (
                  <Grid item xs key={day.toISOString()}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        minHeight: 120, 
                        p: 1,
                        backgroundColor: daySchedules.length > 0 ? 'action.hover' : 'background.paper'
                      }}
                    >
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {format(day, 'd')}
                      </Typography>
                      
                      {daySchedules.map(schedule => {
                        const typeConfig = getTypeConfig(schedule.type);
                        const statusConfig = getStatusConfig(schedule.status);
                        
                        return (
                          <Chip
                            key={schedule.id}
                            label={schedule.title}
                            size="small"
                            color={typeConfig.color}
                            variant={schedule.status === 'completed' ? 'filled' : 'outlined'}
                            sx={{ 
                              mb: 0.5, 
                              fontSize: '0.7rem',
                              height: 20,
                              display: 'block',
                              '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }
                            }}
                            onClick={() => handleOpenDialog(schedule)}
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
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(newValue) => setFormData({ ...formData, endDate: newValue })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
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
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} variant="contained">
              {editingSchedule ? 'Update' : 'Save'} Schedule
            </Button>
            {editingSchedule && hasPermission(['delete:schedules']) && (
              <Button 
                onClick={() => {
                  handleDeleteSchedule(editingSchedule.id);
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

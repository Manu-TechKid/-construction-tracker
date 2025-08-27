import React, { useState } from 'react';
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
  Calendar,
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { useBuildingContext } from '../../contexts/BuildingContext';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';

const BuildingSchedule = () => {
  const { selectedBuilding, buildings } = useBuildingContext();
  const { hasPermission } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'painting',
    building: '',
    startDate: new Date(),
    endDate: new Date(),
    status: 'planned',
  });
  const [calendarKey, setCalendarKey] = useState(0);

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

  // Load schedules from localStorage
  React.useEffect(() => {
    const savedSchedules = localStorage.getItem('buildingSchedules');
    if (savedSchedules) {
      try {
        setSchedules(JSON.parse(savedSchedules));
      } catch (error) {
        console.error('Error loading schedules:', error);
      }
    }
  }, []);

  const saveSchedules = (updatedSchedules) => {
    localStorage.setItem('buildingSchedules', JSON.stringify(updatedSchedules));
    setSchedules(updatedSchedules);
  };

  const filteredSchedules = selectedBuilding 
    ? schedules.filter(schedule => schedule.building === selectedBuilding._id)
    : schedules;

  const getMonthDays = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getSchedulesForDay = (day) => {
    return filteredSchedules.filter(schedule => {
      const startDate = new Date(schedule.startDate);
      const endDate = new Date(schedule.endDate);
      return day >= startDate && day <= endDate;
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
        startDate: new Date(),
        endDate: new Date(),
        status: 'planned',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSchedule(null);
  };

  const handleSaveSchedule = () => {
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

    let updatedSchedules;
    if (editingSchedule) {
      updatedSchedules = schedules.map(schedule => 
        schedule.id === editingSchedule.id ? scheduleData : schedule
      );
      toast.success('Schedule updated successfully');
    } else {
      updatedSchedules = [...schedules, scheduleData];
      toast.success('Schedule created successfully');
    }

    saveSchedules(updatedSchedules);
    setCalendarKey(prev => prev + 1);
    handleCloseDialog();
  };

  const handleDeleteSchedule = (scheduleId) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      const updatedSchedules = schedules.filter(schedule => schedule.id !== scheduleId);
      saveSchedules(updatedSchedules);
      toast.success('Schedule deleted successfully');
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

        {!selectedBuilding && (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <BuildingIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Select a Building
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a building to view and manage its monthly schedule.
              </Typography>
            </CardContent>
          </Card>
        )}

        {selectedBuilding && (
          <Card key={calendarKey}>
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
        )}

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

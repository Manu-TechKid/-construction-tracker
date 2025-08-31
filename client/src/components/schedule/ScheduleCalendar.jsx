import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { 
  useGetScheduleQuery, 
  useCreateScheduleItemMutation, 
  useUpdateScheduleItemMutation, 
  useDeleteScheduleItemMutation,
  useCheckInWorkerMutation,
  useCheckOutWorkerMutation
} from '../../features/schedule/scheduleApiSlice';

const localizer = dateFnsLocalizer({
  format: (date, formatStr, options) => format(date, formatStr, { locale: options?.locale }),
  parse: (str) => new Date(str),
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay: (date) => date.getDay(),
  locales: {},
});

const ScheduleCalendar = () => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    workOrder: '',
    worker: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    notes: '',
    location: {
      longitude: 0,
      latitude: 0,
      address: ''
    }
  });

  // RTK Query hooks
  const { data: scheduleData, isLoading, isError, error } = useGetScheduleQuery({
    startDate: format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    endDate: format(addDays(startOfWeek(date, { weekStartsOn: 1 }), 6), 'yyyy-MM-dd')
  });
  
  const { data: workersData } = useGetWorkersQuery();
  const [createScheduleItem] = useCreateScheduleItemMutation();
  const [updateScheduleItem] = useUpdateScheduleItemMutation();
  const [deleteScheduleItem] = useDeleteScheduleItemMutation();
  const [checkInWorker] = useCheckInWorkerMutation();
  const [checkOutWorker] = useCheckOutWorkerMutation();

  // Format events for the calendar
  const events = React.useMemo(() => {
    if (!scheduleData?.data) return [];
    
    return scheduleData.data.map(item => ({
      id: item._id,
      title: `${item.workOrder?.title || 'No Title'} - ${item.worker?.name || 'Unassigned'}`,
      start: newDate(item.date, item.startTime),
      end: newDate(item.date, item.endTime),
      allDay: false,
      resource: item
    }));
  }, [scheduleData]);

  // Helper function to create date from date string and time string
  function newDate(dateString, timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(dateString);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setFormData({
      ...event.resource,
      date: format(event.start, 'yyyy-MM-dd'),
      startTime: format(event.start, 'HH:mm'),
      endTime: format(event.end, 'HH:mm'),
    });
    setOpenDialog(true);
  };

  const handleSelectSlot = ({ start, end }) => {
    setSelectedEvent(null);
    setFormData({
      workOrder: '',
      worker: '',
      date: format(start, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
      notes: '',
      location: {
        longitude: 0,
        latitude: 0,
        address: ''
      }
    });
    setOpenDialog(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('location.')) {
      const locationField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        location: {
          ...formData.location,
          longitude: parseFloat(formData.location.longitude),
          latitude: parseFloat(formData.location.latitude)
        }
      };

      if (selectedEvent) {
        await updateScheduleItem({ id: selectedEvent.id, ...data }).unwrap();
        enqueueSnackbar('Schedule updated successfully', { variant: 'success' });
      } else {
        await createScheduleItem(data).unwrap();
        enqueueSnackbar('Schedule item created successfully', { variant: 'success' });
      }
      
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving schedule:', error);
      enqueueSnackbar('Error saving schedule', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    
    try {
      await deleteScheduleItem(selectedEvent.id).unwrap();
      enqueueSnackbar('Schedule item deleted', { variant: 'success' });
      setOpenDialog(false);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      enqueueSnackbar('Error deleting schedule', { variant: 'error' });
    }
  };

  const handleCheckIn = async () => {
    if (!selectedEvent) return;
    
    try {
      // In a real app, get the current location using the browser's Geolocation API
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await checkInWorker({
            id: selectedEvent.id,
            location: {
              latitude,
              longitude,
              address: 'Current location' // In a real app, reverse geocode to get address
            },
            notes: 'Checked in via mobile app'
          }).unwrap();
          enqueueSnackbar('Checked in successfully', { variant: 'success' });
          setOpenDialog(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          enqueueSnackbar('Unable to get your location', { variant: 'error' });
        }
      );
    } catch (error) {
      console.error('Error checking in:', error);
      enqueueSnackbar('Error checking in', { variant: 'error' });
    }
  };

  const handleCheckOut = async () => {
    if (!selectedEvent) return;
    
    try {
      // In a real app, get the current location using the browser's Geolocation API
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await checkOutWorker({
            id: selectedEvent.id,
            location: {
              latitude,
              longitude,
              address: 'Current location' // In a real app, reverse geocode to get address
            },
            notes: 'Checked out via mobile app'
          }).unwrap();
          enqueueSnackbar('Checked out successfully', { variant: 'success' });
          setOpenDialog(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          enqueueSnackbar('Unable to get your location', { variant: 'error' });
        }
      );
    } catch (error) {
      console.error('Error checking out:', error);
      enqueueSnackbar('Error checking out', { variant: 'error' });
    }
  };

  // Event style getter
  const eventStyleGetter = (event) => {
    let backgroundColor = '';
    
    switch (event.resource.status) {
      case 'completed':
        backgroundColor = '#4caf50';
        break;
      case 'in_progress':
        backgroundColor = '#2196f3';
        break;
      case 'cancelled':
        backgroundColor = '#f44336';
        break;
      default:
        backgroundColor = '#ff9800';
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        padding: '2px 8px',
        fontSize: '12px'
      }
    };
  };

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" component="h2">
          Work Schedule
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedEvent(null);
            setFormData({
              workOrder: '',
              worker: '',
              date: format(new Date(), 'yyyy-MM-dd'),
              startTime: '09:00',
              endTime: '17:00',
              notes: '',
              location: {
                longitude: 0,
                latitude: 0,
                address: ''
              }
            });
            setOpenDialog(true);
          }}
        >
          New Schedule
        </Button>
      </Box>

      <Paper elevation={3} sx={{ height: '100%' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          defaultView={view}
          views={['day', 'week', 'month', 'agenda']}
          onView={setView}
          date={date}
          onNavigate={setDate}
          selectable
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          eventPropGetter={eventStyleGetter}
        />
      </Paper>

      {/* Schedule Item Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {selectedEvent ? 'Edit Schedule' : 'New Schedule'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="Start Time"
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    step: 300, // 5 min
                  }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="End Time"
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    step: 300, // 5 min
                  }}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Worker</InputLabel>
                  <Select
                    name="worker"
                    value={formData.worker}
                    onChange={handleInputChange}
                    label="Worker"
                    required
                  >
                    {workersData?.data?.map((worker) => (
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
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  margin="normal"
                />
              </Grid>
              
              {selectedEvent?.resource?.checkIn && (
                <Grid item xs={12}>
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      <ScheduleIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Check-in: {format(parseISO(selectedEvent.resource.checkIn.time), 'PPpp')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <LocationIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                      {selectedEvent.resource.checkIn.location?.address || 'Location not available'}
                    </Typography>
                  </Box>
                </Grid>
              )}
              
              {selectedEvent?.resource?.checkOut && (
                <Grid item xs={12}>
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      <ScheduleIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Check-out: {format(parseISO(selectedEvent.resource.checkOut.time), 'PPpp')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <LocationIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                      {selectedEvent.resource.checkOut.location?.address || 'Location not available'}
                    </Typography>
                    {selectedEvent.resource.checkOut.notes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {selectedEvent.resource.checkOut.notes}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
            <Box>
              {selectedEvent && (
                <>
                  <Button
                    color="error"
                    onClick={handleDelete}
                    startIcon={<DeleteIcon />}
                  >
                    Delete
                  </Button>
                  
                  {selectedEvent.resource.status === 'scheduled' && (
                    <Button
                      color="primary"
                      onClick={handleCheckIn}
                      startIcon={<CheckCircleIcon />}
                      sx={{ ml: 1 }}
                    >
                      Check In
                    </Button>
                  )}
                  
                  {selectedEvent.resource.status === 'in_progress' && (
                    <Button
                      color="secondary"
                      onClick={handleCheckOut}
                      startIcon={<CancelIcon />}
                      sx={{ ml: 1 }}
                    >
                      Check Out
                    </Button>
                  )}
                </>
              )}
            </Box>
            <Box>
              <Button onClick={() => setOpenDialog(false)} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" color="primary">
                {selectedEvent ? 'Update' : 'Create'}
              </Button>
            </Box>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ScheduleCalendar;

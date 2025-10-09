import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { format as dateFnsFormat } from 'date-fns';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  Tooltip,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../utils/dragDropTypes';
import ScheduleForm from './ScheduleForm';
import { 
  useGetScheduleQuery, 
  useCreateScheduleItemMutation, 
  useUpdateScheduleItemMutation, 
  useDeleteScheduleItemMutation,
  useCheckInWorkerMutation,
  useCheckOutWorkerMutation
} from './scheduleApiSlice';

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,
});

const ScheduleCalendar = ({ 
  workers = [], 
  workOrders = [],
  view = 'week',
  onView,
  date,
  onNavigate,
  onSelectEvent,
  selectedWorker,
  onSelectWorker,
  onCheckIn,
  onCheckOut
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { enqueueSnackbar } = useSnackbar();
  
  // State for dialogs
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // API hooks
  const { data: scheduleItems = [], isLoading, isError, error } = useGetScheduleQuery({
    startDate: dateFnsFormat(date, 'yyyy-MM-dd'),
    endDate: dateFnsFormat(date, 'yyyy-MM-dd'),
    worker: selectedWorker
  });
  
  const [createSchedule] = useCreateScheduleItemMutation();
  const [updateSchedule] = useUpdateScheduleItemMutation();
  const [deleteSchedule] = useDeleteScheduleItemMutation();
  const [checkInWorker] = useCheckInWorkerMutation();
  const [checkOutWorker] = useCheckOutWorkerMutation();

  // Format events for calendar
  const events = useMemo(() => {
    return scheduleItems.map(item => ({
      ...item,
      title: item.workOrder?.workType || 'No Title',
      start: new Date(item.startTime),
      end: new Date(item.endTime),
      allDay: false
    }));
  }, [scheduleItems]);

  // Handle event selection
  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    setIsDetailsOpen(true);
    onSelectEvent?.(event);
  }, [onSelectEvent]);

  // Handle slot selection (for creating new events)
  const handleSelectSlot = useCallback(({ start, end }) => {
    setSelectedEvent({
      startTime: start,
      endTime: end,
      status: 'scheduled'
    });
    setIsFormOpen(true);
  }, []);

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      if (selectedEvent?._id) {
        // Update existing event
        await updateSchedule({ id: selectedEvent._id, ...values }).unwrap();
        enqueueSnackbar('Schedule updated successfully', { variant: 'success' });
      } else {
        // Create new event
        await createSchedule(values).unwrap();
        enqueueSnackbar('Schedule created successfully', { variant: 'success' });
      }
      setIsFormOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error saving schedule:', error);
      enqueueSnackbar(error.data?.message || 'Error saving schedule', { variant: 'error' });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedEvent?._id) return;
    
    try {
      await deleteSchedule(selectedEvent._id).unwrap();
      enqueueSnackbar('Schedule deleted successfully', { variant: 'success' });
      setIsDetailsOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      enqueueSnackbar(error.data?.message || 'Error deleting schedule', { variant: 'error' });
    }
  };

  // Handle check in/out
  const handleCheckIn = async () => {
    if (!selectedEvent?._id) return;
    
    try {
      // Get current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const checkInData = {
        location: {
          type: 'Point',
          coordinates: [position.coords.longitude, position.coords.latitude],
          address: 'Current location', // Would normally reverse geocode this
          timestamp: new Date().toISOString()
        }
      };
      
      await checkInWorker({ id: selectedEvent._id, ...checkInData }).unwrap();
      enqueueSnackbar('Checked in successfully', { variant: 'success' });
      onCheckIn?.(selectedEvent._id);
    } catch (error) {
      console.error('Error checking in:', error);
      enqueueSnackbar(error.data?.message || 'Error checking in', { variant: 'error' });
    }
  };

  const handleCheckOut = async () => {
    if (!selectedEvent?._id) return;
    
    try {
      // Get current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const checkOutData = {
        location: {
          type: 'Point',
          coordinates: [position.coords.longitude, position.coords.latitude],
          address: 'Current location', // Would normally reverse geocode this
          timestamp: new Date().toISOString()
        }
      };
      
      await checkOutWorker({ id: selectedEvent._id, ...checkOutData }).unwrap();
      enqueueSnackbar('Checked out successfully', { variant: 'success' });
      onCheckOut?.(selectedEvent._id);
    } catch (error) {
      console.error('Error checking out:', error);
      enqueueSnackbar(error.data?.message || 'Error checking out', { variant: 'error' });
    }
  };

  // Custom event component
  const EventComponent = ({ event }) => {
    const isCompleted = event.status === 'completed';
    const isInProgress = event.status === 'in_progress';
    const isCancelled = event.status === 'cancelled';
    
    return (
      <Tooltip title={`${event.workOrder?.workType || 'Task'} - ${event.worker?.name || 'Unassigned'}`}>
        <Box
          sx={{
            height: '100%',
            p: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.8rem',
            backgroundColor: isCompleted 
              ? theme.palette.success.light 
              : isInProgress 
                ? theme.palette.info.light 
                : isCancelled 
                  ? theme.palette.error.light 
                  : theme.palette.primary.light,
            color: isCompleted || isInProgress || isCancelled 
              ? theme.palette.getContrastText(theme.palette.success.light) 
              : theme.palette.primary.contrastText,
            borderRadius: 1,
            borderLeft: `4px solid ${
              isCompleted 
                ? theme.palette.success.main 
                : isInProgress 
                  ? theme.palette.info.main 
                  : isCancelled 
                    ? theme.palette.error.main 
                    : theme.palette.primary.main
            }`,
          }}
        >
          <Box fontWeight="medium">{event.workOrder?.workType || 'Task'}</Box>
          <Box fontSize="0.7rem">
            {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
          </Box>
          {event.worker && (
            <Box fontSize="0.7rem" display="flex" alignItems="center" gap={0.5}>
              <PersonIcon fontSize="inherit" />
              {event.worker.firstName} {event.worker.lastName?.charAt(0)}.
            </Box>
          )}
          {isInProgress && (
            <Box fontSize="0.7rem" display="flex" alignItems="center" gap={0.5}>
              <ScheduleIcon fontSize="inherit" />
              In Progress
            </Box>
          )}
        </Box>
      </Tooltip>
    );
  };

  // Custom toolbar with filter and add button
  const CustomToolbar = ({ label, onNavigate, onView, view }) => {
    return (
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={2}
        flexWrap="wrap"
        gap={1}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Button 
            variant="outlined" 
            onClick={() => onNavigate('PREV')}
            size={isMobile ? 'small' : 'medium'}
          >
            Back
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => onNavigate('TODAY')}
            size={isMobile ? 'small' : 'medium'}
          >
            Today
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => onNavigate('NEXT')}
            size={isMobile ? 'small' : 'medium'}
          >
            Next
          </Button>
        </Box>
        
        <Typography variant="h6" component="h2">
          {label}
        </Typography>
        
        <Box display="flex" alignItems="center" gap={1}>
          <Button 
            variant={view === 'day' ? 'contained' : 'outlined'} 
            onClick={() => onView('day')}
            size={isMobile ? 'small' : 'medium'}
          >
            Day
          </Button>
          <Button 
            variant={view === 'week' ? 'contained' : 'outlined'} 
            onClick={() => onView('week')}
            size={isMobile ? 'small' : 'medium'}
          >
            Week
          </Button>
          <Button 
            variant={view === 'month' ? 'contained' : 'outlined'} 
            onClick={() => onView('month')}
            size={isMobile ? 'small' : 'medium'}
          >
            Month
          </Button>
          
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedEvent(null);
              setIsFormOpen(true);
            }}
            size={isMobile ? 'small' : 'medium'}
          >
            {isMobile ? 'Add' : 'New Schedule'}
          </Button>
        </Box>
      </Box>
    );
  };

  // Drop target for drag and drop
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.WORK_ORDER,
    drop: (item, monitor) => {
      // Handle drop logic here
      console.log('Dropped work order:', item);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', minHeight: 500 }} ref={drop}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        defaultView={view}
        view={view}
        onView={onView}
        date={date}
        onNavigate={onNavigate}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        components={{
          event: EventComponent,
          toolbar: CustomToolbar,
        }}
        eventPropGetter={(event) => {
          const isCompleted = event.status === 'completed';
          const isInProgress = event.status === 'in_progress';
          const isCancelled = event.status === 'cancelled';
          
          return {
            style: {
              backgroundColor: isCompleted 
                ? theme.palette.success.light 
                : isInProgress 
                  ? theme.palette.info.light 
                  : isCancelled 
                    ? theme.palette.error.light 
                    : theme.palette.primary.light,
              color: isCompleted || isInProgress || isCancelled 
                ? theme.palette.getContrastText(theme.palette.success.light) 
                : theme.palette.primary.contrastText,
              borderRadius: 4,
              border: 'none',
              padding: '2px 4px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          };
        }}
      />
      
      {/* Schedule Form Dialog */}
      <ScheduleForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedEvent(null);
        }}
        initialValues={selectedEvent}
        workOrders={workOrders}
        workers={workers}
        onSubmit={handleSubmit}
      />
      
      {/* Event Details Dialog */}
      <Dialog 
        open={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedEvent && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  {selectedEvent.workOrder?.workType || 'Schedule Details'}
                  <Chip 
                    label={selectedEvent.status?.replace('_', ' ').toUpperCase()} 
                    color={
                      selectedEvent.status === 'completed' 
                        ? 'success' 
                        : selectedEvent.status === 'in_progress' 
                          ? 'info' 
                          : selectedEvent.status === 'cancelled' 
                            ? 'error' 
                            : 'primary'
                    }
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>
                <Box>
                  <Tooltip title="Edit">
                    <IconButton 
                      onClick={() => {
                        setIsDetailsOpen(false);
                        setSelectedEvent(selectedEvent);
                        setIsFormOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={handleDelete}>
                      <DeleteIcon color="error" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </DialogTitle>
            
            <DialogContent dividers>
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <WorkIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Work Order" 
                    secondary={selectedEvent.workOrder?.workType || 'N/A'} 
                  />
                </ListItem>
                
                <Divider variant="inset" component="li" />
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Assigned To" 
                    secondary={
                      selectedEvent.worker 
                        ? `${selectedEvent.worker.firstName} ${selectedEvent.worker.lastName}` 
                        : 'Unassigned'
                    } 
                  />
                </ListItem>
                
                <Divider variant="inset" component="li" />
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <TimeIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Time" 
                    secondary={
                      <>
                        <Box component="span" display="block">
                          {format(new Date(selectedEvent.startTime), 'EEEE, MMMM d, yyyy')}
                        </Box>
                        <Box component="span" display="block">
                          {format(new Date(selectedEvent.startTime), 'h:mm a')} - {format(new Date(selectedEvent.endTime), 'h:mm a')}
                        </Box>
                      </>
                    } 
                  />
                </ListItem>
                
                {selectedEvent.location && (
                  <>
                    <Divider variant="inset" component="li" />
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <LocationIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary="Location" 
                        secondary={
                          selectedEvent.location?.address || 
                          `${selectedEvent.location?.coordinates?.[1]?.toFixed(4)}, ${selectedEvent.location?.coordinates?.[0]?.toFixed(4)}` || 
                          'No location data'
                        } 
                      />
                    </ListItem>
                  </>
                )}
                
                {selectedEvent.notes && (
                  <>
                    <Divider variant="inset" component="li" />
                    <ListItem>
                      <ListItemText 
                        primary="Notes" 
                        secondary={selectedEvent.notes} 
                        secondaryTypographyProps={{ whiteSpace: 'pre-line' }}
                      />
                    </ListItem>
                  </>
                )}
              </List>
            </DialogContent>
            
            <DialogActions>
              {selectedEvent.status === 'scheduled' && (
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<CheckCircleIcon />}
                  onClick={handleCheckIn}
                >
                  Check In
                </Button>
              )}
              
              {selectedEvent.status === 'in_progress' && (
                <Button 
                  variant="contained" 
                  color="secondary" 
                  startIcon={<CheckCircleIcon />}
                  onClick={handleCheckOut}
                >
                  Check Out
                </Button>
              )}
              
              <Button 
                onClick={() => setIsDetailsOpen(false)}
                color="inherit"
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ScheduleCalendar;

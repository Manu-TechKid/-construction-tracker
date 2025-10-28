import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
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
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  Event as EventIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameDay,
  parseISO,
  isBefore,
  isAfter,
  startOfDay
} from 'date-fns';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { CalendarSkeleton } from '../../components/common/LoadingSkeleton';

import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { 
  useGetSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation 
} from '../../features/schedules/schedulesApiSlice';
import { useAuth } from '../../hooks/useAuth';

const validationSchema = Yup.object({
  workerId: Yup.string().required('Please select a worker'),
  buildingId: Yup.string().required('Please select a building'),
  date: Yup.date()
    .required('Date is required')
    .min(startOfDay(new Date()), 'Cannot schedule for past dates'),
  startTime: Yup.date().required('Start time is required'),
  endTime: Yup.date()
    .required('End time is required')
    .test('is-after-start', 'End time must be after start time', function(value) {
      const { startTime } = this.parent;
      if (!startTime || !value) return true;
      const start = new Date(startTime);
      const end = new Date(value);
      return end > start;
    })
    .test('minimum-duration', 'Minimum duration is 30 minutes', function(value) {
      const { startTime } = this.parent;
      if (!startTime || !value) return true;
      const start = new Date(startTime);
      const end = new Date(value);
      const diffMinutes = (end - start) / (1000 * 60);
      return diffMinutes >= 30;
    }),
  task: Yup.string()
    .required('Task description is required')
    .min(10, 'Task description must be at least 10 characters')
    .max(500, 'Task description cannot exceed 500 characters'),
  notes: Yup.string().max(1000, 'Notes cannot exceed 1000 characters'),
});

const WorkerSchedules = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  
  // State management
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedWorker, setSelectedWorker] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'

  // API queries with error handling
  const { data: workersData, isLoading: isLoadingWorkers, error: workersError } = useGetUsersQuery();
  const { data: buildingsData, isLoading: isLoadingBuildings, error: buildingsError } = useGetBuildingsQuery();
  const { data: schedulesData, isLoading: isLoadingSchedules, error: schedulesError } = useGetSchedulesQuery({
    startDate: startOfWeek(currentWeek).toISOString(),
    endDate: endOfWeek(currentWeek).toISOString(),
    workerId: selectedWorker || undefined,
  });

  // Debug logging removed for performance

  // Mutations
  const [createSchedule, { isLoading: isCreating }] = useCreateScheduleMutation();
  const [updateSchedule, { isLoading: isUpdating }] = useUpdateScheduleMutation();
  const [deleteSchedule, { isLoading: isDeleting }] = useDeleteScheduleMutation();

  // Form handling
  const formik = useFormik({
    initialValues: {
      workerId: '',
      buildingId: '',
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      task: '',
      notes: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const startDateTime = combineDateAndTime(values.date, values.startTime);
        const endDateTime = combineDateAndTime(values.date, values.endTime);

        if (!startDateTime || !endDateTime) {
          toast.error('Please provide valid start and end times');
          return;
        }

        if (endDateTime <= startDateTime) {
          toast.error('End time must be after start time');
          return;
        }

        const workerId = resolveWorkerId(values.workerId);
        if (!workerId) {
          toast.error('A worker is required for this schedule');
          return;
        }

        // Validate overlap with existing schedules for the same worker
        const existingSchedules = schedules.filter((schedule) => {
          if (editingSchedule && schedule._id === editingSchedule._id) {
            return false;
          }

          const scheduleWorkerIds = getScheduleWorkerIds(schedule);
          if (!scheduleWorkerIds.includes(workerId)) {
            return false;
          }

          const scheduleStartRaw = getScheduleStartValue(schedule);
          if (!scheduleStartRaw) {
            return false;
          }

          const scheduleStartDate = new Date(scheduleStartRaw);
          if (Number.isNaN(scheduleStartDate.getTime())) {
            return false;
          }

          return format(scheduleStartDate, 'yyyy-MM-dd') === format(startDateTime, 'yyyy-MM-dd');
        });

        const hasOverlap = existingSchedules.some((schedule) => {
          const existingStart = new Date(getScheduleStartValue(schedule));
          const existingEnd = new Date(getScheduleEndValue(schedule));

          if (Number.isNaN(existingStart.getTime()) || Number.isNaN(existingEnd.getTime())) {
            return false;
          }

          return startDateTime < existingEnd && endDateTime > existingStart;
        });

        if (hasOverlap) {
          toast.error('Schedule conflicts with an existing shift for this worker');
          return;
        }

        const durationHours = Number(((endDateTime - startDateTime) / (1000 * 60 * 60)).toFixed(2));

        const scheduleData = {
          title: values.task.trim(),
          description: values.notes?.trim() || '',
          building: resolveBuildingId(values.buildingId),
          assignedWorkers: [workerId],
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          status: editingSchedule?.status || 'planned',
          estimatedHours: durationHours > 0 ? durationHours : undefined,
        };

        if (editingSchedule) {
          await updateSchedule({ id: editingSchedule._id, ...scheduleData }).unwrap();
          toast.success('✅ Schedule updated successfully!');
        } else {
          await createSchedule(scheduleData).unwrap();
          toast.success('✅ Schedule created successfully!');
        }

        handleCloseDialog();
        formik.resetForm();
      } catch (error) {
        console.error('Failed to save schedule - Full error:', error);
        console.error('Error data:', error?.data);
        console.error('Error message:', error?.data?.message);
        
        // Enhanced error messages
        let errorMessage = 'Failed to save schedule';
        if (error?.data?.message) {
          errorMessage = error.data.message;
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.status === 400) {
          errorMessage = 'Invalid schedule data. Please check all fields.';
        } else if (error?.status === 401) {
          errorMessage = 'You are not authorized to perform this action.';
        } else if (error?.status === 404) {
          errorMessage = 'Worker or building not found.';
        } else if (error?.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        toast.error(`❌ ${errorMessage}`);
      }
    },
  });

  // Helper functions - comprehensive data extraction with error handling
  const workers = useMemo(() => {
    try {
      if (!workersData) return [];
      
      // Workers are actually users with role 'worker' from the users API
      let allUsers = [];
      
      if (Array.isArray(workersData)) {
        allUsers = workersData;
      } else if (workersData.data?.users && Array.isArray(workersData.data.users)) {
        allUsers = workersData.data.users;
      } else if (workersData.data && Array.isArray(workersData.data)) {
        allUsers = workersData.data;
      } else if (workersData.users && Array.isArray(workersData.users)) {
        allUsers = workersData.users;
      } else {
        console.warn('Workers data structure not recognized:', workersData);
        return [];
      }
      
      // Filter users to only include workers
      const workerUsers = allUsers.filter(user => 
        user && (user.role === 'worker' || user.role === 'Worker')
      );
      if (process.env.NODE_ENV === 'development') {
        console.log('Filtered workers:', workerUsers);
      }
      return workerUsers;
    } catch (error) {
      console.error('Error processing workers data:', error);
      return [];
    }
  }, [workersData]);

  const buildings = useMemo(() => {
    try {
      if (!buildingsData) return [];
      
      // Extract buildings from the API response
      let buildingsList = [];
      
      if (Array.isArray(buildingsData)) {
        buildingsList = buildingsData;
      } else if (buildingsData.data?.buildings && Array.isArray(buildingsData.data.buildings)) {
        buildingsList = buildingsData.data.buildings;
      } else if (buildingsData.data && Array.isArray(buildingsData.data)) {
        buildingsList = buildingsData.data;
      } else if (buildingsData.buildings && Array.isArray(buildingsData.buildings)) {
        buildingsList = buildingsData.buildings;
      } else {
        console.warn('Buildings data structure not recognized:', buildingsData);
        return [];
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Extracted buildings:', buildingsList);
      }
      return buildingsList;
    } catch (error) {
      console.error('Error processing buildings data:', error);
      return [];
    }
  }, [buildingsData]);

  const schedules = useMemo(() => {
    try {
      if (!schedulesData) return [];
      
      // Extract schedules from the API response
      let schedulesList = [];
      
      if (Array.isArray(schedulesData)) {
        schedulesList = schedulesData;
      } else if (schedulesData.data?.schedules && Array.isArray(schedulesData.data.schedules)) {
        schedulesList = schedulesData.data.schedules;
      } else if (schedulesData.data && Array.isArray(schedulesData.data)) {
        schedulesList = schedulesData.data;
      } else if (schedulesData.schedules && Array.isArray(schedulesData.schedules)) {
        schedulesList = schedulesData.schedules;
      } else {
        console.warn('Schedules data structure not recognized:', schedulesData);
        return [];
      }
      
      // Debug logging (can be removed in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('Extracted schedules:', schedulesList);
        if (schedulesList.length > 0) {
          console.log('Sample schedule structure:', schedulesList[0]);
        }
      }
      return schedulesList;
    } catch (error) {
      console.error('Error processing schedules data:', error);
      return [];
    }
  }, [schedulesData]);

  const resolveWorkerId = (workerData) => {
    if (!workerData) return null;
    if (typeof workerData === 'object') {
      return workerData._id || workerData.id || workerData.value || null;
    }
    return workerData;
  };

  const resolveBuildingId = (buildingData) => {
    if (!buildingData) return null;
    if (typeof buildingData === 'object') {
      return buildingData._id || buildingData.id || buildingData.value || null;
    }
    return buildingData;
  };

  const getPrimaryWorker = (schedule) => {
    if (!schedule) return null;
    if (Array.isArray(schedule.assignedWorkers) && schedule.assignedWorkers.length > 0) {
      return schedule.assignedWorkers[0];
    }
    return schedule.worker || schedule.workerId || null;
  };

  const getScheduleWorkerIds = (schedule) => {
    if (!schedule) return [];
    const ids = [];

    if (Array.isArray(schedule.assignedWorkers)) {
      schedule.assignedWorkers.forEach((worker) => {
        const id = resolveWorkerId(worker);
        if (id) {
          ids.push(id);
        }
      });
    }

    const fallbackWorker = resolveWorkerId(schedule.worker) || resolveWorkerId(schedule.workerId);
    if (fallbackWorker && !ids.includes(fallbackWorker)) {
      ids.push(fallbackWorker);
    }

    return ids;
  };

  const getScheduleStartValue = (schedule) => {
    if (!schedule) return null;
    return schedule.startDate || schedule.startTime || schedule.date || null;
  };

  const getScheduleEndValue = (schedule) => {
    if (!schedule) return null;
    return schedule.endDate || schedule.endTime || schedule.date || null;
  };

  const getScheduleTitle = (schedule) => {
    if (!schedule) return 'Scheduled Task';
    return schedule.title || schedule.task || 'Scheduled Task';
  };

  const getScheduleNotes = (schedule) => {
    if (!schedule) return '';
    return schedule.description || schedule.notes || '';
  };

  const combineDateAndTime = useCallback((dateValue, timeValue) => {
    if (!dateValue || !timeValue) {
      return null;
    }

    const datePart = new Date(dateValue);
    const timePart = new Date(timeValue);

    if (Number.isNaN(datePart.getTime()) || Number.isNaN(timePart.getTime())) {
      return null;
    }

    return new Date(
      datePart.getFullYear(),
      datePart.getMonth(),
      datePart.getDate(),
      timePart.getHours(),
      timePart.getMinutes(),
      0,
      0
    );
  }, []);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(currentWeek),
      end: endOfWeek(currentWeek),
    });
  }, [currentWeek]);

  const filteredWorkers = useMemo(() => {
    if (!selectedWorker) return workers;
    return workers.filter(worker => worker._id === selectedWorker);
  }, [workers, selectedWorker]);

  const getSchedulesForDay = (date, workerId) => {
    if (!Array.isArray(schedules)) {
      console.warn('Schedules is not an array:', schedules);
      return [];
    }
    return schedules.filter(schedule => {
      try {
        const dateMatch = isSameDay(new Date(schedule.date), date);
        let workerMatch = true;
        
        if (workerId) {
          // Handle both populated and non-populated workerId
          if (typeof schedule.workerId === 'object' && schedule.workerId !== null) {
            workerMatch = schedule.workerId._id === workerId;
          } else {
            workerMatch = schedule.workerId === workerId;
          }
        }
        
        return dateMatch && workerMatch;
      } catch (error) {
        console.warn('Error filtering schedule:', error, schedule);
        return false;
      }
    });
  };

  const getWorkerName = (workerId) => {
    // First try to find in the workers list
    const worker = workers.find(w => w._id === workerId);
    if (worker) {
      if (worker.name) {
        return worker.name;
      } else if (worker.firstName && worker.lastName) {
        return `${worker.firstName} ${worker.lastName}`;
      } else if (worker.email) {
        return worker.email;
      }
    }
    
    // If not found in workers list, check if workerId is actually a populated object
    if (typeof workerId === 'object' && workerId !== null) {
      if (workerId.name) {
        return workerId.name;
      } else if (workerId.firstName && workerId.lastName) {
        return `${workerId.firstName} ${workerId.lastName}`;
      } else if (workerId.email) {
        return workerId.email;
      }
    }
    
    return 'Unknown Worker';
  };

  const getBuildingName = (buildingId) => {
    // First try to find in the buildings list
    const building = buildings.find(b => b._id === buildingId);
    if (building) {
      return building.name || building.title || 'Unknown Building';
    }
    
    // If not found in buildings list, check if buildingId is actually a populated object
    if (typeof buildingId === 'object' && buildingId !== null) {
      return buildingId.name || buildingId.title || 'Unknown Building';
    }
    
    return 'Unknown Building';
  };

  const getStatusColor = (schedule) => {
    const now = new Date();
    const scheduleDate = new Date(schedule.date);
    const endTime = new Date(schedule.endTime);
    
    if (isBefore(endTime, now)) return 'success'; // Completed
    if (isToday(scheduleDate)) return 'warning'; // Today
    if (isAfter(scheduleDate, now)) return 'info'; // Upcoming
    return 'default';
  };

  const handleOpenDialog = useCallback((schedule = null) => {
    setEditingSchedule(schedule);
    if (schedule) {
      // Handle populated worker and building data
      const workerId = typeof schedule.workerId === 'object' && schedule.workerId !== null 
        ? schedule.workerId._id 
        : schedule.workerId;
      const buildingId = typeof schedule.buildingId === 'object' && schedule.buildingId !== null 
        ? schedule.buildingId._id 
        : schedule.buildingId;
        
      formik.setValues({
        workerId: workerId || '',
        buildingId: buildingId || '',
        date: new Date(schedule.date),
        startTime: new Date(schedule.startTime),
        endTime: new Date(schedule.endTime),
        task: schedule.task || 'General maintenance',
        notes: schedule.notes || 'Please complete the assigned task',
      });
    } else {
      // Set better default times for new schedules
      const now = new Date();
      const startTime = new Date(now);
      startTime.setMinutes(0, 0, 0); // Round to nearest hour
      
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 2); // Default 2-hour duration
      
      formik.setValues({
        workerId: workers.length > 0 ? workers[0]._id : '',
        buildingId: buildings.length > 0 ? buildings[0]._id : '',
        date: new Date(),
        startTime: startTime,
        endTime: endTime,
        task: 'General maintenance',
        notes: 'Please complete the assigned task',
      });
    }
    setOpenDialog(true);
  }, [workers, buildings]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingSchedule(null);
    formik.resetForm();
  }, []);

  const handleDeleteSchedule = useCallback(async (scheduleId, workerName, taskDescription) => {
    const confirmMessage = `Are you sure you want to delete this schedule?\n\nWorker: ${workerName}\nTask: ${taskDescription}\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteSchedule(scheduleId).unwrap();
        toast.success('✅ Schedule deleted successfully!');
      } catch (error) {
        console.error('Failed to delete schedule:', error);
        
        let errorMessage = 'Failed to delete schedule';
        if (error?.data?.message) {
          errorMessage = error.data.message;
        } else if (error?.status === 401) {
          errorMessage = 'You are not authorized to delete this schedule.';
        } else if (error?.status === 404) {
          errorMessage = 'Schedule not found.';
        } else if (error?.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        toast.error(`❌ ${errorMessage}`);
      }
    }
  }, [deleteSchedule]);

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle loading states
  if (isLoadingWorkers || isLoadingBuildings || isLoadingSchedules) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <CalendarSkeleton />
      </Container>
    );
  }

  // Handle errors
  if (workersError || buildingsError || schedulesError) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Failed to load data</Typography>
          <Typography variant="body2">
            {workersError && `Workers: ${workersError?.data?.message || workersError.message}`}
            {buildingsError && `Buildings: ${buildingsError?.data?.message || buildingsError.message}`}
            {schedulesError && `Schedules: ${schedulesError?.data?.message || schedulesError.message}`}
          </Typography>
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </Button>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon />
            Worker Schedules
          </Typography>
          {hasPermission('schedules:create') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Schedule
            </Button>
          )}
        </Box>

        {/* Filters and Navigation */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Worker</InputLabel>
                  <Select
                    value={selectedWorker}
                    onChange={(e) => setSelectedWorker(e.target.value)}
                    label="Filter by Worker"
                  >
                    <MenuItem value="">All Workers</MenuItem>
                    {Array.isArray(workers) && workers.length > 0 ? workers.map((worker) => (
                      <MenuItem key={worker._id || worker.id} value={worker._id || worker.id}>
                        {(() => {
                          if (worker.name) {
                            return worker.name;
                          } else if (worker.firstName && worker.lastName) {
                            return `${worker.firstName} ${worker.lastName}`;
                          } else if (worker.email) {
                            return worker.email;
                          }
                          return 'Unknown Worker';
                        })()}
                      </MenuItem>
                    )) : (
                      <MenuItem disabled>No workers available</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton onClick={handlePreviousWeek}>
                    <CalendarIcon />
                  </IconButton>
                  <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
                    {format(startOfWeek(currentWeek), 'MMM d')} - {format(endOfWeek(currentWeek), 'MMM d, yyyy')}
                  </Typography>
                  <IconButton onClick={handleNextWeek}>
                    <CalendarIcon />
                  </IconButton>
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Button
                  variant="outlined"
                  onClick={() => setCurrentWeek(new Date())}
                  fullWidth
                >
                  Today
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Calendar View" icon={<CalendarIcon />} />
            <Tab label="List View" icon={<EventIcon />} />
          </Tabs>
        </Box>

        {/* Calendar View */}
        {tabValue === 0 && (
          <Card>
            <CardContent>
              <Grid container spacing={1}>
                {/* Day Headers */}
                {weekDays.map((day) => (
                  <Grid item xs key={day.toISOString()}>
                    <Paper 
                      sx={{ 
                        p: 1, 
                        textAlign: 'center', 
                        bgcolor: isToday(day) ? 'primary.light' : 'grey.100',
                        color: isToday(day) ? 'white' : 'text.primary'
                      }}
                    >
                      <Typography variant="subtitle2">
                        {format(day, 'EEE')}
                      </Typography>
                      <Typography variant="h6">
                        {format(day, 'd')}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Worker Rows */}
              {Array.isArray(filteredWorkers) && filteredWorkers.length > 0 ? filteredWorkers.map((worker) => (
                <Box key={worker._id} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      <PersonIcon />
                    </Avatar>
                    <Typography variant="h6">
                      {(() => {
                        if (worker.name) {
                          return worker.name;
                        } else if (worker.firstName && worker.lastName) {
                          return `${worker.firstName} ${worker.lastName}`;
                        } else if (worker.email) {
                          return worker.email;
                        }
                        return 'Unknown Worker';
                      })()}
                    </Typography>
                    <Chip 
                      label={worker.role || 'Worker'} 
                      size="small" 
                      sx={{ ml: 2 }}
                    />
                  </Box>
                  
                  <Grid container spacing={1}>
                    {weekDays.map((day) => {
                      const daySchedules = getSchedulesForDay(day, worker._id);
                      return (
                        <Grid item xs key={`${worker._id}-${day.toISOString()}`}>
                          <Paper 
                            sx={{ 
                              minHeight: 120, 
                              p: 1, 
                              bgcolor: 'grey.50',
                              border: isToday(day) ? '2px solid' : '1px solid',
                              borderColor: isToday(day) ? 'primary.main' : 'grey.300'
                            }}
                          >
                            {daySchedules.map((schedule) => (
                              <Tooltip
                                key={schedule._id}
                                title={
                                  <Box>
                                    <Typography variant="subtitle2">{schedule.task}</Typography>
                                    <Typography variant="caption">
                                      {getBuildingName(schedule.buildingId)}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      {format(new Date(schedule.startTime), 'HH:mm')} - 
                                      {format(new Date(schedule.endTime), 'HH:mm')}
                                    </Typography>
                                    {schedule.notes && (
                                      <Typography variant="caption" display="block">
                                        {schedule.notes}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                              >
                                <Chip
                                  label={`${format(new Date(schedule.startTime), 'HH:mm')} - ${schedule.task}`}
                                  size="small"
                                  color={getStatusColor(schedule)}
                                  sx={{ 
                                    mb: 0.5, 
                                    width: '100%',
                                    '& .MuiChip-label': {
                                      fontSize: '0.7rem',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }
                                  }}
                                  onClick={() => handleOpenDialog(schedule)}
                                />
                              </Tooltip>
                            ))}
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                  <Divider sx={{ mt: 2 }} />
                </Box>
              )) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="textSecondary">
                    No workers available
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Please check your data or try refreshing the page.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* List View */}
        {tabValue === 1 && (
          <Card>
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Worker</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Building</TableCell>
                      <TableCell>Task</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(schedules) && schedules.length > 0 ? schedules.map((schedule) => (
                      <TableRow key={schedule._id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                              <PersonIcon />
                            </Avatar>
                            {getWorkerName(schedule.workerId)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            try {
                              const date = new Date(schedule.date);
                              return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'MMM d, yyyy');
                            } catch (error) {
                              return 'Invalid Date';
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            try {
                              const startTime = new Date(schedule.startTime);
                              const endTime = new Date(schedule.endTime);
                              if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                                return 'Invalid Time';
                              }
                              return `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`;
                            } catch (error) {
                              return 'Invalid Time';
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          {getBuildingName(schedule.buildingId)}
                        </TableCell>
                        <TableCell>{schedule.task}</TableCell>
                        <TableCell>
                          <Chip
                            label={(() => {
                              try {
                                const endTime = new Date(schedule.endTime);
                                const scheduleDate = new Date(schedule.date);
                                if (isNaN(endTime.getTime()) || isNaN(scheduleDate.getTime())) {
                                  return 'Unknown';
                                }
                                return isBefore(endTime, new Date()) ? 'Completed' :
                                       isToday(scheduleDate) ? 'Today' : 'Upcoming';
                              } catch (error) {
                                return 'Unknown';
                              }
                            })()}
                            color={getStatusColor(schedule)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(schedule)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteSchedule(schedule._id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                          <Typography variant="h6" color="textSecondary">
                            No schedules found
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Create your first schedule to get started.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Schedule Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <form onSubmit={formik.handleSubmit}>
            <DialogTitle>
              {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={formik.touched.workerId && Boolean(formik.errors.workerId)}>
                    <InputLabel>Worker</InputLabel>
                    <Select
                      name="workerId"
                      value={formik.values.workerId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="Worker"
                    >
                      {Array.isArray(workers) && workers.length > 0 ? workers.map((worker) => (
                        <MenuItem key={worker._id || worker.id} value={worker._id || worker.id}>
                          {(() => {
                            if (worker.name) {
                              return worker.name;
                            } else if (worker.firstName && worker.lastName) {
                              return `${worker.firstName} ${worker.lastName}`;
                            } else if (worker.email) {
                              return worker.email;
                            }
                            return 'Unknown Worker';
                          })()}
                        </MenuItem>
                      )) : (
                        <MenuItem disabled>No workers available</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={formik.touched.buildingId && Boolean(formik.errors.buildingId)}>
                    <InputLabel>Building</InputLabel>
                    <Select
                      name="buildingId"
                      value={formik.values.buildingId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="Building"
                    >
                      {Array.isArray(buildings) && buildings.length > 0 ? buildings.map((building) => (
                        <MenuItem key={building._id || building.id} value={building._id || building.id}>
                          {building.name || building.title || 'Unknown Building'}
                        </MenuItem>
                      )) : (
                        <MenuItem disabled>No buildings available</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Date"
                    value={formik.values.date}
                    onChange={(newValue) => formik.setFieldValue('date', newValue)}
                    format="MM/dd/yyyy"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: formik.touched.date && Boolean(formik.errors.date),
                        helperText: formik.touched.date && formik.errors.date
                      },
                      actionBar: {
                        actions: ['accept', 'cancel', 'today']
                      },
                      layout: {
                        sx: {
                          '.MuiPickersLayout-contentWrapper': {
                            display: 'flex',
                            flexDirection: 'column'
                          }
                        }
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TimePicker
                    label="Start Time"
                    value={formik.values.startTime}
                    onChange={(newValue) => {
                      formik.setFieldValue('startTime', newValue);
                      // Auto-adjust end time if it's before the new start time
                      if (formik.values.endTime && newValue && new Date(formik.values.endTime) <= new Date(newValue)) {
                        const newEndTime = new Date(newValue);
                        newEndTime.setHours(newEndTime.getHours() + 1); // Add 1 hour minimum
                        formik.setFieldValue('endTime', newEndTime);
                      }
                    }}
                    ampm={true}
                    views={['hours', 'minutes']}
                    format="hh:mm a"
                    openTo="hours"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: formik.touched.startTime && Boolean(formik.errors.startTime),
                        helperText: formik.touched.startTime && formik.errors.startTime
                      },
                      actionBar: {
                        actions: ['accept', 'cancel']
                      },
                      layout: {
                        sx: {
                          '.MuiTimeClock-root': {
                            display: 'flex !important'
                          },
                          '.MuiClock-root': {
                            display: 'flex !important'
                          },
                          '.MuiPickersLayout-contentWrapper': {
                            display: 'flex',
                            flexDirection: 'column'
                          }
                        }
                      },
                      digitalClock: {
                        sx: {
                          display: 'none'
                        }
                      },
                      multiSectionDigitalClock: {
                        sx: {
                          display: 'none'
                        }
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TimePicker
                    label="End Time"
                    value={formik.values.endTime}
                    onChange={(newValue) => formik.setFieldValue('endTime', newValue)}
                    ampm={true}
                    views={['hours', 'minutes']}
                    format="hh:mm a"
                    openTo="hours"
                    desktopModeMediaQuery="@media (pointer: fine)"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: formik.touched.endTime && Boolean(formik.errors.endTime),
                        helperText: formik.touched.endTime && formik.errors.endTime
                      },
                      actionBar: {
                        actions: ['accept', 'cancel']
                      },
                      layout: {
                        sx: {
                          '.MuiTimeClock-root': {
                            display: 'flex !important'
                          },
                          '.MuiClock-root': {
                            display: 'flex !important'
                          },
                          '.MuiPickersLayout-contentWrapper': {
                            display: 'flex',
                            flexDirection: 'column'
                          }
                        }
                      },
                      digitalClock: {
                        sx: {
                          display: 'none'
                        }
                      },
                      multiSectionDigitalClock: {
                        sx: {
                          display: 'none'
                        }
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="task"
                    label="Task Description"
                    value={formik.values.task}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.task && Boolean(formik.errors.task)}
                    helperText={formik.touched.task && formik.errors.task}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    name="notes"
                    label="Notes"
                    value={formik.values.notes}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.notes && Boolean(formik.errors.notes)}
                    helperText={formik.touched.notes && formik.errors.notes}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button 
                type="submit" 
                variant="contained"
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default WorkerSchedules;

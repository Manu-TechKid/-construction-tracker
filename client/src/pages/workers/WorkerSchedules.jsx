import React, { useState, useMemo } from 'react';
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
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  addWeeks, 
  subWeeks,
  startOfDay,
  isToday,
  isBefore,
  isAfter
} from 'date-fns';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

import { useGetWorkersQuery } from '../../features/workers/workersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { 
  useGetSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation 
} from '../../features/schedules/schedulesApiSlice';
import { useAuth } from '../../hooks/useAuth';

const validationSchema = Yup.object({
  workerId: Yup.string().required('Worker is required'),
  buildingId: Yup.string().required('Building is required'),
  date: Yup.date().required('Date is required'),
  startTime: Yup.date().required('Start time is required'),
  endTime: Yup.date().required('End time is required'),
  task: Yup.string().required('Task description is required'),
  notes: Yup.string(),
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
  const { data: workersData, isLoading: isLoadingWorkers, error: workersError } = useGetWorkersQuery();
  const { data: buildingsData, isLoading: isLoadingBuildings, error: buildingsError } = useGetBuildingsQuery();
  const { data: schedulesData, isLoading: isLoadingSchedules, error: schedulesError } = useGetSchedulesQuery({
    startDate: startOfWeek(currentWeek).toISOString(),
    endDate: endOfWeek(currentWeek).toISOString(),
    workerId: selectedWorker || undefined,
  });

  // Debug logging
  console.log('WorkerSchedules Debug:', {
    workersData,
    buildingsData,
    schedulesData,
    workersError,
    buildingsError,
    schedulesError
  });

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
    onSubmit: async (values, { resetForm }) => {
      try {
        const scheduleData = {
          workerId: values.workerId,
          buildingId: values.buildingId,
          date: values.date.toISOString(),
          startTime: values.startTime.toISOString(),
          endTime: values.endTime.toISOString(),
          task: values.task,
          notes: values.notes,
        };

        if (editingSchedule) {
          await updateSchedule({ id: editingSchedule._id, ...scheduleData }).unwrap();
          toast.success('Schedule updated successfully');
        } else {
          await createSchedule(scheduleData).unwrap();
          toast.success('Schedule created successfully');
        }

        handleCloseDialog();
        resetForm();
      } catch (error) {
        console.error('Failed to save schedule:', error);
        toast.error(error?.data?.message || 'Failed to save schedule');
      }
    },
  });

  // Helper functions - comprehensive data extraction with error handling
  const workers = useMemo(() => {
    try {
      if (!workersData) return [];
      
      // Try different possible data structures
      if (Array.isArray(workersData)) return workersData;
      if (workersData.data?.workers && Array.isArray(workersData.data.workers)) return workersData.data.workers;
      if (workersData.data && Array.isArray(workersData.data)) return workersData.data;
      if (workersData.workers && Array.isArray(workersData.workers)) return workersData.workers;
      
      console.warn('Workers data structure not recognized:', workersData);
      return [];
    } catch (error) {
      console.error('Error processing workers data:', error);
      return [];
    }
  }, [workersData]);

  const buildings = useMemo(() => {
    try {
      if (!buildingsData) return [];
      
      // Try different possible data structures
      if (Array.isArray(buildingsData)) return buildingsData;
      if (buildingsData.data?.buildings && Array.isArray(buildingsData.data.buildings)) return buildingsData.data.buildings;
      if (buildingsData.data && Array.isArray(buildingsData.data)) return buildingsData.data;
      if (buildingsData.buildings && Array.isArray(buildingsData.buildings)) return buildingsData.buildings;
      
      console.warn('Buildings data structure not recognized:', buildingsData);
      return [];
    } catch (error) {
      console.error('Error processing buildings data:', error);
      return [];
    }
  }, [buildingsData]);

  const schedules = useMemo(() => {
    try {
      if (!schedulesData) return [];
      
      // Try different possible data structures
      if (Array.isArray(schedulesData)) return schedulesData;
      if (schedulesData.data?.schedules && Array.isArray(schedulesData.data.schedules)) return schedulesData.data.schedules;
      if (schedulesData.data && Array.isArray(schedulesData.data)) return schedulesData.data;
      if (schedulesData.schedules && Array.isArray(schedulesData.schedules)) return schedulesData.schedules;
      
      console.warn('Schedules data structure not recognized:', schedulesData);
      return [];
    } catch (error) {
      console.error('Error processing schedules data:', error);
      return [];
    }
  }, [schedulesData]);

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
        return isSameDay(new Date(schedule.date), date) && 
               (!workerId || schedule.workerId === workerId);
      } catch (error) {
        console.warn('Error filtering schedule:', error, schedule);
        return false;
      }
    });
  };

  const getWorkerName = (workerId) => {
    const worker = workers.find(w => w._id === workerId);
    return worker ? `${worker.firstName} ${worker.lastName}` : 'Unknown Worker';
  };

  const getBuildingName = (buildingId) => {
    const building = buildings.find(b => b._id === buildingId);
    return building ? building.name : 'Unknown Building';
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

  const handleOpenDialog = (schedule = null) => {
    setEditingSchedule(schedule);
    if (schedule) {
      formik.setValues({
        workerId: schedule.workerId || '',
        buildingId: schedule.buildingId || '',
        date: new Date(schedule.date),
        startTime: new Date(schedule.startTime),
        endTime: new Date(schedule.endTime),
        task: schedule.task || '',
        notes: schedule.notes || '',
      });
    } else {
      formik.resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSchedule(null);
    formik.resetForm();
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await deleteSchedule(scheduleId).unwrap();
        toast.success('Schedule deleted successfully');
      } catch (error) {
        console.error('Failed to delete schedule:', error);
        toast.error('Failed to delete schedule');
      }
    }
  };

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
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body1" color="textSecondary">
          Loading worker schedules...
        </Typography>
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
                        {worker.firstName || worker.name || 'Unknown'} {worker.lastName || ''}
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
                      {worker.firstName} {worker.lastName}
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
                                  label={schedule.task}
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
                          {worker.firstName || worker.name || 'Unknown'} {worker.lastName || ''}
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
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: formik.touched.date && Boolean(formik.errors.date),
                        helperText: formik.touched.date && formik.errors.date
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TimePicker
                    label="Start Time"
                    value={formik.values.startTime}
                    onChange={(newValue) => formik.setFieldValue('startTime', newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: formik.touched.startTime && Boolean(formik.errors.startTime),
                        helperText: formik.touched.startTime && formik.errors.startTime
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TimePicker
                    label="End Time"
                    value={formik.values.endTime}
                    onChange={(newValue) => formik.setFieldValue('endTime', newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: formik.touched.endTime && Boolean(formik.errors.endTime),
                        helperText: formik.touched.endTime && formik.errors.endTime
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

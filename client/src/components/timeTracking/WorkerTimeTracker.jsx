import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
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
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  PlayArrow as PunchInIcon,
  Stop as PunchOutIcon,
  AddCircle as NewShiftIcon,
  List as ViewShiftsIcon,
  Coffee as BreakIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import {
  useGetWorkerStatusQuery,
  useClockInMutation,
  useClockOutMutation,
  useStartBreakMutation,
  useEndBreakMutation,
  useGetTimeSessionsQuery,
  useCreateShiftMutation,
  useUpdateShiftMutation
} from '../../features/timeTracking/timeTrackingApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import BuildingSelector from '../common/BuildingSelector';
import { useBuildingContext } from '../../contexts/BuildingContext';

const WorkerTimeTracker = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { selectedBuilding } = useBuildingContext();

  // State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [breakTime, setBreakTime] = useState(0);
  const [newShiftDialog, setNewShiftDialog] = useState(false);
  const [viewShiftsDialog, setViewShiftsDialog] = useState(false);
  const [breakDialog, setBreakDialog] = useState(false);
  const [breakReason, setBreakReason] = useState('');
  
  // New shift form state
  const [shiftStart, setShiftStart] = useState(new Date());
  const [shiftEnd, setShiftEnd] = useState(null);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [shiftNotes, setShiftNotes] = useState('');

  // API calls
  const { data: statusData, refetch: refetchStatus } = useGetWorkerStatusQuery(user?.id, {
    skip: !user?.id,
    pollingInterval: 5000 // Update every 5 seconds
  });

  const { data: sessionsData, refetch: refetchSessions } = useGetTimeSessionsQuery({
    workerId: user?.id,
    limit: 10
  }, {
    skip: !user?.id
  });

  const [clockIn, { isLoading: isClockingIn }] = useClockInMutation();
  const [clockOut, { isLoading: isClockingOut }] = useClockOutMutation();
  const [startBreak, { isLoading: isStartingBreak }] = useStartBreakMutation();
  const [endBreak, { isLoading: isEndingBreak }] = useEndBreakMutation();
  const [createShift] = useCreateShiftMutation();
  const [updateShift] = useUpdateShiftMutation();

  const activeSession = statusData?.data?.activeSession;
  const isActive = activeSession && activeSession.status === 'active';
  const isOnBreak = activeSession && activeSession.status === 'paused';
  const recentSessions = sessionsData?.data?.sessions || [];

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate elapsed time
  useEffect(() => {
    if (isActive && activeSession?.shiftStart) {
      const start = new Date(activeSession.shiftStart);
      const now = new Date();
      const diffSeconds = Math.floor((now - start) / 1000);
      setElapsedTime(diffSeconds);
      
      // Calculate break time
      if (activeSession.breakTime) {
        setBreakTime(activeSession.breakTime * 60); // Convert minutes to seconds
      }
    } else {
      setElapsedTime(0);
      setBreakTime(0);
    }
  }, [isActive, activeSession, currentTime]);

  // Format time display (HH:MM:SS or HH.HHh)
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHoursDecimal = (seconds) => {
    const hours = (seconds / 3600).toFixed(2);
    return `${hours}h`;
  };

  // Handle Punch In
  const handlePunchIn = async () => {
    if (!selectedBuilding) {
      toast.error('Please select a building first');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('workerId', user.id);
      formData.append('buildingId', selectedBuilding._id);
      formData.append('latitude', 0);
      formData.append('longitude', 0);
      formData.append('accuracy', 0);

      await clockIn(formData).unwrap();
      toast.success('Punched in successfully!');
      refetchStatus();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to punch in');
    }
  };

  // Handle Punch Out
  const handlePunchOut = async () => {
    try {
      const formData = new FormData();
      formData.append('workerId', user.id);
      formData.append('latitude', 0);
      formData.append('longitude', 0);
      formData.append('accuracy', 0);

      await clockOut(formData).unwrap();
      toast.success('Punched out successfully!');
      refetchStatus();
      refetchSessions();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to punch out');
    }
  };

  // Handle Start Break
  const handleStartBreak = async () => {
    try {
      await startBreak({
        workerId: user.id,
        reason: breakReason,
        latitude: 0,
        longitude: 0
      }).unwrap();
      
      toast.success('Break started');
      setBreakDialog(false);
      setBreakReason('');
      refetchStatus();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to start break');
    }
  };

  // Handle End Break
  const handleEndBreak = async () => {
    try {
      await endBreak({ workerId: user.id }).unwrap();
      toast.success('Break ended');
      refetchStatus();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to end break');
    }
  };

  // Handle Create New Shift
  const handleCreateShift = async () => {
    if (!shiftStart) {
      toast.error('Please select shift start time');
      return;
    }

    try {
      const shiftData = {
        workerId: user.id,
        buildingId: selectedBuilding?._id,
        shiftStart: shiftStart.toISOString(),
        shiftEnd: shiftEnd ? shiftEnd.toISOString() : null,
        breakMinutes: parseInt(breakMinutes) || 0,
        notes: shiftNotes,
        status: shiftEnd ? 'completed' : 'active'
      };

      await createShift(shiftData).unwrap();
      toast.success('Shift created successfully!');
      setNewShiftDialog(false);
      resetShiftForm();
      refetchSessions();
      refetchStatus();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to create shift');
    }
  };

  const resetShiftForm = () => {
    setShiftStart(new Date());
    setShiftEnd(null);
    setBreakMinutes(0);
    setShiftNotes('');
  };

  // Calculate total hours for a shift
  const calculateShiftHours = (start, end) => {
    if (!start || !end) return '0.00h';
    const hours = differenceInHours(new Date(end), new Date(start));
    const minutes = differenceInMinutes(new Date(end), new Date(start)) % 60;
    return `${hours}.${Math.round((minutes / 60) * 100).toString().padStart(2, '0')}h`;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Header */}
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#00838f' }}>
          Work Log
        </Typography>

        {/* Building Selection */}
        {!isActive && (
          <Card elevation={2} sx={{ mb: 3, bgcolor: '#e0f7fa' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Building
              </Typography>
              <BuildingSelector />
              {!selectedBuilding && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Please select a building before clocking in
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Current Time Display */}
        {isActive && (
          <Card elevation={3} sx={{ mb: 3, bgcolor: '#fff' }}>
            <CardContent>
              <Box textAlign="center">
                <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#00838f', mb: 1 }}>
                  {formatHoursDecimal(elapsedTime)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Shift Start: {format(new Date(activeSession.shiftStart), 'EEE, MMM d')} - {format(new Date(activeSession.shiftStart), 'HH:mm')}
                </Typography>
                {isOnBreak && (
                  <Chip 
                    label="ON BREAK" 
                    color="warning" 
                    sx={{ mt: 2, fontWeight: 'bold' }}
                  />
                )}
              </Box>

              {/* Break Info */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Break Start
                  </Typography>
                  <Typography variant="body1">
                    {isOnBreak && activeSession.breaks?.length > 0 
                      ? format(new Date(activeSession.breaks[activeSession.breaks.length - 1].startTime), 'HH:mm')
                      : '---'
                    }
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="caption" color="text.secondary">
                    Break Total
                  </Typography>
                  <Typography variant="body1">
                    {Math.floor(breakTime / 60)}m
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body2" noWrap>
                    (Optional)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {!isActive ? (
            <>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handlePunchIn}
                  disabled={isClockingIn || !selectedBuilding}
                  sx={{
                    py: 3,
                    bgcolor: '#bdbdbd',
                    color: '#000',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    '&:hover': { bgcolor: '#9e9e9e' }
                  }}
                >
                  PUNCH IN
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  startIcon={<NewShiftIcon />}
                  onClick={() => setNewShiftDialog(true)}
                  sx={{ py: 2, borderColor: '#bdbdbd', color: '#000' }}
                >
                  NEW SHIFT
                </Button>
              </Grid>
            </>
          ) : (
            <>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handlePunchOut}
                  disabled={isClockingOut}
                  sx={{
                    py: 3,
                    bgcolor: '#bdbdbd',
                    color: '#000',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    '&:hover': { bgcolor: '#9e9e9e' }
                  }}
                >
                  PUNCH OUT
                </Button>
              </Grid>
              <Grid item xs={12}>
                {isOnBreak ? (
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    size="large"
                    onClick={handleEndBreak}
                    disabled={isEndingBreak}
                    sx={{ py: 2 }}
                  >
                    RESUME WORK
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    onClick={() => setBreakDialog(true)}
                    disabled={isStartingBreak}
                    sx={{ py: 2, borderColor: '#bdbdbd', color: '#000' }}
                  >
                    TAKE BREAK
                  </Button>
                )}
              </Grid>
            </>
          )}
          
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<ViewShiftsIcon />}
              onClick={() => setViewShiftsDialog(true)}
              sx={{ py: 2, borderColor: '#bdbdbd', color: '#000' }}
            >
              VIEW SHIFTS
            </Button>
          </Grid>
        </Grid>

        {/* New Shift Dialog */}
        <Dialog 
          open={newShiftDialog} 
          onClose={() => setNewShiftDialog(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ bgcolor: '#00838f', color: '#fff' }}>
            New Shift
            <IconButton
              onClick={() => setNewShiftDialog(false)}
              sx={{ position: 'absolute', right: 8, top: 8, color: '#fff' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Quick Shift:
              </Typography>
              <TextField
                select
                fullWidth
                SelectProps={{ native: true }}
                sx={{ mt: 1 }}
              >
                <option value="">---</option>
                <option value="8">8 hours</option>
                <option value="10">10 hours</option>
                <option value="12">12 hours</option>
              </TextField>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Shift Start:
              </Typography>
              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                <Grid item xs={7}>
                  <DatePicker
                    value={shiftStart}
                    onChange={(newValue) => setShiftStart(newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                  />
                </Grid>
                <Grid item xs={5}>
                  <TimePicker
                    value={shiftStart}
                    onChange={(newValue) => setShiftStart(newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                  />
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Shift End:
              </Typography>
              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                <Grid item xs={7}>
                  <DatePicker
                    value={shiftEnd}
                    onChange={(newValue) => setShiftEnd(newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                  />
                </Grid>
                <Grid item xs={5}>
                  <TimePicker
                    value={shiftEnd}
                    onChange={(newValue) => setShiftEnd(newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                  />
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Break (unpaid):
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
                placeholder="0m"
                sx={{ mt: 1 }}
                InputProps={{
                  endAdornment: <Typography variant="body2">minutes</Typography>
                }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Total (paid):
              </Typography>
              <Typography variant="h5" sx={{ mt: 1, color: '#00838f', fontWeight: 'bold' }}>
                {shiftStart && shiftEnd 
                  ? calculateShiftHours(shiftStart, shiftEnd)
                  : '0.00h'
                }
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Notes:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                placeholder="(Optional)"
                sx={{ mt: 1 }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={() => setNewShiftDialog(false)}
              sx={{ color: '#757575' }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained"
              onClick={handleCreateShift}
              startIcon={<CheckIcon />}
              sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
            >
              Save Shift
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Shifts Dialog */}
        <Dialog
          open={viewShiftsDialog}
          onClose={() => setViewShiftsDialog(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ bgcolor: '#00838f', color: '#fff' }}>
            Recent Shifts
            <IconButton
              onClick={() => setViewShiftsDialog(false)}
              sx={{ position: 'absolute', right: 8, top: 8, color: '#fff' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {recentSessions.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No shifts recorded yet
              </Alert>
            ) : (
              <List>
                {recentSessions.map((session, index) => (
                  <React.Fragment key={session._id}>
                    <ListItem alignItems="flex-start">
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1" fontWeight="bold">
                              {format(parseISO(session.shiftStart || session.clockInTime), 'EEE, MMM d')}
                            </Typography>
                            <Chip 
                              label={session.totalPaidHours ? `${session.totalPaidHours}h` : `${session.totalHours}h`}
                              color="primary"
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {format(parseISO(session.shiftStart || session.clockInTime), 'HH:mm')} - {' '}
                              {session.shiftEnd || session.clockOutTime 
                                ? format(parseISO(session.shiftEnd || session.clockOutTime), 'HH:mm')
                                : 'In Progress'
                              }
                            </Typography>
                            {session.breakTime > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                Break: {session.breakTime}m
                              </Typography>
                            )}
                            {session.building?.name && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Building: {session.building.name}
                              </Typography>
                            )}
                            <Chip 
                              label={session.status}
                              size="small"
                              color={session.status === 'completed' ? 'success' : 'warning'}
                              sx={{ mt: 1 }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentSessions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewShiftsDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Break Dialog */}
        <Dialog open={breakDialog} onClose={() => setBreakDialog(false)}>
          <DialogTitle>Start Break</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Break Reason (Optional)"
              value={breakReason}
              onChange={(e) => setBreakReason(e.target.value)}
              placeholder="Lunch, Rest, etc."
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBreakDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleStartBreak}
              variant="contained"
              disabled={isStartingBreak}
            >
              Start Break
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default WorkerTimeTracker;

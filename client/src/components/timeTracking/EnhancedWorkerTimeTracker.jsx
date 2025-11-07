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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Divider,
  useTheme,
  useMediaQuery,
  ImageList,
  ImageListItem,
  ImageListItemBar
} from '@mui/material';
import {
  PlayArrow as PunchInIcon,
  PlayArrow as PlayArrowIcon,
  Stop as PunchOutIcon,
  AddCircle as NewShiftIcon,
  List as ViewShiftsIcon,
  Coffee as BreakIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  AccessTime as TimeIcon,
  PhotoCamera as PhotoIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  format, 
  differenceInHours, 
  differenceInMinutes, 
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays
} from 'date-fns';
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
import BuildingSelector from '../common/BuildingSelector';
import { useBuildingContext } from '../../contexts/BuildingContext';
import PhotoUploadDialog from '../workPhotos/PhotoUploadDialog';

const EnhancedWorkerTimeTracker = () => {
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
  const [photoGalleryDialog, setPhotoGalleryDialog] = useState(false);
  const [uploadPhotoDialog, setUploadPhotoDialog] = useState(false);
  const [breakReason, setBreakReason] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  
  // Period filter for shifts view
  const [periodFilter, setPeriodFilter] = useState('WEEK'); // ALL, PAY_PERIOD, WEEK, MONTH, YEAR
  
  // New shift form state
  const [shiftStart, setShiftStart] = useState(new Date());
  const [shiftEnd, setShiftEnd] = useState(null);
  const [breakMinutes, setBreakMinutes] = useState(0);
  
  // Photo upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [photoNotes, setPhotoNotes] = useState('');

  // API calls
  const { data: statusData, refetch: refetchStatus } = useGetWorkerStatusQuery(user?.id, {
    skip: !user?.id,
    pollingInterval: 5000
  });

  const { data: sessionsData, refetch: refetchSessions } = useGetTimeSessionsQuery({
    workerId: user?.id,
    limit: 50
  }, {
    skip: !user?.id
  });

  const [clockIn, { isLoading: isClockingIn }] = useClockInMutation();
  const [clockOut, { isLoading: isClockingOut }] = useClockOutMutation();
  const [startBreak, { isLoading: isStartingBreak }] = useStartBreakMutation();
  const [endBreak, { isLoading: isEndingBreak }] = useEndBreakMutation();
  const [createShift] = useCreateShiftMutation();

  const activeSession = statusData?.data?.activeSession;
  const isActive = activeSession && activeSession.status === 'active';
  const isOnBreak = activeSession && activeSession.status === 'paused';

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Run timer if session exists (active or paused)
      if ((isActive || isOnBreak) && activeSession?.shiftStart) {
        const start = new Date(activeSession.shiftStart);
        const elapsed = Math.floor((new Date() - start) / 1000);
        setElapsedTime(elapsed);
        
        // Calculate break time
        let totalBreakSeconds = 0;
        if (activeSession.breaks && activeSession.breaks.length > 0) {
          activeSession.breaks.forEach(brk => {
            if (brk.endTime) {
              const breakDuration = Math.floor((new Date(brk.endTime) - new Date(brk.startTime)) / 1000);
              totalBreakSeconds += breakDuration;
            } else if (isOnBreak) {
              const currentBreakDuration = Math.floor((new Date() - new Date(brk.startTime)) / 1000);
              totalBreakSeconds += currentBreakDuration;
            }
          });
        }
        setBreakTime(totalBreakSeconds);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, isOnBreak, activeSession]);

  // Format time as decimal hours (e.g., 8.50h)
  const formatHoursDecimal = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const decimal = Math.round((minutes / 60) * 100);
    return `${hours}.${decimal.toString().padStart(2, '0')}h`;
  };

  // Handle Punch In
  const handlePunchIn = async () => {
    if (!selectedBuilding) {
      toast.error('Please select a building first');
      return;
    }

    try {
      await clockIn({
        workerId: user.id,
        buildingId: selectedBuilding._id,
        latitude: 0,
        longitude: 0
      }).unwrap();
      toast.success('Clocked in successfully!');
      refetchStatus();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to clock in');
    }
  };

  // Handle Punch Out
  const handlePunchOut = async () => {
    try {
      await clockOut({
        workerId: user.id,
        latitude: 0,
        longitude: 0,
        notes: shiftNotes
      }).unwrap();
      toast.success('Clocked out successfully!');
      setShiftNotes('');
      refetchStatus();
      refetchSessions();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to clock out');
    }
  };

  // Handle Start Break
  const handleStartBreak = async () => {
    try {
      await startBreak({
        workerId: user.id,
        reason: breakReason || 'Break'
      }).unwrap();
      toast.success('Break started');
      setBreakReason('');
      refetchStatus();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to start break');
    }
  };

  // Handle Resume Work (End Break)
  const handleResumeWork = async () => {
    try {
      await endBreak({ workerId: user.id }).unwrap();
      toast.success('Work resumed');
      refetchStatus();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to resume work');
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

  // Calculate paid hours
  const calculatePaidHours = (start, end, breakMins) => {
    if (!start || !end) return 0;
    const totalMinutes = differenceInMinutes(new Date(end), new Date(start));
    const paidMinutes = totalMinutes - (breakMins || 0);
    return (paidMinutes / 60).toFixed(2);
  };

  // Filter sessions by period
  const getFilteredSessions = () => {
    if (!sessionsData?.data?.timeSessions) return [];
    
    const sessions = sessionsData.data.timeSessions;
    const now = new Date();
    
    switch (periodFilter) {
      case 'ALL':
        return sessions;
      case 'PAY_PERIOD':
        // Assuming pay period is last 14 days
        const payPeriodStart = subDays(now, 14);
        return sessions.filter(s => new Date(s.shiftStart) >= payPeriodStart);
      case 'WEEK':
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        return sessions.filter(s => {
          const date = new Date(s.shiftStart);
          return date >= weekStart && date <= weekEnd;
        });
      case 'MONTH':
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        return sessions.filter(s => {
          const date = new Date(s.shiftStart);
          return date >= monthStart && date <= monthEnd;
        });
      case 'YEAR':
        const yearStart = startOfYear(now);
        const yearEnd = endOfYear(now);
        return sessions.filter(s => {
          const date = new Date(s.shiftStart);
          return date >= yearStart && date <= yearEnd;
        });
      default:
        return sessions;
    }
  };

  const filteredSessions = getFilteredSessions();
  const totalHours = filteredSessions.reduce((sum, session) => {
    return sum + (session.totalPaidHours || session.totalHours || 0);
  }, 0);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#00838f' }}>
            Work Log Free
          </Typography>
          <Box>
            <IconButton 
              color="primary"
              onClick={() => setUploadPhotoDialog(true)}
              title="Upload Work Photos"
            >
              <PhotoIcon />
            </IconButton>
          </Box>
        </Box>

        {/* NEW SHIFT Button (always visible) */}
        <Box textAlign="center" sx={{ mb: 3 }}>
          <Button
            variant="contained"
            onClick={() => setNewShiftDialog(true)}
            sx={{
              bgcolor: '#bdbdbd',
              color: '#000',
              '&:hover': { bgcolor: '#9e9e9e' },
              px: 4,
              py: 1
            }}
          >
            NEW SHIFT
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Building Selection (when not active) */}
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

        {/* Active Session Display */}
        {(isActive || isOnBreak) && (
          <Card elevation={3} sx={{ mb: 3, bgcolor: '#fff' }}>
            <CardContent>
              {/* Timer Display */}
              <Box textAlign="center" sx={{ mb: 3 }}>
                <Typography variant="h1" sx={{ fontWeight: 'bold', color: '#424242', fontSize: '4rem' }}>
                  {formatHoursDecimal(elapsedTime)}
                </Typography>
              </Box>

              {/* Shift Details */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Shift Start
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {format(new Date(activeSession.shiftStart), 'HH:mm')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(activeSession.shiftStart), 'EEE, MMM d')}
                    </Typography>
                    <IconButton size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Break Start
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {isOnBreak && activeSession.breaks?.length > 0 
                        ? format(new Date(activeSession.breaks[activeSession.breaks.length - 1].startTime), 'HH:mm')
                        : '---'
                      }
                    </Typography>
                    {isOnBreak ? (
                      <>
                        <IconButton size="small" onClick={handleResumeWork} disabled={isEndingBreak}>
                          <CheckIcon fontSize="small" color="success" />
                        </IconButton>
                        <IconButton size="small">
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton size="small" disabled>
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" disabled>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Break Total
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {Math.floor(breakTime / 60)}m
                    </Typography>
                    <IconButton size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    (Optional)
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="Add notes about your work..."
                  sx={{ mt: 1 }}
                />
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {!isActive && !isOnBreak ? (
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
                {isClockingIn ? <CircularProgress size={24} /> : 'PUNCH IN'}
              </Button>
            </Grid>
          ) : (
            <>
              {!isOnBreak ? (
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleStartBreak}
                    disabled={isStartingBreak}
                    sx={{
                      py: 2,
                      bgcolor: '#ff9800',
                      '&:hover': { bgcolor: '#f57c00' }
                    }}
                  >
                    <BreakIcon sx={{ mr: 1 }} />
                    TAKE BREAK
                  </Button>
                </Grid>
              ) : (
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleResumeWork}
                    disabled={isEndingBreak}
                    sx={{
                      py: 2,
                      bgcolor: '#4caf50',
                      '&:hover': { bgcolor: '#388e3c' }
                    }}
                  >
                    <PlayArrowIcon sx={{ mr: 1 }} />
                    RESUME WORK
                  </Button>
                </Grid>
              )}
              
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
                  {isClockingOut ? <CircularProgress size={24} /> : 'PUNCH OUT'}
                </Button>
              </Grid>
            </>
          )}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* VIEW SHIFTS Button */}
        <Box textAlign="center">
          <Button
            variant="contained"
            onClick={() => setViewShiftsDialog(true)}
            sx={{
              bgcolor: '#bdbdbd',
              color: '#000',
              '&:hover': { bgcolor: '#9e9e9e' },
              px: 4,
              py: 1
            }}
          >
            VIEW SHIFTS
          </Button>
        </Box>

        {/* New Shift Dialog */}
        <Dialog 
          open={newShiftDialog} 
          onClose={() => setNewShiftDialog(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            Quick Shift
            <IconButton
              onClick={() => setNewShiftDialog(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <BuildingSelector />
              
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" gutterBottom>
                    Shift Start
                  </Typography>
                  <DatePicker
                    value={shiftStart}
                    onChange={setShiftStart}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" gutterBottom>
                    &nbsp;
                  </Typography>
                  <TimePicker
                    value={shiftStart}
                    onChange={setShiftStart}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" gutterBottom>
                    Shift End
                  </Typography>
                  <DatePicker
                    value={shiftEnd}
                    onChange={setShiftEnd}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" gutterBottom>
                    &nbsp;
                  </Typography>
                  <TimePicker
                    value={shiftEnd}
                    onChange={setShiftEnd}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Break (unpaid)"
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(e.target.value)}
                    InputProps={{
                      endAdornment: <Typography variant="body2">minutes</Typography>
                    }}
                  />
                </Grid>

                {shiftStart && shiftEnd && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      Total (paid): <strong>{calculatePaidHours(shiftStart, shiftEnd, breakMinutes)}h</strong>
                    </Alert>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Notes"
                    placeholder="(Optional)"
                    value={shiftNotes}
                    onChange={(e) => setShiftNotes(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewShiftDialog(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleCreateShift}
              sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Shifts</Typography>
              <Box>
                <Button sx={{ color: '#fff' }}>EXPORT</Button>
                <IconButton onClick={() => setViewShiftsDialog(false)} sx={{ color: '#fff' }}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
          </DialogTitle>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#00838f' }}>
            <Tabs 
              value={periodFilter} 
              onChange={(e, newValue) => setPeriodFilter(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': { color: '#fff', minWidth: 80 },
                '& .Mui-selected': { color: '#fff', fontWeight: 'bold' }
              }}
            >
              <Tab label="ALL" value="ALL" />
              <Tab label="PAY PERIOD" value="PAY_PERIOD" />
              <Tab label="WEEK" value="WEEK" />
              <Tab label="MONTH" value="MONTH" />
              <Tab label="YEAR" value="YEAR" />
            </Tabs>
          </Box>

          <DialogContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="center">Hours</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session._id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {format(new Date(session.shiftStart), 'EEE, MMM d')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(session.shiftStart), 'HH:mm')} - {' '}
                          {session.shiftEnd ? format(new Date(session.shiftEnd), 'HH:mm') : 'Active'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {(session.totalPaidHours || session.totalHours || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {session.notes || '---'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Grid container>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total:
                  </Typography>
                </Grid>
                <Grid item xs={6} textAlign="right">
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {totalHours.toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Photo Upload Dialog */}
        <PhotoUploadDialog
          open={uploadPhotoDialog}
          onClose={() => setUploadPhotoDialog(false)}
          onUploadSuccess={() => {
            toast.success('Photos uploaded successfully!');
          }}
        />
      </Container>
    </LocalizationProvider>
  );
};

export default EnhancedWorkerTimeTracker;

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Description as DescriptionIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Email as EmailIcon,
  Timeline as TimelineIcon,
  MonetizationOn as MonetizationOnIcon
} from '@mui/icons-material';
import { useGetUsersQuery } from '../../features/users/usersApiSlice';
import { useAuth } from '../../hooks/useAuth';
import { useGetTimeSessionsQuery } from '../../features/timeTracking/timeTrackingApiSlice';
import { format, startOfWeek, endOfWeek } from 'date-fns';

const AdminWorkerDashboard = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [weekRange, setWeekRange] = useState(() => {
    const now = new Date();
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 })
    };
  });

  // Fetch all workers
  const {
    data: usersData,
    isLoading,
    error,
    refetch
  } = useGetUsersQuery({
    role: 'worker',
    isActive: true,
    approvalStatus: 'approved'
  });

  const workers = usersData?.data?.users || [];

  const {
    data: sessionsData,
    isFetching: isSessionsLoading,
    error: sessionsError
  } = useGetTimeSessionsQuery({
    startDate: weekRange.start.toISOString(),
    endDate: weekRange.end.toISOString()
  });

  const sessions = sessionsData?.data?.sessions || [];

  const workerHours = useMemo(() => {
    if (!sessions.length) return [];

    const map = new Map();

    sessions.forEach((session) => {
      const workerRef = session.worker;
      const workerId = typeof workerRef === 'object' ? workerRef?._id : workerRef;
      if (!workerId) return;

      const workerInfo = map.get(workerId) || {
        workerId,
        sessions: 0,
        totalHours: 0,
        totalBreakMinutes: 0
      };

      const start = session.clockInTime ? new Date(session.clockInTime) : null;
      const end = session.clockOutTime ? new Date(session.clockOutTime) : null;

      let hours = 0;
      if (start && end && end > start) {
        const durationMs = end.getTime() - start.getTime();
        hours = durationMs / (1000 * 60 * 60);
      } else if (session.totalHours) {
        hours = session.totalHours;
      }

      const breakMinutes = session.breakTime || 0;
      const netHours = Math.max(hours - breakMinutes / 60, 0);

      workerInfo.sessions += 1;
      workerInfo.totalHours += netHours;
      workerInfo.totalBreakMinutes += breakMinutes;

      map.set(workerId, workerInfo);
    });

    return Array.from(map.values()).map((entry) => {
      const workerDetails = workers.find((w) => w._id === entry.workerId) || {};
      const hourlyRate = workerDetails.workerProfile?.hourlyRate || 0;
      const totalValue = entry.totalHours * hourlyRate;

      return {
        ...entry,
        worker: workerDetails,
        hourlyRate,
        totalValue
      };
    }).sort((a, b) => b.totalHours - a.totalHours);
  }, [sessions, workers]);

  const totals = useMemo(() => ({
    totalHours: workerHours.reduce((sum, item) => sum + item.totalHours, 0),
    totalValue: workerHours.reduce((sum, item) => sum + item.totalValue, 0)
  }), [workerHours]);

  const handleMenuClick = (event, worker) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorker(worker);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorker(null);
  };

  const handleViewTimeTracking = (worker) => {
    navigate(`/time-tracking?worker=${worker._id}`);
    handleMenuClose();
  };

  const handleViewEmploymentLetter = (worker) => {
    navigate(`/employment/letters/${worker._id}`);
    handleMenuClose();
  };

  const handleWeekChange = (direction) => {
    const delta = direction === 'next' ? 7 : -7;
    const start = new Date(weekRange.start);
    start.setDate(start.getDate() + delta);
    const end = endOfWeek(start, { weekStartsOn: 1 });
    setWeekRange({ start, end });
  };

  const handleViewProfile = (worker) => {
    navigate(`/workers/${worker._id}`);
    handleMenuClose();
  };

  // Check admin permission
  if (!hasPermission(['admin', 'manager'])) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You don't have permission to access this page.</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load workers. {error?.data?.message || 'Please try again later.'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Admin Worker Management</Typography>
        <Button
          variant="outlined"
          startIcon={<AssessmentIcon />}
          onClick={() => navigate('/workers')}
        >
          Manage Workers
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Workers
                  </Typography>
                  <Typography variant="h4">{workers.length}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <PersonIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Available Workers
                  </Typography>
                  <Typography variant="h4">
                    {workers.filter(w => w.workerProfile?.status === 'available').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <ScheduleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    On Assignment
                  </Typography>
                  <Typography variant="h4">
                    {workers.filter(w => w.workerProfile?.status === 'busy').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  <AssessmentIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Unavailable
                  </Typography>
                  <Typography variant="h4">
                    {workers.filter(w => w.workerProfile?.status === 'unavailable').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56 }}>
                  <PersonIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="All Workers" />
            <Tab label="Weekly Hours" />
            <Tab label="Employment Letters" />
          </Tabs>
        </Box>

        <CardContent>
          {/* All Workers Tab */}
          {tabValue === 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Worker</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Skills</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workers.map((worker) => (
                    <TableRow key={worker._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar src={worker.photo}>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {worker.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              ID: {worker._id.slice(-6)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{worker.email}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {worker.phone || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {worker.workerProfile?.skills?.slice(0, 3).map((skill) => (
                            <Chip key={skill} label={skill} size="small" variant="outlined" />
                          ))}
                          {worker.workerProfile?.skills?.length > 3 && (
                            <Chip
                              label={`+${worker.workerProfile.skills.length - 3}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={worker.workerProfile?.status || 'unknown'}
                          size="small"
                          color={
                            worker.workerProfile?.status === 'available'
                              ? 'success'
                              : worker.workerProfile?.status === 'busy'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {worker.workerProfile?.paymentType === 'hourly'
                            ? `$${worker.workerProfile?.hourlyRate || '0'}/hr`
                            : `$${worker.workerProfile?.contractRate || '0'} (contract)`}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, worker)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {workers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="textSecondary">No workers found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Weekly Hours Tab */}
          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Weekly Hours Summary
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => handleWeekChange('prev')}
                >
                  Previous Week
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleWeekChange('next')}
                >
                  Next Week
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ScheduleIcon />}
                  onClick={() => navigate('/time-tracking')}
                >
                  View Full Time Tracking
                </Button>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Week of {format(weekRange.start, 'MMM dd, yyyy')} - {format(weekRange.end, 'MMM dd, yyyy')}
              </Typography>

              {sessionsError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Failed to load time sessions. {sessionsError?.data?.message || 'Unknown error'}
                </Alert>
              )}

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6} lg={3}>
                  <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TimelineIcon color="primary" sx={{ fontSize: 32 }} />
                      <Box>
                        <Typography variant="h6">{totals.totalHours.toFixed(1)} hrs</Typography>
                        <Typography variant="body2" color="text.secondary">Total Hours</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <MonetizationOnIcon color="success" sx={{ fontSize: 32 }} />
                      <Box>
                        <Typography variant="h6">${totals.totalValue.toFixed(2)}</Typography>
                        <Typography variant="body2" color="text.secondary">Total Value</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <ScheduleIcon color="info" sx={{ fontSize: 32 }} />
                      <Box>
                        <Typography variant="h6">{workerHours.length}</Typography>
                        <Typography variant="body2" color="text.secondary">Active Workers</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {isSessionsLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : workerHours.length === 0 ? (
                <Alert severity="info">
                  No time tracking sessions found for this week.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Worker</TableCell>
                        <TableCell align="center">Sessions</TableCell>
                        <TableCell align="center">Hours (net)</TableCell>
                        <TableCell align="center">Break (min)</TableCell>
                        <TableCell align="center">Hourly Rate</TableCell>
                        <TableCell align="center">Total Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {workerHours.map((item) => (
                        <TableRow key={item.workerId} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar src={item.worker?.photo}>
                                <PersonIcon />
                              </Avatar>
                              <Box>
                                <Typography variant="body1" fontWeight="medium">
                                  {item.worker?.name || 'Unknown Worker'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ID: {item.workerId.slice(-6)}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="center">{item.sessions}</TableCell>
                          <TableCell align="center">{item.totalHours.toFixed(2)}</TableCell>
                          <TableCell align="center">{item.totalBreakMinutes}</TableCell>
                          <TableCell align="center">
                            ${item.hourlyRate ? item.hourlyRate.toFixed(2) : '0.00'}/hr
                          </TableCell>
                          <TableCell align="center">${item.totalValue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Employment Letters Tab */}
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Employment Reference Letters
              </Typography>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {workers.map((worker) => (
                  <Grid item xs={12} sm={6} md={4} key={worker._id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Avatar src={worker.photo}>
                            <PersonIcon />
                          </Avatar>
                          <Typography variant="body1" fontWeight="medium">
                            {worker.name}
                          </Typography>
                        </Box>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<DescriptionIcon />}
                          onClick={() => handleViewEmploymentLetter(worker)}
                        >
                          Generate Letter
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleViewProfile(selectedWorker)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleViewTimeTracking(selectedWorker)}>
          <ListItemIcon>
            <ScheduleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Time Tracking</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleViewEmploymentLetter(selectedWorker)}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Employment Letter</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default AdminWorkerDashboard;
